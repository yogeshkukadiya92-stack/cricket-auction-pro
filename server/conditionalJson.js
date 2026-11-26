import { createHash } from 'node:crypto';

export function prepareConditionalJson(data) {
  const body = JSON.stringify(data);
  const etag = `"${createHash('sha256').update(body).digest('base64url')}"`;
  return { body, etag };
}

export function sendPreparedJson(req, res, { body, etag }) {
  res.set('ETag', etag);
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  return res.type('json').send(body);
}

export function sendConditionalJson(req, res, data) {
  return sendPreparedJson(req, res, prepareConditionalJson(data));
}
