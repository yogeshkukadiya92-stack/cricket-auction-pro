import { createHash } from 'node:crypto';

// No shared response cache: each request still checks access and reads current data.
export function sendConditionalJson(req, res, data) {
  const body = JSON.stringify(data);
  const etag = `"${createHash('sha256').update(body).digest('base64url')}"`;
  res.set('ETag', etag);
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  return res.type('json').send(body);
}
