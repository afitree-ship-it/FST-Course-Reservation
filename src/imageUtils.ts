export const compressImage = (file: File, maxWidth: number, maxHeight: number, quality: number = 0.8): Promise<string> => {
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
          // If SVG without intrinsic dimensions, skip resize
          resolve(originalDataUrl);
          return;
        }

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(originalDataUrl); // fallback
        }
      };
      img.onerror = () => resolve(originalDataUrl); // fallback if error loading image
    };
    reader.onerror = (error) => reject(error);
  });
};
