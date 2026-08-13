import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

append = """
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
"""

with open('src/services/api.ts', 'a', encoding='utf-8') as f:
    f.write(append)
print("Restored updateStatus and updateStudentInfo")
