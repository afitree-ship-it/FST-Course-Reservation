import re

with open('src/components/AdminSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """              <div className="p-4 bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden min-h-[200px]">
                <img
                  src={previewImage.url}
                  alt="ภาพหลักฐาน Facebook"
                  className="max-h-[70vh] object-contain rounded-md z-10"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const el = document.getElementById('image-error-msg');
                    if(el) el.style.display = 'flex';
                  }}
                />
                <div id="image-error-msg" style={{ display: 'none' }} className="absolute inset-0 flex-col items-center justify-center text-center p-6 z-0">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3 mx-auto">
                    <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-slate-300 font-medium mb-1 font-sans">ไม่สามารถแสดงรูปภาพได้</p>
                  <p className="text-slate-500 text-xs font-sans max-w-[250px] mx-auto">
                    ข้อมูลรูปภาพอาจเสียหาย ถูกตัดทอน หรือมีขนาดใหญ่เกินกว่าที่ฐานข้อมูลจะรองรับได้
                  </p>
                  {previewImage.url && !previewImage.url.startsWith('data:image') && (
                    <div className="mt-4 p-2 bg-slate-900 rounded border border-slate-800 text-left overflow-hidden">
                      <p className="text-[10px] text-slate-500 font-mono break-all line-clamp-3">
                        {previewImage.url}
                      </p>
                    </div>
                  )}
                </div>
              </div>"""

pattern = re.compile(r'<div className="p-4 bg-slate-950 flex justify-center items-center">\s*<img\s*src=\{previewImage\.url\}\s*alt="High quality screenshots verification tool"\s*className="max-h-\[70vh\] object-contain rounded-md"\s*/>\s*</div>', re.DOTALL)
match = pattern.search(content)
if match:
    new_content = content[:match.start()] + replacement + content[match.end():]
    with open('src/components/AdminSection.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched AdminSection.")
else:
    print("Regex did not match.")
