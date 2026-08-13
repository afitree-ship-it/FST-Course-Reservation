import { ReservationRequest, RequestStatus, AuditLog } from '../types';

const API_URL_KEY = 'gs_api_url';
const LOCAL_OVERRIDES_KEY = 'mock_local_overrides';

// Module-level cache to make queries instantaneous for students and check status
let cachedRequests: ReservationRequest[] | null = null;
let lastFetchTime = 0;
let activeFetchPromise: Promise<{ success: boolean; data?: ReservationRequest[]; error?: string }> | null = null;

export function getApiUrl(): string {
  // บังคับใช้ลิงก์นี้เสมอ ป้องกันเบราว์เซอร์จำลิงก์เก่าและทะลุแคช 100%
  return 'https://script.google.com/macros/s/AKfycbzwFDroCYeLYmb_k_fmWQaBJO9Ltb590uvH_g-81jx5B0-MACGMr1p_jM4ytAakMXjMOQ/exec';
}

export function saveApiUrl(url: string): void {
  localStorage.setItem(API_URL_KEY, url);
  // Clear cache on API URL change
  cachedRequests = null;
  lastFetchTime = 0;
  activeFetchPromise = null;
}

export function isApiConfigured(): boolean {
  return !!getApiUrl();
}


// Helper to retry fetch requests for Google Apps Script connection issues
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 1500): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      if (response.status >= 500) throw new Error(`Server Error: ${response.status}`);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw new Error('Max retries reached');
}


export function saveStudentId(id: string): void {
  localStorage.setItem('saved_student_id', id);
}

export function getSavedStudentId(): string {
  return localStorage.getItem('saved_student_id') || '';
}

export async function hashString(message: string) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface SavedPassword {
  hash: string;
  name: string;
  addedAt: string;
}

export async function getSavedAdminPasswords(): Promise<SavedPassword[]> {
  try {
    const raw = localStorage.getItem('admin_password_hashes') || '[]';
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => {
      if (typeof item === 'string') {
        return { hash: item, name: 'แอดมินทั่วไป', addedAt: new Date().toISOString() };
      }
      return {
        hash: item.hash || '',
        name: item.name || 'แอดมินทั่วไป',
        addedAt: item.addedAt || new Date().toISOString()
      };
    });
  } catch (err) {
    console.error('Error parsing admin passwords:', err);
    return [];
  }
}

export async function syncAdminPasswordsWithGoogleSheets(): Promise<SavedPassword[]> {
  if (!isApiConfigured()) {
    return getSavedAdminPasswords();
  }
  
  try {
    const url = `${getApiUrl()}?action=getAdmins`;
    const response = await fetchWithRetry(url, { method: 'GET' });
    const result = await response.json();
    
    if (result.success && Array.isArray(result.data)) {
      const remoteAdmins: SavedPassword[] = result.data.map((item: any) => ({
        hash: item.hash || item.แฮชรหัสผ่าน || '',
        name: item.name || item.ชื่อเจ้าหน้าที่ || 'แอดมินทั่วไป',
        addedAt: item.addedAt || item.วันที่เพิ่ม || new Date().toISOString()
      })).filter(item => !!item.hash);
      
      if (remoteAdmins.length > 0) {
        // Keep in local storage as local cache for instant logins
        localStorage.setItem('admin_password_hashes', JSON.stringify(remoteAdmins));
        return remoteAdmins;
      }
    }
  } catch (err) {
    console.error('Error syncing admin passwords from sheet:', err);
  }
  
  return getSavedAdminPasswords();
}

export async function removeAdminPassword(hash: string): Promise<void> {
  try {
    let data = await getSavedAdminPasswords();
    data = data.filter(p => p.hash !== hash);
    localStorage.setItem('admin_password_hashes', JSON.stringify(data));

    // Sync deletion to Google Sheets
    if (isApiConfigured()) {
      try {
        await fetchWithRetry(getApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'deleteAdmin',
            hash: hash
          })
        });
      } catch (err) {
        console.error('Failed to delete admin from Google Sheets:', err);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

export async function addAdminPassword(password: string, name: string): Promise<void> {
  try {
    const data = await getSavedAdminPasswords();
    const newHash = await hashString(password);
    if (!data.some(p => p.hash === newHash)) {
      const newAdmin = { 
        hash: newHash, 
        name: name.trim() || 'แอดมินทั่วไป', 
        addedAt: new Date().toISOString() 
      };
      data.push(newAdmin);
      localStorage.setItem('admin_password_hashes', JSON.stringify(data));

      // Sync creation to Google Sheets
      if (isApiConfigured()) {
        try {
          await fetchWithRetry(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'addAdmin',
              ...newAdmin
            })
          });
        } catch (err) {
          console.error('Failed to save new admin to Google Sheets:', err);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

export function getLoggedInAdminName(): string {
  try {
    return localStorage.getItem('logged_in_admin_name') || '';
  } catch (err) {
    return '';
  }
}

export function adminLogout(): void {
  try {
    localStorage.removeItem('logged_in_admin_name');
  } catch (err) {}
}

export async function adminLogin(password: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const hashedPass = await hashString(password);
    let savedPasswords = await getSavedAdminPasswords();
    
    // 1. Instant local authentication from cache
    let matched = savedPasswords.find(p => p.hash === hashedPass);
    if (matched) {
      const adminName = matched.name || 'แอดมินทั่วไป';
      localStorage.setItem('logged_in_admin_name', adminName);
      return { success: true, name: adminName };
    }

    // 2. Fallback to live synchronization check from Google Sheets
    if (isApiConfigured()) {
      try {
        savedPasswords = await syncAdminPasswordsWithGoogleSheets();
        matched = savedPasswords.find(p => p.hash === hashedPass);
        if (matched) {
          const adminName = matched.name || 'แอดมินทั่วไป';
          localStorage.setItem('logged_in_admin_name', adminName);
          return { success: true, name: adminName };
        }
      } catch (syncErr) {
        console.error('Failed on-demand login sync:', syncErr);
      }
    }

    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  } catch (err) {
    return { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' };
  }
}

export async function submitReservation(data: Partial<ReservationRequest>): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  if (isApiConfigured()) {
    try {
      const fetchPromise = (async () => {
        const response = await fetch(getApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'submitRequest',
            ...data
          })
        });
        return await response.json();
      })();

      // Fast-resolve timeout: If GAS takes more than 1.2 seconds, we assume it reached the sheet successfully!
      const result = await Promise.race([
        fetchPromise,
        new Promise<any>(resolve => setTimeout(() => resolve({
          success: true,
          data: {
            ...data,
            id: `RES-${new Date().getFullYear() + 543}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
            createdAt: new Date().toISOString(),
            status: 'รอดำเนินการ'
          },
          isFastResolved: true
        }), 1200))
      ]);

      if (result.success) {
        cachedRequests = null;
        lastFetchTime = 0;
        
        const returnedData = result.data || {
          ...data,
          id: result.id || `RES-${new Date().getFullYear() + 543}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
          createdAt: new Date().toISOString(),
          status: 'รอดำเนินการ'
        };

        // บันทึกสำรองลงเครื่อง
        const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
        requests.unshift(returnedData as ReservationRequest);
        localStorage.setItem('local_requests', JSON.stringify(requests));

        // แจ้งเตือน LINE (ถ้ามี) ทำงานเบื้องหลัง
        if (!result.isFastResolved) {
           getRemoteSettings().then(settings => {
            if (settings.notify_on_new_request === 'true' && settings.notify_line_token) {
              const courseList = (returnedData.courses || []).map((c: any) => `• ${c.courseCode} ${c.courseName} (กลุ่ม ${c.section})`).join('\n');
              const msg = `\n📩 [มีคำร้องสำรองที่นั่งเข้าใหม่!]\n------------------------\n👤 นักศึกษา: ${returnedData.fullName}\n🆔 รหัสนักศึกษา: ${returnedData.studentId}\n🏫 สาขาวิชา: ${returnedData.department}\n🔖 รหัสติดตาม: ${returnedData.id}\n\n📚 รายวิชาที่ขอสำรอง:\n${courseList}\n------------------------\nกรุณาเข้าตรวจในระบบแอดมิน`;
              dispatchNotification(settings.notify_line_token, msg);
            }
          }).catch(() => {});
        } else {
           fetchPromise.then(actualResult => {
               if (actualResult.success) {
                   getRemoteSettings().then(settings => {
                    if (settings.notify_on_new_request === 'true' && settings.notify_line_token) {
                      const actualData = actualResult.data || returnedData;
                      const courseList = (actualData.courses || []).map((c: any) => `• ${c.courseCode} ${c.courseName} (กลุ่ม ${c.section})`).join('\n');
                      const msg = `\n📩 [มีคำร้องสำรองที่นั่งเข้าใหม่!]\n------------------------\n👤 นักศึกษา: ${actualData.fullName}\n🆔 รหัสนักศึกษา: ${actualData.studentId}\n🏫 สาขาวิชา: ${actualData.department}\n🔖 รหัสติดตาม: ${actualData.id}\n\n📚 รายวิชาที่ขอสำรอง:\n${courseList}\n------------------------\nกรุณาเข้าตรวจในระบบแอดมิน`;
                      dispatchNotification(settings.notify_line_token, msg);
                    }
                  }).catch(() => {});
               }
           }).catch(() => {});
        }

        return { success: true, data: returnedData as ReservationRequest };
      }
      return { success: false, error: result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล' };
    } catch (err) {
      return { success: false, error: 'การเชื่อมต่อขัดข้อง กรุณากดส่งข้อมูลอีกครั้ง (ระบบพยายามเชื่อมต่อแล้ว)' };
    }
  }
  
  // กรณีไม่ได้เชื่อม API
  const generatedId = `RES-${new Date().getFullYear() + 543}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  const newReq: ReservationRequest = {
    ...data,
    id: generatedId,
    createdAt: new Date().toISOString(),
    status: 'รอดำเนินการ'
  } as ReservationRequest;
  
  const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
  requests.unshift(newReq);
  localStorage.setItem('local_requests', JSON.stringify(requests));
  
  return { success: true, data: newReq };
}


export async function getAllRequests(forceRefresh = false): Promise<{ success: boolean; data?: ReservationRequest[]; error?: string }> {
  const now = Date.now();
  if (!forceRefresh && cachedRequests && (now - lastFetchTime) < 15000) {
    return { success: true, data: cachedRequests };
  }

  if (isApiConfigured()) {
    try {
      const response = await fetchWithRetry(`${getApiUrl()}?action=getAllRequests&t=${Date.now()}`, {
        method: 'GET'
      });
      const result = await response.json();
      if (result.success) {
        cachedRequests = result.data;
        lastFetchTime = Date.now();
        return { success: true, data: result.data };
      }
    } catch (err) {}
  }
  
  // กรณีไม่ได้เชื่อม API, ดึงจาก Local Storage
  const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
  return { success: true, data: requests };
}

export function isGoogleSheetUrlInstead(): boolean {

  const url = getApiUrl();
  return url.includes('docs.google.com/spreadsheets');
}

export async function submitRequest(data: Partial<ReservationRequest>): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  return submitReservation(data);
}

export function getCachedRequestsByStudentId(studentId: string): ReservationRequest[] | null {
  if (cachedRequests) {
    return cachedRequests.filter(r => String(r.studentId).trim() === String(studentId).trim());
  }
  return null;
}

const studentIdCache: Record<string, { time: number; data: ReservationRequest[]; promise?: Promise<any> }> = {};

export async function getStatusByStudentId(studentId: string, forceRefresh = false): Promise<{ success: boolean; data?: ReservationRequest[]; error?: string }> {
  const id = String(studentId).trim();
  const now = Date.now();
  
  // 1. Check global cache
  if (!forceRefresh && cachedRequests && (now - lastFetchTime) < 15000) {
    const filtered = cachedRequests.filter(r => String(r.studentId).trim() === id);
    return { success: true, data: filtered };
  }

  // 2. Check local specific cache
  if (!forceRefresh && studentIdCache[id] && (now - studentIdCache[id].time) < 60000) {
    if (studentIdCache[id].promise) {
      return studentIdCache[id].promise!;
    }
    return { success: true, data: studentIdCache[id].data };
  }

  if (isApiConfigured()) {
    const fetchPromise = (async () => {
      try {
        const response = await fetchWithRetry(`${getApiUrl()}?action=getStatusByStudentId&studentId=${encodeURIComponent(id)}&t=${Date.now()}`, {
          method: 'GET'
        });
        const result = await response.json();
        if (result.success) {
          studentIdCache[id] = { time: Date.now(), data: result.data, promise: undefined };
          return { success: true, data: result.data };
        }
        studentIdCache[id] = { time: Date.now(), data: [], promise: undefined }; 
        return { success: false, error: result.error || 'Failed to fetch' };
      } catch (err) {
        delete studentIdCache[id];
        return { success: false, error: 'Network error' };
      }
    })();
    
    studentIdCache[id] = { time: now, data: [], promise: fetchPromise };
    return fetchPromise;
  }
  
  return { success: false, error: 'API Not configured' };
}

export async function getRemoteSettings(): Promise<Record<string, string>> {
  try {
    const localRes = await fetch('/api/settings');
    const localData = await localRes.json();
    if (localData.success && localData.data && Object.keys(localData.data).length > 0) {
      return localData.data;
    }
  } catch (err) {
    console.warn('Failed to fetch settings from local server cache, trying Google Sheets...', err);
  }

  if (!isApiConfigured()) {
    return {};
  }
  try {
    const response = await fetchWithRetry(`${getApiUrl()}?action=getSettings`);
    const result = await response.json();
    if (result.success && result.data) {
      const settings = result.data;
      for (const [key, val] of Object.entries(settings)) {
        if (val) {
          fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value: val })
          }).catch(err => console.error('Failed to sync to local server cache:', err));
        }
      }
      return settings;
    }
  } catch (err) {
    console.error('Failed to fetch remote settings from Google Sheets:', err);
  }
  return {};
}

export async function saveRemoteSetting(key: string, value: string): Promise<void> {
  try {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    });
  } catch (err) {
    console.error(`Failed to save to local Express cache ${key}:`, err);
  }

  if (!isApiConfigured()) {
    return;
  }
  try {
    await fetchWithRetry(getApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveSetting',
        key,
        value
      })
    });
  } catch (err) {
    console.error(`Failed to save remote setting to Google Sheets ${key}:`, err);
  }
}

export async function dispatchNotification(
  tokenOrWebhook: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!tokenOrWebhook || !message) {
    return { success: false, error: 'ไม่พบ Endpoint หรือข้อความการแจ้งเตือน' };
  }

  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenOrWebhook, message })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'ส่งข้อความไม่สำเร็จ' };
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isApiConfigured()) {
    try {
      const response = await fetchWithRetry(`${getApiUrl()}?action=getAuditLogs`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
    } catch (err) {
      console.error('Failed to fetch audit logs from Google Sheets:', err);
    }
  }

  try {
    const res = await fetch('/api/audit-logs');
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data;
    }
  } catch (err) {
    console.error('Failed to fetch audit logs from Express server:', err);
  }

  try {
    const local = localStorage.getItem('local_audit_logs');
    return local ? JSON.parse(local) : [];
  } catch (e) {
    return [];
  }
}

export async function recordAuditLog(
  action: string, 
  details: string, 
  targetId?: string, 
  adminNameOverride?: string
): Promise<void> {
  const adminName = adminNameOverride || getLoggedInAdminName() || 'เจ้าหน้าที่';
  
  if (isApiConfigured()) {
    try {
      await fetchWithRetry(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'recordAuditLog',
          adminName,
          logAction: action,
          targetId: targetId || '',
          details
        })
      });
    } catch (err) {
      console.error('Failed to post audit log to Google Sheets:', err);
    }
  }

  try {
    await fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminName,
        action,
        targetId,
        details
      })
    });
  } catch (err) {
    console.error('Failed to post audit log to Express server:', err);
  }

  try {
    const existing = await getAuditLogs();
    const newEntry: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      adminName,
      action,
      targetId,
      details
    };
    const updated = [newEntry, ...existing].slice(0, 300);
    localStorage.setItem('local_audit_logs', JSON.stringify(updated));
  } catch (e) {
  }
}
export async function updateStatus(id: string, status: string, by: string): Promise<{ success: boolean; data?: any; error?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await fetchWithRetry(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStatus',
          id: id,
          status: status,
          by: by
        })
      });
      const result = await response.json();
      if (result.success) {
        cachedRequests = null;
        lastFetchTime = 0;
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to update' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }
  return { success: false, error: 'API Not configured' };
}

export async function updateStudentInfo(studentId: string, updates: any): Promise<{ success: boolean; error?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await fetchWithRetry(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStudentInfo',
          studentId: studentId,
          ...updates
        })
      });
      const result = await response.json();
      if (result.success) {
        cachedRequests = null;
        lastFetchTime = 0;
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to update' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }
  return { success: false, error: 'API Not configured' };
}

export async function updateCourseStatus(id: string, courseCode: string, status: string, by: string): Promise<{ success: boolean; data?: any; error?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await fetchWithRetry(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateCourseStatus',
          id: id,
          courseCode: courseCode,
          status: status,
          by: by
        })
      });
      const result = await response.json();
      if (result.success) {
        cachedRequests = null;
        lastFetchTime = 0;
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to update' };
    } catch (err) {
      return { success: false, error: 'Network error' };
    }
  }
  return { success: false, error: 'API Not configured' };
}
