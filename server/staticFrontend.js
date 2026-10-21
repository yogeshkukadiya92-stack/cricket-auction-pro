import express from 'express';
import path from 'node:path';

export function mountStaticFrontend(app, dist) {
  app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true }));
  // Missing deployment chunks must not fall through to the SPA's HTML document.
  app.use('/assets', (_req, res) => res.status(404).set('Cache-Control', 'no-store').type('text/plain').send('Asset not found'));
  app.use(express.static(dist, { maxAge: 0 }));
  app.use((_req, res) => res.set('Cache-Control', 'no-cache').sendFile(path.join(dist, 'index.html')));
}
