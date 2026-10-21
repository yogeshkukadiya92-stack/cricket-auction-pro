import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { decodeDataImage } from '../shared/playerAccess.js';

export const MAX_IMAGE_BYTES = 300_000;
const TARGET_IMAGE_BYTES = 250_000;
// Cache only byte-identical transformations, never authorization or database reads.
// Old photos served publicly need encoding once rather than on every page visit.
const encodedImages = new Map();
const CACHE_BYTES = 16_000_000;
let cachedBytes = 0;
const remember = (key, value) => {
  if (encodedImages.has(key)) cachedBytes -= encodedImages.get(key).length;
  while (cachedBytes + value.length > CACHE_BYTES && encodedImages.size) {
    const oldest = encodedImages.keys().next().value;
    cachedBytes -= encodedImages.get(oldest).length;
    encodedImages.delete(oldest);
  }
  encodedImages.set(key, value);
  cachedBytes += value.length;
  return value;
};

// Small files stay unchanged; never inflate an already efficient image.
export async function compressUploadedImage(value) {
  const image = decodeDataImage(value);
  if (!image || image.buffer.length <= MAX_IMAGE_BYTES) return value;
  const key = createHash('sha256').update(image.buffer).digest('hex');
  if (encodedImages.has(key)) return encodedImages.get(key);
  try {
    for (let dimension = 1600; dimension >= 128; dimension = Math.floor(dimension * 0.75)) {
      for (const quality of [82, 70, 58]) {
        const output = await sharp(image.buffer, { limitInputPixels: 40_000_000 })
          .rotate().resize(dimension, dimension, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality }).toBuffer();
        if (output.length <= TARGET_IMAGE_BYTES) return remember(key, `data:image/webp;base64,${output.toString('base64')}`);
      }
    }
    throw new Error('Image could not fit the upload limit');
  } catch {
    throw Object.assign(new Error('Could not process this image. Please upload a different JPG, PNG or WebP image.'), { status: 400 });
  }
}

export async function compressRecordImages(record, fields) {
  const result = { ...record };
  for (const field of fields) {
    if (result[field]) result[field] = await compressUploadedImage(result[field]);
  }
  return result;
}
