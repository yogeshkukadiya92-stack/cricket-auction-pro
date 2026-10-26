import { decodeDataImage } from '../shared/playerAccess.js';

export const mediaPath = (tournamentId, playerId, field) => `/api/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}/media/${field}`;
export const mediaFields = ['photoUrl', 'paymentScreenshotUrl'];

// Project at the database: embedded images never enter the bootstrap response.
export const bootstrapPlayersSql = `SELECT p.data - 'photoUrl' - 'paymentScreenshotUrl' AS data,
  CASE WHEN p.data->>'photoUrl' LIKE 'data:image/%' THEN true ELSE false END AS embedded_photo,
  CASE WHEN p.data->>'paymentScreenshotUrl' LIKE 'data:image/%' THEN true ELSE false END AS embedded_receipt,
  CASE WHEN p.data->>'photoUrl' LIKE 'data:image/%' THEN NULL ELSE p.data->>'photoUrl' END AS photo,
  CASE WHEN p.data->>'paymentScreenshotUrl' LIKE 'data:image/%' THEN NULL ELSE p.data->>'paymentScreenshotUrl' END AS receipt
  FROM players p JOIN tournaments t ON t.id=p.tournament_id WHERE t.organizer_id=$1 OR $2`;

export function projectPlayerMedia(row) {
  const data = { ...row.data };
  if (row.embedded_photo || row.photo != null) data.photoUrl = row.embedded_photo ? mediaPath(data.tournamentId, data.id, 'photoUrl') : row.photo;
  if (row.embedded_receipt || row.receipt != null) data.paymentScreenshotUrl = row.embedded_receipt ? mediaPath(data.tournamentId, data.id, 'paymentScreenshotUrl') : row.receipt;
  return data;
}

export function restorePlayerMedia(data, previous) {
  const result = { ...data };
  for (const field of mediaFields) {
    if (result[field] === mediaPath(data.tournamentId, data.id, field)) {
      if (!previous?.[field]) throw Object.assign(new Error('Player image is no longer available. Refresh and retry.'), { status: 409 });
      result[field] = previous[field];
    }
  }
  return result;
}

export function registerBootstrapMedia(app, { pool, requireUser, owns }) {
  app.get('/api/tournaments/:id/players/:playerId/media/:field', requireUser, async (req, res) => {
    if (!mediaFields.includes(req.params.field) || !await owns(req.params.id, req.user.id)) return res.sendStatus(404);
    const result = await pool.query('SELECT data->>$3 AS image FROM players WHERE tournament_id=$1 AND id=$2', [req.params.id, req.params.playerId, req.params.field]);
    const image = decodeDataImage(result.rows[0]?.image);
    if (!image) return res.sendStatus(404);
    res.set('Cache-Control', 'private, no-store').type(image.mime).send(image.buffer);
  });
}
