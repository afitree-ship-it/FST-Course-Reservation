import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """
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
"""

content = content.replace("export function isGoogleSheetUrlInstead(): boolean {", replacement)

with open('src/services/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
