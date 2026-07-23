const fs = require('fs');
let text = fs.readFileSync('src/components/AdminSection.tsx', 'utf8');

const logoUploadOld = `                                    const reader = new FileReader();
                                    reader.onload = () => {
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
}

const faviconUploadOld = `                                    const reader = new FileReader();
                                    reader.onload = () => {
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
}

fs.writeFileSync('src/components/AdminSection.tsx', text);
console.log("Updated!");
