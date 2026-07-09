import { ReservationRequest, RequestStatus } from '../types';

const API_URL_KEY = 'gs_api_url';
const LOCAL_OVERRIDES_KEY = 'mock_local_overrides';

// Module-level cache to make queries instantaneous for students and check status
let cachedRequests: ReservationRequest[] | null = null;
let lastFetchTime = 0;
let activeFetchPromise: Promise<{ success: boolean; data?: ReservationRequest[]; error?: string }> | null = null;

export function getApiUrl(): string {
  const saved = localStorage.getItem(API_URL_KEY);
  const oldDefault = 'https://script.google.com/macros/s/AKfycbygnnK7sTVm64hY70dyYYf-17Jh_sBAQQJeK4WDdnfz4sZMTftEUPJdcgCEiHxiETKRfw/exec';
  const newDefault = 'https://script.google.com/macros/s/AKfycbwGOeykUafIDYOWs6Bwk3cInxhnTESNyGpGVvKUEJhA5XbyrIgc2vmNNR_hBc-5S-d8aA/exec';
  
  if (saved === oldDefault) {
    localStorage.setItem(API_URL_KEY, newDefault);
    return newDefault;
  }
  return saved || newDefault;
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

export async function removeAdminPassword(hash: string): Promise<void> {
  try {
    let data = await getSavedAdminPasswords();
    data = data.filter(p => p.hash !== hash);
    localStorage.setItem('admin_password_hashes', JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
}

export async function addAdminPassword(password: string, name: string): Promise<void> {
  try {
    const data = await getSavedAdminPasswords();
    const newHash = await hashString(password);
    if (!data.some(p => p.hash === newHash)) {
      data.push({ 
        hash: newHash, 
        name: name.trim() || 'แอดมินทั่วไป', 
        addedAt: new Date().toISOString() 
      });
      localStorage.setItem('admin_password_hashes', JSON.stringify(data));
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
    const savedPasswords = await getSavedAdminPasswords();
    
    // Check if matching custom admin password
    const matched = savedPasswords.find(p => p.hash === hashedPass);
    if (matched) {
      const adminName = matched.name || 'แอดมินทั่วไป';
      localStorage.setItem('logged_in_admin_name', adminName);
      return { success: true, name: adminName };
    }

    return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
  } catch (err) {
    return { success: false, error: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์' };
  }
}

export async function submitReservation(data: Partial<ReservationRequest>): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitRequest',
          ...data
        })
      });
      const result = await response.json();
      if (result.success) {
        // Clear cache so the next call is guaranteed to fetch new data
        cachedRequests = null;
        lastFetchTime = 0;
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล' };
    } catch (err) {
      return { success: false, error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' };
    }
  }
  
  // Local fallback
  const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
  const newReq: ReservationRequest = {
    ...data,
    id: `RES-${new Date().getFullYear() + 543}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    createdAt: new Date().toISOString(),
    status: 'รอดำเนินการ'
  } as ReservationRequest;
  
  requests.push(newReq);
  localStorage.setItem('local_requests', JSON.stringify(requests));
  
  // Update cache
  cachedRequests = requests;
  lastFetchTime = Date.now();
  
  return { success: true, data: newReq };
}

export async function getAllRequests(forceRefresh = false): Promise<{ success: boolean; data?: ReservationRequest[]; error?: string }> {
  const now = Date.now();
  // If cache is fresh (less than 15 seconds) and we are not forcing, return cache instantly
  if (!forceRefresh && cachedRequests && (now - lastFetchTime) < 15000) {
    return { success: true, data: cachedRequests };
  }

  // Reuse existing promise if active
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  if (isApiConfigured()) {
    activeFetchPromise = (async () => {
      try {
        const response = await fetch(`${getApiUrl()}?action=getAllRequests`, {
          method: 'GET'
        });
        const result = await response.json();
        if (result.success) {
          cachedRequests = result.data;
          lastFetchTime = Date.now();
          return { success: true, data: result.data };
        }
        return { success: false, error: result.error || 'เกิดข้อผิดพลาดในการดึงข้อมูล' };
      } catch (err) {
        return { success: false, error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' };
      } finally {
        activeFetchPromise = null;
      }
    })();
    return activeFetchPromise;
  }
  
  const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
  cachedRequests = requests;
  lastFetchTime = Date.now();
  return { success: true, data: requests };
}

function getLocalRequests(): ReservationRequest[] {
  try {
    const raw = localStorage.getItem('local_requests') || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error parsing local requests:', e);
    return [];
  }
}

export async function updateStatus(
  requestId: string,
  status: RequestStatus,
  rejectionReason?: string,
  adminName?: string
): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateStatus',
          requestId,
          status,
          rejectionReason,
          processedBy: adminName
        })
      });
      const result = await response.json();
      if (result.success) {
        // Clear cache so the next fetch is guaranteed fresh
        cachedRequests = null;
        lastFetchTime = 0;
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ' };
    } catch (err) {
      return { success: false, error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' };
    }
  }
  
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index >= 0) {
    const userWhoProcessed = adminName || getLoggedInAdminName() || 'แอดมินระบบ';
    requests[index].status = status;
    requests[index].processedBy = userWhoProcessed;
    if (status === 'ไม่อนุมัติ' && rejectionReason) {
      requests[index].rejectionReason = rejectionReason;
    } else {
      requests[index].rejectionReason = undefined;
    }
    
    // Also update all courses for this request
    if (requests[index].courses) {
       requests[index].courses = requests[index].courses.map(c => ({
         ...c,
         status,
         rejectionReason: status === 'ไม่อนุมัติ' ? rejectionReason : undefined,
         processedBy: userWhoProcessed,
         processedAt: (status === 'อนุมัติแล้ว' || status === 'ไม่อนุมัติ') ? new Date().toISOString() : undefined
       }));
    }
    
    if (status === 'อนุมัติแล้ว' || status === 'ไม่อนุมัติ') {
      requests[index].processedAt = new Date().toISOString();
    } else {
      requests[index].processedAt = undefined;
      requests[index].processedBy = undefined;
    }
    
    localStorage.setItem('local_requests', JSON.stringify(requests));
    
    // Update local cache
    cachedRequests = requests;
    lastFetchTime = Date.now();
    
    return { success: true, data: requests[index] };
  }
  
  return { success: false, error: 'ไม่พบคำร้อง' };
}

export async function updateCourseStatus(
  requestId: string,
  courseCode: string,
  status: RequestStatus,
  rejectionReason?: string,
  adminName?: string
): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateCourseStatus',
          requestId,
          courseCode,
          status,
          rejectionReason,
          processedBy: adminName
        })
      });
      const result = await response.json();
      if (result.success) {
        // Clear cache so the next fetch is guaranteed fresh
        cachedRequests = null;
        lastFetchTime = 0;
        return { success: true, data: result.data };
      }
      return { success: false, error: result.error || 'เกิดข้อผิดพลาดในการอัปเดตสถานะรายวิชา' };
    } catch (err) {
      return { success: false, error: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' };
    }
  }
  
  const requests = getLocalRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index >= 0) {
    const userWhoProcessed = adminName || getLoggedInAdminName() || 'แอดมินระบบ';
    if (requests[index].courses) {
       requests[index].courses = requests[index].courses.map(c => {
         if (c.courseCode === courseCode) {
           return {
             ...c,
             status,
             rejectionReason: status === 'ไม่อนุมัติ' ? rejectionReason : undefined,
             processedBy: userWhoProcessed,
             processedAt: (status === 'อนุมัติแล้ว' || status === 'ไม่อนุมัติ') ? new Date().toISOString() : undefined
           };
         }
         return c;
       });
       
       // Update overall status if all courses have the same status
       const allCourses = requests[index].courses;
       if (allCourses.every(c => c.status === 'อนุมัติแล้ว')) {
         requests[index].status = 'อนุมัติแล้ว';
         requests[index].processedBy = userWhoProcessed;
         requests[index].processedAt = new Date().toISOString();
       } else if (allCourses.every(c => c.status === 'ไม่อนุมัติ')) {
         requests[index].status = 'ไม่อนุมัติ';
         requests[index].processedBy = userWhoProcessed;
         requests[index].processedAt = new Date().toISOString();
       } else {
         requests[index].status = 'รอดำเนินการ';
         requests[index].processedBy = undefined;
         requests[index].processedAt = undefined;
       }
    }
    
    localStorage.setItem('local_requests', JSON.stringify(requests));
    return { success: true, data: requests[index] };
  }
  
  return { success: false, error: 'ไม่พบคำร้อง' };
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

export async function getStatusByStudentId(studentId: string, forceRefresh = false): Promise<{ success: boolean; data?: ReservationRequest[]; error?: string }> {
  const now = Date.now();
  // If we have cached requests and they are fresh (less than 15s), return them instantly
  if (!forceRefresh && cachedRequests && (now - lastFetchTime) < 15000) {
    const filtered = cachedRequests.filter(r => String(r.studentId).trim() === String(studentId).trim());
    return { success: true, data: filtered };
  }

  // Otherwise, pull all requests to warm the cache (highly efficient because it powers all tabs)
  const result = await getAllRequests(forceRefresh);
  if (result.success && result.data) {
    const filtered = result.data.filter(r => String(r.studentId).trim() === String(studentId).trim());
    return { success: true, data: filtered };
  }

  // Fallback to direct query if it fails or isn't configured
  if (isApiConfigured()) {
    try {
      const response = await fetch(`${getApiUrl()}?action=getStatusByStudentId&studentId=${encodeURIComponent(studentId)}`, {
        method: 'GET'
      });
      const result = await response.json();
      if (result.success) {
        return { success: true, data: result.data };
      }
    } catch (err) {
      // Fallback
    }
  }

  return { success: false, error: 'ไม่สามารถดึงข้อมูลสถานะได้' };
}

