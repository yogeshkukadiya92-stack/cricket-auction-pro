import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { compressUploadedImage, compressRecordImages, MAX_IMAGE_BYTES } from '../server/imageCompression.js';
import { decodeDataImage } from '../shared/playerAccess.js';

test('large PNG and JPEG photos become valid images under 300 KB', async () => {
  const raw = randomBytes(1400 * 1400 * 3);
  for (const format of ['png', 'jpeg']) {
    const input = await sharp(raw, { raw: { width: 1400, height: 1400, channels: 3 } })[format]().toBuffer();
    assert.ok(input.length > MAX_IMAGE_BYTES);
    const result = decodeDataImage(await compressUploadedImage(`data:image/${format};base64,${input.toString('base64')}`));
    assert.ok(result.buffer.length <= MAX_IMAGE_BYTES);
    assert.equal(result.mime, 'image/webp');
    const meta = await sharp(result.buffer).metadata();
    assert.ok(meta.width > 0 && meta.width <= 1600);
    assert.ok(meta.height > 0 && meta.height <= 1600);
  }
});

test('transparent logos keep transparency and efficient small images stay unchanged', async () => {
  const raw = randomBytes(700 * 700 * 4);
  const input = await sharp(raw, { raw: { width: 700, height: 700, channels: 4 } }).png().toBuffer();
  const result = decodeDataImage(await compressUploadedImage(`data:image/png;base64,${input.toString('base64')}`));
  assert.ok(result.buffer.length <= MAX_IMAGE_BYTES);
  assert.equal((await sharp(result.buffer).metadata()).hasAlpha, true);
  const small = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#ffffff' } }).png().toBuffer();
  const url = `data:image/png;base64,${small.toString('base64')}`;
  assert.equal(await compressUploadedImage(url), url);
  assert.equal(await compressUploadedImage('https://example.com/image.png'), 'https://example.com/image.png');
});

test('compression preserves player and payment data and rejects corrupt oversized images', async () => {
  const player = { name: 'Ravi', paymentStatus: 'PENDING', paymentUtr: 'UTR123', photoUrl: '/photo.png', paymentScreenshotUrl: '/receipt.png' };
  assert.deepEqual(await compressRecordImages(player, ['photoUrl', 'paymentScreenshotUrl']), player);
  await assert.rejects(compressUploadedImage(`data:image/jpeg;base64,${Buffer.alloc(MAX_IMAGE_BYTES + 1).toString('base64')}`), error => error.status === 400);
});
