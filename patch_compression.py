import re

with open('src/components/FormSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = """  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast(isTh ? 'กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ (PNG, JPG, JPEG, etc.)' : 'Please upload image files only (PNG, JPG, JPEG).', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast(isTh ? 'ขนาดไฟล์ใหญ่เกินไป จำกัดที่ 10MB' : 'File size is too large (must be under 10MB).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        let maxDim = 800; // เริ่มบีบที่ 800px

        const compress = () => {
          let currentWidth = width;
          let currentHeight = height;
          if (currentWidth > currentHeight) {
            if (currentWidth > maxDim) {
              currentHeight *= maxDim / currentWidth;
              currentWidth = maxDim;
            }
          } else {
            if (currentHeight > maxDim) {
              currentWidth *= maxDim / currentHeight;
              currentHeight = maxDim;
            }
          }

          canvas.width = currentWidth;
          canvas.height = currentHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, currentWidth, currentHeight);
            let quality = 0.7;
            let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            // บีบอัดจนกว่าขนาด String Base64 จะน้อยกว่า 45,000 ตัวอักษร (ข้อจำกัด Google Sheets 50,000)
            while (compressedDataUrl.length > 45000 && quality > 0.1) {
              quality -= 0.15;
              compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            
            // ถ้ายอมลดคุณภาพสุดๆ แล้วยังใหญ่ไป ให้ลดขนาดแกน (Dimension) ลงอีกครึ่งนึง
            if (compressedDataUrl.length > 45000 && maxDim > 200) {
              maxDim -= 200;
              compress();
              return;
            }

            setFacebookProofFile({
              name: file.name,
              type: 'image/jpeg',
              dataUrl: compressedDataUrl
            });
            showToast(isTh ? 'อัปโหลดและประมวลผลไฟล์รูปภาพเรียบร้อย' : 'Screenshot uploaded and processed successfully.', 'success');
          } else {
            showToast(isTh ? 'เกิดข้อผิดพลาดในการประมวลผลรูปภาพ' : 'Error processing image.', 'error');
          }
        };
        
        compress();
      };
      img.onerror = () => {
        showToast(isTh ? 'เกิดข้อผิดพลาดในการโหลดรูปภาพ' : 'Error loading image.', 'error');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      showToast(isTh ? 'เกิดข้อผิดพลาดในการโหลดไฟล์' : 'An error occurred while loading the file.', 'error');
    };
    reader.readAsDataURL(file);
  };"""

# Replace the old processFile function
pattern = re.compile(r'const processFile = \(file: File\) => \{.*?reader\.readAsDataURL\(file\);\n  \};', re.DOTALL)
match = pattern.search(content)
if match:
    new_content = content[:match.start()] + replacement + content[match.end():]
    with open('src/components/FormSection.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully patched processFile.")
else:
    print("Regex did not match.")
