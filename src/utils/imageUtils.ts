/** Compress photos, logos and receipts before upload; preserve PNG transparency. */
const MAX_IMAGE_BYTES = 300_000;
const TARGET_IMAGE_BYTES = 250_000;
const imageBytes = (url: string) => Math.floor((url.length - url.indexOf(',') - 1) * 3 / 4);

export const processUploadedImage = (
  file: File,
  maxDimension = 1280,
  callback: (dataUrl: string) => void
) => {
  const reader = new FileReader();
  const fail = () => window.alert('Could not process this image. Please choose a JPG, PNG or WebP image.');
  reader.onerror = fail;
  reader.onload = () => {
    const img = new Image();
    img.onerror = fail;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { fail(); return; }
      try {
        for (let dimension = maxDimension; dimension >= 64; dimension = Math.floor(dimension * 0.75)) {
          const scale = Math.min(1, dimension / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          // PNG logos can stay lossless when already small enough.
          if (file.type === 'image/png') {
            const png = canvas.toDataURL('image/png');
            if (imageBytes(png) <= TARGET_IMAGE_BYTES) { callback(png); return; }
          }
          for (const quality of [0.85, 0.75, 0.65, 0.55]) {
            let encoded = canvas.toDataURL('image/webp', quality);
            if (!encoded.startsWith('data:image/webp')) {
              // Browsers without a WebP encoder return PNG; keep alpha for logos.
              encoded = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
            }
            if (imageBytes(encoded) <= TARGET_IMAGE_BYTES) { callback(encoded); return; }
          }
        }
        if (typeof reader.result === 'string' && imageBytes(reader.result) <= MAX_IMAGE_BYTES) callback(reader.result);
        else fail();
      } catch { fail(); }
    };
    img.src = reader.result as string;
  };
  reader.readAsDataURL(file);
};

export const compressForLowBandwidth = (file: File, callback: (dataUrl: string) => void) => {
  processUploadedImage(file, 1280, callback);
};
