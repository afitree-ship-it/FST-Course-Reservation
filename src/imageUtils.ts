// Google Sheets เก็บได้สูงสุด 50,000 ตัวอักษรต่อ 1 ช่อง โลโก้/ไอคอนเก็บเป็น base64 ในชีตตั้งค่า
// เดิมบันทึกเป็น PNG 256px ซึ่งมักเกินขีดจำกัด => บันทึกลงชีตไม่สำเร็จแบบเงียบ ๆ
// เครื่องอื่นจึงไม่เห็นโลโก้ใหม่ ตอนนี้ใช้ WebP (รองรับพื้นโปร่งใส ขนาดเล็กกว่ามาก) และย่อจนกว่าจะพอดี
const MAX_CELL_CHARS = 45000;

function encode(img: HTMLImageElement, width: number, height: number, quality: number): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  const webp = canvas.toDataURL('image/webp', quality);
  // Browsers that cannot encode WebP silently return PNG instead
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png');
}

export const compressImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8,
  maxChars: number = MAX_CELL_CHARS
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const originalDataUrl = event.target?.result as string;
      const img = new Image();
      img.src = originalDataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (!width || !height) {
          // SVG without intrinsic dimensions: keep as-is only if it fits in one sheet cell
          if (originalDataUrl.length <= maxChars) resolve(originalDataUrl);
          else reject(new Error('ไฟล์รูปใหญ่เกินไป กรุณาใช้ไฟล์ PNG/JPG ขนาดเล็กลง'));
          return;
        }

        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        let q = quality;
        let result = encode(img, width, height, q);
        if (!result) {
          resolve(originalDataUrl);
          return;
        }
        // shrink quality, then size, until it fits in a single cell
        while (result.length > maxChars && (width > 32 || q > 0.5)) {
          if (q > 0.5) {
            q = Math.round((q - 0.1) * 10) / 10;
          } else {
            width = Math.max(32, Math.round(width * 0.8));
            height = Math.max(32, Math.round(height * 0.8));
          }
          result = encode(img, width, height, q) || result;
        }
        if (result.length > maxChars) {
          reject(new Error('ไม่สามารถย่อรูปให้เล็กพอได้ กรุณาใช้รูปที่เรียบง่ายกว่านี้'));
          return;
        }
        resolve(result);
      };
      img.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปได้'));
    };
    reader.onerror = (error) => reject(error);
  });
};
