import re

with open('src/components/AdminSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Make sure image-error-msg reset logic works if opening a new image
# The easiest way is to add an onLoad to the img to hide the error message
replacement = """              <div className="p-4 bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden min-h-[200px]">
                <img
                  src={previewImage.url}
                  alt="ภาพหลักฐาน Facebook"
                  className="max-h-[70vh] object-contain rounded-md z-10"
                  onLoad={(e) => {
                    e.currentTarget.style.display = 'block';
                    const el = document.getElementById('image-error-msg');
                    if(el) el.style.display = 'none';
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const el = document.getElementById('image-error-msg');
                    if(el) el.style.display = 'flex';
                  }}
                />"""

pattern = re.compile(r'<div className="p-4 bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden min-h-\[200px\]">\s*<img\s*src=\{previewImage\.url\}\s*alt="ภาพหลักฐาน Facebook"\s*className="max-h-\[70vh\] object-contain rounded-md z-10"\s*onError=\{\(e\) => \{[^\}]+\}\s*\}\s*/>', re.DOTALL)
match = pattern.search(content)
if match:
    new_content = content[:match.start()] + replacement + content[match.end():]
    with open('src/components/AdminSection.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched AdminSection onLoad.")
else:
    print("Regex did not match for onLoad.")
