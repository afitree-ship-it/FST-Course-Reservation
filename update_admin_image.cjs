const fs = require('fs');
let text = fs.readFileSync('src/components/AdminSection.tsx', 'utf8');

// Add import
const importPattern = `import { ReservationRequest, RequestStatus } from '../types';`;
if (text.includes(importPattern)) {
  text = text.replace(importPattern, `import { ReservationRequest, RequestStatus } from '../types';\nimport { compressImage } from '../imageUtils';`);
} else {
  text = `import { compressImage } from '../imageUtils';\n` + text;
}

// Logo upload replacement
const logoUploadOld = `                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (typeof reader.result === 'string') {
                                        setLogoInput(reader.result);
                                        showToast('โหลดรูปภาพเตรียมบันทึกเรียบร้อย', 'success');
                                      }
                                    };
                                    reader.readAsDataURL(file);`;

const logoUploadNew = `                                    compressImage(file, 256, 256, 0.8).then(base64 => {
                                      setLogoInput(base64);
                                      showToast('โหลดและย่อขนาดรูปภาพสำเร็จ เตรียมบันทึก', 'success');
                                    }).catch(err => {
                                      showToast('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
                                      console.error(err);
                                    });`;

if (text.includes(logoUploadOld)) {
  text = text.replace(logoUploadOld, logoUploadNew);
} else {
  console.log("Could not find logo upload block");
}

// Favicon upload replacement
const faviconUploadOld = `                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      if (typeof reader.result === 'string') {
                                        setFaviconInput(reader.result);
                                        showToast('โหลดรูป Favicon เตรียมบันทึกเรียบร้อย', 'success');
                                      }
                                    };
                                    reader.readAsDataURL(file);`;

const faviconUploadNew = `                                    compressImage(file, 128, 128, 0.8).then(base64 => {
                                      setFaviconInput(base64);
                                      showToast('โหลดและย่อขนาด Favicon สำเร็จ เตรียมบันทึก', 'success');
                                    }).catch(err => {
                                      showToast('เกิดข้อผิดพลาดในการประมวลผลรูปภาพ', 'error');
                                      console.error(err);
                                    });`;

if (text.includes(faviconUploadOld)) {
  text = text.replace(faviconUploadOld, faviconUploadNew);
} else {
  console.log("Could not find favicon upload block");
}

fs.writeFileSync('src/components/AdminSection.tsx', text);
console.log("Updated AdminSection.tsx");
