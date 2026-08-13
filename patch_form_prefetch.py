import re

with open('src/components/FormSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """  // Prefetch data when student ID reaches 9 digits to make it feel instant
  useEffect(() => {
    if (studentId.trim().length === 9 && isStudentIdValid(studentId)) {
      getStatusByStudentId(studentId.trim());
    }
  }, [studentId]);

  // โหลดอีเมลเดิมที่เคยกรอกไว้เพื่อความสะดวก"""

pattern = re.compile(r'\s*// โหลดอีเมลเดิมที่เคยกรอกไว้เพื่อความสะดวก')
match = pattern.search(content)
if match:
    new_content = content[:match.start()] + "\n" + replacement + content[match.end():]
    with open('src/components/FormSection.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched FormSection prefetch.")
else:
    print("Regex did not match.")
