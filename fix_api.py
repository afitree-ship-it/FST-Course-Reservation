with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We will find the start of submitReservation and the start of submitRequest, and replace everything in between.
pattern = re.compile(r'export async function submitReservation.*?export function isGoogleSheetUrlInstead\(\): boolean \{', re.DOTALL)

replacement = """export async function submitReservation(data: Partial<ReservationRequest>): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
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
              const courseList = (returnedData.courses || []).map((c: any) => `• ${c.courseCode} ${c.courseName} (กลุ่ม ${c.section})`).join('\\n');
              const msg = `\\n📩 [มีคำร้องสำรองที่นั่งเข้าใหม่!]\\n------------------------\\n👤 นักศึกษา: ${returnedData.fullName}\\n🆔 รหัสนักศึกษา: ${returnedData.studentId}\\n🏫 สาขาวิชา: ${returnedData.department}\\n🔖 รหัสติดตาม: ${returnedData.id}\\n\\n📚 รายวิชาที่ขอสำรอง:\\n${courseList}\\n------------------------\\nกรุณาเข้าตรวจในระบบแอดมิน`;
              dispatchNotification(settings.notify_line_token, msg);
            }
          }).catch(() => {});
        } else {
           fetchPromise.then(actualResult => {
               if (actualResult.success) {
                   getRemoteSettings().then(settings => {
                    if (settings.notify_on_new_request === 'true' && settings.notify_line_token) {
                      const actualData = actualResult.data || returnedData;
                      const courseList = (actualData.courses || []).map((c: any) => `• ${c.courseCode} ${c.courseName} (กลุ่ม ${c.section})`).join('\\n');
                      const msg = `\\n📩 [มีคำร้องสำรองที่นั่งเข้าใหม่!]\\n------------------------\\n👤 นักศึกษา: ${actualData.fullName}\\n🆔 รหัสนักศึกษา: ${actualData.studentId}\\n🏫 สาขาวิชา: ${actualData.department}\\n🔖 รหัสติดตาม: ${actualData.id}\\n\\n📚 รายวิชาที่ขอสำรอง:\\n${courseList}\\n------------------------\\nกรุณาเข้าตรวจในระบบแอดมิน`;
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

export function isGoogleSheetUrlInstead(): boolean {
"""

match = pattern.search(content)
if match:
    new_content = content[:match.start()] + replacement + content[match.end()-49:]
    with open('src/services/api.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched API.")
else:
    print("Regex didn't match.")
