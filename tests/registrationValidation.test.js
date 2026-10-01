import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMobile, isUploadedImage } from '../shared/registrationValidation.js';
test('phone formatting cannot create a second registration identity', () => {
  for (const phone of ['9876543210', '+91 98765 43210', '919876543210', '09876543210', '98765-43210']) assert.equal(normalizeMobile(phone), '9876543210');
});
test('placeholder, remote URL and empty strings do not count as uploaded photos', () => {
  for (const image of ['', '/player-placeholder.svg', 'https://example.com/photo.jpg']) assert.equal(isUploadedImage(image), false);
  assert.equal(isUploadedImage('data:image/jpeg;base64,YWJj'), true);
});
