import { ReservationRequest, AuditLog } from '../types';

const API_URL_KEY = 'gs_api_url';
const ADMIN_TOKEN_KEY = 'admin_token';
const ADMIN_NAME_KEY = 'logged_in_admin_name';
const ADMIN_LIST_KEY = 'admin_list_cache';

type ApiResult<T = any> = { success: boolean; data?: T; error?: string; [k: string]: any };

// ---------------------------------------------------------------------------
// In-memory caches (dedupe concurrent calls so several components share one request)
// ---------------------------------------------------------------------------
let cachedRequests: ReservationRequest[] | null = null;
let lastFetchTime = 0;
let activeFetchPromise: Promise<ApiResult<ReservationRequest[]>> | null = null;

const SETTINGS_TTL = 60_000;
let settingsCache: { data: Record<string, string>; time: number; admin: boolean } | null = null;
let settingsPromise: Promise<Record<string, string>> | null = null;

export function getApiUrl(): string {
  // บังคับใช้ลิงก์นี้เสมอ ป้องกันเบราว์เซอร์จำลิงก์เก่าและทะลุแคช 100%
  return 'https://script.google.com/macros/s/AKfycbzwFDroCYeLYmb_k_fmWQaBJO9Ltb590uvH_g-81jx5B0-MACGMr1p_jM4ytAakMXjMOQ/exec';
}

export function saveApiUrl(url: string): void {
  localStorage.setItem(API_URL_KEY, url);
  invalidateRequestsCache();
  settingsCache = null;
}

export function isApiConfigured(): boolean {
  return !!getApiUrl();
}

function invalidateRequestsCache() {
  cachedRequests = null;
  lastFetchTime = 0;
  activeFetchPromise = null;
}

// ---------------------------------------------------------------------------
// Low-level transport
// ---------------------------------------------------------------------------
const REQUEST_TIMEOUT_MS = 30_000;

async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Retry only on network failures / 5xx. Every POST that is retried must be idempotent
// (submitRequest carries clientRequestId so the backend can dedupe it).
async function fetchWithRetry(url: string, options?: RequestInit, retries = 3, delay = 1200): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.status >= 500) throw new Error(`Server Error: ${response.status}`);
      return response;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(res => setTimeout(res, delay * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}

async function gasGet(params: Record<string, string>, retries = 2): Promise<ApiResult> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetchWithRetry(`${getApiUrl()}?${qs}`, { method: 'GET' }, retries);
  return res.json();
}

async function gasPost(body: Record<string, any>, retries = 1): Promise<ApiResult> {
  const res = await fetchWithRetry(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  }, retries);
  return res.json();
}

function isLegacyBackend(result: ApiResult | undefined): boolean {
  const msg = String(result?.error || '');
  return msg.startsWith('Unknown POST action') || msg.startsWith('Unknown GET action');
}

// ---------------------------------------------------------------------------
// Admin session (token issued by Apps Script, kept for this browser tab only)
// ---------------------------------------------------------------------------
function getAdminToken(): string {
  try { return sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch { return ''; }
}

function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_NAME_KEY);
    sessionStorage.removeItem(ADMIN_LIST_KEY);
    localStorage.removeItem(ADMIN_NAME_KEY);
  } catch { /* ignore */ }
}

function handleUnauthorized(result: ApiResult) {
  if (result && result.error === 'UNAUTHORIZED') {
    const wasLoggedIn = !!getAdminToken() || !!getLoggedInAdminName();
    clearAdminSession();
    if (wasLoggedIn) {
      window.dispatchEvent(new CustomEvent('admin-session-expired'));
    }
  }
}

/**
 * Call an admin-only action. Sends the session token in the POST body (never in the URL).
 * If the deployed Apps Script is still the old version (no auth support), falls back to the
 * legacy request shape so the site keeps working until code.gs is redeployed.
 */
async function adminCall(action: string, payload: Record<string, any> = {}, legacyGet = false, retries = 1): Promise<ApiResult> {
  const result = await gasPost({ action, token: getAdminToken(), ...payload }, retries);
  if (isLegacyBackend(result)) {
    return legacyGet ? gasGet({ action, t: String(Date.now()) }) : gasPost({ action, ...payload }, retries);
  }
  handleUnauthorized(result);
  return result;
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

function normalizeAdmins(list: any[]): SavedPassword[] {
  return (list || []).map((item: any) => ({
    hash: item.hash || item.แฮชรหัสผ่าน || '',
    name: item.name || item.ชื่อเจ้าหน้าที่ || 'แอดมินทั่วไป',
    addedAt: item.addedAt || item.วันที่เพิ่ม || new Date().toISOString()
  })).filter(item => !!item.hash);
}

function storeAdminList(list: SavedPassword[]) {
  try { sessionStorage.setItem(ADMIN_LIST_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

export async function getSavedAdminPasswords(): Promise<SavedPassword[]> {
  try {
    // ลบแคชรหัสผ่านเก่าที่เคยเก็บถาวรไว้ใน localStorage (เสี่ยงถูกดึงไปเดารหัสบนเครื่องสาธารณะ)
    localStorage.removeItem('admin_password_hashes');
    const raw = sessionStorage.getItem(ADMIN_LIST_KEY) || '[]';
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/**
 * Before login: only tells whether any admin exists (used to decide whether to show first-time setup).
 * After login: returns the real admin list.
 */
export async function syncAdminPasswordsWithGoogleSheets(): Promise<SavedPassword[]> {
  try {
    if (getAdminToken()) {
      const result = await adminCall('getAdmins', {}, true);
      if (result.success && Array.isArray(result.data)) {
        const admins = normalizeAdmins(result.data);
        storeAdminList(admins);
        return admins;
      }
      return getSavedAdminPasswords();
    }

    const status = await gasGet({ action: 'adminStatus' });
    if (isLegacyBackend(status)) {
      const legacy = await gasGet({ action: 'getAdmins' });
      return legacy.success && Array.isArray(legacy.data) ? normalizeAdmins(legacy.data) : [];
    }
    if (status.success) {
      // placeholder entry: the UI only needs to know that admins exist
      return status.hasAdmins ? [{ hash: '__hidden__', name: '', addedAt: '' }] : [];
    }
  } catch (err) {
    console.error('Error syncing admin list:', err);
  }
  return getSavedAdminPasswords();
}

export async function removeAdminPassword(hash: string): Promise<void> {
  try {
    const result = await adminCall('deleteAdmin', { hash });
    if (!result.success) console.warn('deleteAdmin failed:', result.error);
    await syncAdminPasswordsWithGoogleSheets();
  } catch (err) {
    console.error('Failed to delete admin:', err);
  }
}

export async function addAdminPassword(password: string, name: string): Promise<void> {
  try {
    const hash = await hashString(password);
    const cleanName = name.trim() || 'แอดมินทั่วไป';
    const result = await adminCall('addAdmin', { hash, name: cleanName, addedAt: new Date().toISOString() });
    if (!result.success) {
      console.warn('addAdmin failed:', result.error);
      return;
    }
    if (getAdminToken()) {
      await syncAdminPasswordsWithGoogleSheets();
    } else {
      // first-time setup (no session yet)
      storeAdminList([{ hash, name: cleanName, addedAt: new Date().toISOString() }]);
    }
  } catch (err) {
    console.error(err);
  }
}

export function getLoggedInAdminName(): string {
  try {
    return sessionStorage.getItem(ADMIN_NAME_KEY) || '';
  } catch {
    return '';
  }
}

export function adminLogout(): void {
  const token = getAdminToken();
  if (token) {
    gasPost({ action: 'adminLogout', token }).catch(() => {});
  }
  clearAdminSession();
  invalidateRequestsCache();
  settingsCache = null;
}

export async function adminLogin(password: string): Promise<{ success: boolean; name?: string; error?: string }> {
  try {
    const hash = await hashString(password);
    const result = await gasPost({ action: 'adminLogin', hash });

    if (isLegacyBackend(result)) {
      // Old backend (before redeploy): compare against the admin list like before.
      const legacy = await gasGet({ action: 'getAdmins' });
      const admins = legacy.success && Array.isArray(legacy.data) ? normalizeAdmins(legacy.data) : [];
      const matched = admins.find(p => p.hash === hash);
      if (!matched) return { success: false, error: 'รหัสผ่านไม่ถูกต้อง' };
      sessionStorage.setItem(ADMIN_NAME_KEY, matched.name);
      storeAdminList(admins);
      return { success: true, name: matched.name };
    }

    if (result.success && result.token) {
      const adminName = result.name || 'แอดมินทั่วไป';
      sessionStorage.setItem(ADMIN_TOKEN_KEY, result.token);
      sessionStorage.setItem(ADMIN_NAME_KEY, adminName);
      localStorage.removeItem(ADMIN_NAME_KEY);
      invalidateRequestsCache();
      settingsCache = null;
      syncAdminPasswordsWithGoogleSheets().catch(() => {});
      return { success: true, name: adminName };
    }
    return { success: false, error: result.error || 'รหัสผ่านไม่ถูกต้อง' };
  } catch {
    return { success: false, error: 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่' };
  }
}

function newClientRequestId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

export async function submitReservation(data: Partial<ReservationRequest>): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  if (isApiConfigured()) {
    try {
      // clientRequestId lets the backend ignore a retried duplicate of the same submission
      // deferNotify: Apps Script บันทึกคำร้องแล้วตอบกลับทันที ส่วนอีเมล/แจ้งเตือนแอดมินไปทำใน submitFollowUp
      const result = await gasPost({ action: 'submitRequest', clientRequestId: newClientRequestId(), deferNotify: true, ...data }, 2);

      if (result.success && result.data) {
        invalidateRequestsCache();

        if (result.followUp && result.data.id) {
          // ส่งอีเมลยืนยัน + แจ้งเตือนแอดมินเบื้องหลัง ไม่ต้องรอ (keepalive = ยังส่งต่อแม้ปิดหน้าเว็บ)
          fetch(getApiUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'submitFollowUp', id: result.data.id }),
            keepalive: true
          }).catch(() => {});
        }

        const returnedData: ReservationRequest = {
          ...data,
          ...result.data,
          id: result.data.id || result.id,
          createdAt: result.data.createdAt || new Date().toISOString(),
          status: result.data.status || 'รอดำเนินการ'
        } as ReservationRequest;

        // บันทึกสำรองลงเครื่อง (ไม่เก็บรูปหลักฐานแบบ base64 เพื่อไม่ให้ localStorage เต็ม)
        try {
          const slim = { ...returnedData, facebookProofFile: undefined };
          const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
          requests.unshift(slim as ReservationRequest);
          localStorage.setItem('local_requests', JSON.stringify(requests.slice(0, 20)));
        } catch { /* ignore quota errors */ }

        // หมายเหตุ: การแจ้งเตือนแอดมินถูกส่งจากฝั่ง Apps Script แล้ว (เดิมเว็บส่งซ้ำอีกรอบ ทำให้แจ้งเตือนเบิ้ลและช้า)
        return { success: true, data: returnedData };
      }
      return { success: false, error: result.error || 'เกิดข้อผิดพลาดในการส่งข้อมูล' };
    } catch {
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

/** Admin-only: the backend refuses this without a valid session. */
export async function getAllRequests(forceRefresh = false): Promise<ApiResult<ReservationRequest[]>> {
  const now = Date.now();
  if (!forceRefresh && cachedRequests && (now - lastFetchTime) < 15000) {
    return { success: true, data: cachedRequests };
  }

  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  if (isApiConfigured()) {
    activeFetchPromise = (async () => {
      try {
        const result = await adminCall('getAllRequests', {}, true, 2);
        if (result.success && Array.isArray(result.data)) {
          cachedRequests = result.data;
          lastFetchTime = Date.now();
          return { success: true, data: result.data };
        }
        if (result.error === 'UNAUTHORIZED') {
          return { success: false, data: [], error: 'UNAUTHORIZED' };
        }
      } catch (err) {
        console.warn('Network issue fetching from Google Sheets:', err);
      } finally {
        activeFetchPromise = null;
      }

      if (cachedRequests && cachedRequests.length > 0) {
        return { success: true, data: cachedRequests };
      }
      return { success: false, data: cachedRequests || [], error: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้' };
    })();

    return activeFetchPromise;
  }

  const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
  return { success: true, data: requests };
}

export function isGoogleSheetUrlInstead(): boolean {
  return getApiUrl().includes('docs.google.com/spreadsheets');
}

export async function submitRequest(data: Partial<ReservationRequest>): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  return submitReservation(data);
}

function matchesStudent(r: ReservationRequest, id: string): boolean {
  return String(r.studentId).trim() === id ||
    !!r.courses?.some(c => c.coStudents?.some(cs => String(cs.studentId).trim() === id)) ||
    !!r.coStudents?.some(cs => String(cs.studentId).trim() === id);
}

export function getCachedRequestsByStudentId(studentId: string): ReservationRequest[] | null {
  const cached = studentIdCache[String(studentId).trim()];
  if (cached && !cached.promise) return cached.data;
  if (cachedRequests) return cachedRequests.filter(r => matchesStudent(r, String(studentId).trim()));
  return null;
}

const studentIdCache: Record<string, { time: number; data: ReservationRequest[]; promise?: Promise<any> }> = {};

export async function getStatusByStudentId(studentId: string, forceRefresh = false): Promise<{ success: boolean; data?: ReservationRequest[]; error?: string }> {
  const id = String(studentId).trim();
  const now = Date.now();

  if (!forceRefresh && studentIdCache[id] && (now - studentIdCache[id].time) < 60000) {
    if (studentIdCache[id].promise) return studentIdCache[id].promise!;
    return { success: true, data: studentIdCache[id].data };
  }

  if (!forceRefresh && cachedRequests && (now - lastFetchTime) < 60000) {
    const filtered = cachedRequests.filter(r => matchesStudent(r, id));
    studentIdCache[id] = { time: now, data: filtered };
    return { success: true, data: filtered };
  }

  if (isApiConfigured()) {
    const fetchPromise = (async () => {
      try {
        const directData = await gasGet({ action: 'getStatusByStudentId', studentId: id, t: String(Date.now()) }, 2);
        if (directData && directData.success && Array.isArray(directData.data)) {
          studentIdCache[id] = { time: Date.now(), data: directData.data };
          return { success: true, data: directData.data };
        }
        delete studentIdCache[id];
        return { success: false, error: directData?.error || 'Network error' };
      } catch {
        if (cachedRequests && cachedRequests.length > 0) {
          const localMatch = cachedRequests.filter(r => matchesStudent(r, id));
          studentIdCache[id] = { time: Date.now(), data: localMatch };
          return { success: true, data: localMatch };
        }
        delete studentIdCache[id];
        return { success: false, error: 'Network error' };
      }
    })();

    studentIdCache[id] = { time: now, data: [], promise: fetchPromise };
    return fetchPromise;
  }

  const requests: ReservationRequest[] = JSON.parse(localStorage.getItem('local_requests') || '[]');
  return { success: true, data: requests.filter(r => matchesStudent(r, id)) };
}

/**
 * Public visitors get only the public keys (logo, favicon, opening schedule).
 * Logged-in admins get every setting (incl. webhook URL).
 * Calls made at the same time share one request; results are cached for 60s.
 */
export async function getRemoteSettings(forceRefresh = false): Promise<Record<string, string>> {
  if (!isApiConfigured()) return {};
  const isAdmin = !!getAdminToken();
  if (!forceRefresh && settingsCache && settingsCache.admin === isAdmin && Date.now() - settingsCache.time < SETTINGS_TTL) {
    return settingsCache.data;
  }
  if (settingsPromise && !forceRefresh) return settingsPromise;

  settingsPromise = (async () => {
    try {
      const result = isAdmin
        ? await adminCall('getSettings', {}, true)
        : await gasGet({ action: 'getPublicSettings' });
      let data: Record<string, string> | null = result.success && result.data ? result.data : null;
      if (!data && isLegacyBackend(result)) {
        const legacy = await gasGet({ action: 'getSettings' });
        data = legacy.success && legacy.data ? legacy.data : null;
      }
      if (data) {
        settingsCache = { data, time: Date.now(), admin: isAdmin };
        return data;
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      settingsPromise = null;
    }
    return settingsCache?.data || {};
  })();
  return settingsPromise;
}

/** Save several settings in a single round-trip. */
export async function saveRemoteSettings(values: Record<string, string>): Promise<boolean> {
  const settings = Object.entries(values).map(([key, value]) => ({ key, value }));
  if (settings.length === 0) return true;
  settingsCache = null;
  try {
    const result = await gasPost({ action: 'saveSettings', token: getAdminToken(), settings });
    if (isLegacyBackend(result)) {
      // old backend: one call per key, but in parallel instead of one after another
      const all = await Promise.all(settings.map(s => gasPost({ action: 'saveSetting', key: s.key, value: s.value })));
      return all.every(r => r.success);
    }
    handleUnauthorized(result);
    return !!result.success;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return false;
  }
}

export async function saveRemoteSetting(key: string, value: string): Promise<void> {
  await saveRemoteSettings({ [key]: value });
}

export async function dispatchNotification(
  tokenOrWebhook: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!tokenOrWebhook || !message) {
    return { success: false, error: 'ไม่พบ Endpoint หรือข้อความการแจ้งเตือน' };
  }
  try {
    const data = await adminCall('dispatchNotification', { tokenOrWebhook, message });
    return { success: !!data.success, error: data.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'ส่งข้อความไม่สำเร็จ' };
  }
}

function readLocalAuditLogs(): AuditLog[] {
  try {
    const local = localStorage.getItem('local_audit_logs');
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isApiConfigured()) {
    try {
      const result = await adminCall('getAuditLogs', {}, true, 2);
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
    } catch (err) {
      console.error('Failed to fetch audit logs from Google Sheets:', err);
    }
  }
  return readLocalAuditLogs();
}

export async function recordAuditLog(
  action: string,
  details: string,
  targetId?: string,
  adminNameOverride?: string
): Promise<void> {
  const adminName = adminNameOverride || getLoggedInAdminName() || 'เจ้าหน้าที่';

  // local copy first (instant), no extra network round-trip
  try {
    const newEntry: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      adminName,
      action,
      targetId,
      details
    };
    localStorage.setItem('local_audit_logs', JSON.stringify([newEntry, ...readLocalAuditLogs()].slice(0, 300)));
  } catch { /* ignore */ }

  if (isApiConfigured()) {
    try {
      await adminCall('recordAuditLog', { adminName, logAction: action, targetId: targetId || '', details });
    } catch (err) {
      console.error('Failed to post audit log to Google Sheets:', err);
    }
  }
}

async function adminWrite(body: Record<string, any>): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!isApiConfigured()) return { success: false, error: 'API Not configured' };
  try {
    const { action, ...rest } = body;
    const result = await adminCall(action, rest, false, 2);
    if (result.success) {
      invalidateRequestsCache();
      return { success: true, data: result.data };
    }
    return { success: false, error: result.error === 'UNAUTHORIZED' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : (result.error || 'Failed to update') };
  } catch {
    return { success: false, error: 'Network error' };
  }
}

export async function updateStatus(
  requestId: string,
  status: string,
  rejectionReason?: string,
  processedBy?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  return adminWrite({ action: 'updateStatus', requestId, status, rejectionReason, processedBy });
}

export async function updateCourseStatus(
  requestId: string,
  courseCode: string,
  status: string,
  rejectionReason?: string,
  processedBy?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  return adminWrite({ action: 'updateCourseStatus', requestId, courseCode, status, rejectionReason, processedBy });
}

// NOTE: the backend has no 'updateStudentInfo' handler — this has never worked. Kept for API compatibility.
export async function updateStudentInfo(studentId: string, updates: any): Promise<{ success: boolean; error?: string }> {
  return adminWrite({ action: 'updateStudentInfo', studentId, ...updates });
}

export async function getEmailQuota(): Promise<ApiResult> {
  return adminCall('checkEmailQuota', {}, true);
}
