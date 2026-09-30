/**
 * Image processing & low-bandwidth compression utilities
 * 
 * Engineered to compress camera photos and receipts down to ~25KB - 40KB
 * so uploads never timeout or stall on 2G / low-bandwidth mobile connections.
 */

export const processUploadedImage = (
  file: File,
  maxDimension = 320,
  callback: (dataUrl: string) => void
) => {
  const isPng = file.type === 'image/png';
  const reader = new FileReader();

  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // High quality bicubic downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // For PNG logos, preserve transparent alpha channel.
        // For photos and receipts, use WebP or JPEG with 0.70 compression (saves ~90% bandwidth)
        let dataUrl: string;
        if (isPng) {
          dataUrl = canvas.toDataURL('image/png');
        } else {
          try {
            dataUrl = canvas.toDataURL('image/webp', 0.70);
          } catch {
            dataUrl = canvas.toDataURL('image/jpeg', 0.70);
          }
        }
        callback(dataUrl);
      } else {
        callback(event.target?.result as string);
      }
    };
    img.src = event.target?.result as string;
  };
  reader.readAsDataURL(file);
};

/**
 * Ultra-low bandwidth compressor specifically for mobile payment screenshots & player avatars
 */
export const compressForLowBandwidth = (
  file: File,
  callback: (dataUrl: string) => void
) => {
  processUploadedImage(file, 380, callback);
};
