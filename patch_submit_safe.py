import re

with open('src/services/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """export async function submitReservation(data: Partial<ReservationRequest>): Promise<{ success: boolean; data?: ReservationRequest; error?: string }> {
  if (isApiConfigured()) {
    try {
      const response = await fetchWithRetry(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitRequest',
          ...data
        })
      });
      const result = await response.json();
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

        // แจ้งเตือน LINE (ถ้ามี)
        getRemoteSettings().then(settings => {
          if (settings.notify_on_new_request === 'true' && settings.notify_line_token) {
            const courseList = (returnedData.courses || []).map((c: any) => `• ${c.courseCode} ${c.courseName} (กลุ่ม ${c.section})`).join('\\n');
            const msg = `\\n📩 [มีคำร้องสำรองที่นั่งเข้าใหม่!]\\n------------------------\\n👤 นักศึกษา: ${returnedData.fullName}\\n🆔 รหัสนักศึกษา: ${returnedData.studentId}\\n🏫 สาขาวิชา: ${returnedData.department}\\n🔖 รหัสติดตาม: ${returnedData.id}\\n\\n📚 รายวิชาที่ขอสำรอง:\\n${courseList}\\n------------------------\\nกรุณาเข้าตรวจในระบบแอดมิน`;
            dispatchNotification(settings.notify_line_token, msg);
          }
        }).catch(() => {});

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
}"""

# Replace the entire function block
pattern = re.compile(r'export async function submitReservation\(data.*?return \{ success: true, data: newReq \};\n\}', re.DOTALL)
match = pattern.search(content)
if match:
    new_content = content[:match.start()] + replacement + content[match.end():]
    with open('src/services/api.ts', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched submitReservation to be safe.")
else:
    print("Regex did not match.")
