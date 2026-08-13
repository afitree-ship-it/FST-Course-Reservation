import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

fetch_with_retry = """
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

"""

# Insert fetchWithRetry after isApiConfigured
content = re.sub(r'(export function isApiConfigured\(\): boolean \{\n.*?\}\n)', r'\1\n' + fetch_with_retry, content, flags=re.DOTALL)

# Now replace fetch(...) with fetchWithRetry(...) but only for external URLs
# Specifically:
# fetch(getApiUrl()
# fetch(`${getApiUrl()
# fetch(url,  (in syncAdminPasswordsWithGoogleSheets)

content = content.replace('await fetch(getApiUrl()', 'await fetchWithRetry(getApiUrl()')
content = content.replace('await fetch(`${getApiUrl()', 'await fetchWithRetry(`${getApiUrl()')
content = content.replace("await fetch(url, { method: 'GET' })", "await fetchWithRetry(url, { method: 'GET' })")

with open('src/services/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
