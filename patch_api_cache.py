import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """const studentIdCache: Record<string, { time: number; data: ReservationRequest[]; promise?: Promise<any> }> = {};

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
}"""

pattern = re.compile(r'export async function getStatusByStudentId\(studentId: string, forceRefresh = false\): Promise<\{ success: boolean; data\?: ReservationRequest\[\]; error\?: string \}> \{.*?return \{ success: false, error: \'ไม่สามารถดึงข้อมูลสถานะได้\' \};\n\}', re.DOTALL)
match = pattern.search(content)
if match:
    new_content = content[:match.start()] + replacement + content[match.end():]
    with open('src/services/api.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched getStatusByStudentId.")
else:
    print("Regex did not match.")
