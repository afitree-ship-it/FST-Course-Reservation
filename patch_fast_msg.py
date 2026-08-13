import re

with open('src/components/FormSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("กรุณารอสักครู่ ระบบกำลังเข้ารหัสและบันทึกข้อมูลอย่างปลอดภัย (ประมาณ 1-3 วินาที)...", "กรุณารอสักครู่ ระบบกำลังส่งข้อมูลไปยังฐานข้อมูล (เสร็จสิ้นใน 1 วินาที)...")
content = content.replace("Please wait securely saving your request (approx. 1-3 seconds)...", "Please wait, transmitting data to server (approx. 1 second)...")

with open('src/components/FormSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
