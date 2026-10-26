import { mediaColumns, projectMedia, restoreMedia } from './recordMedia.js';
import { compressUploadedImage } from './imageCompression.js';
import { decodeDataImage } from '../shared/playerAccess.js';

export const mediaPath = (tournamentId, playerId, field) => `/api/tournaments/${encodeURIComponent(tournamentId)}/players/${encodeURIComponent(playerId)}/media/${field}`;
export const mediaFields = ['photoUrl', 'paymentScreenshotUrl'];

// Project at the database: embedded images never enter the bootstrap response.
export const bootstrapPlayersSql = `SELECT ${mediaColumns('players', 'p')}
  FROM players p JOIN tournaments t ON t.id=p.tournament_id WHERE t.organizer_id=$1 OR $2`;

export function projectPlayerMedia(row) {
  // Accept legacy row projections as well as the shared compact projection.
  const data = { ...row.data };
  if (row.embedded_photo || row.photo != null) data.photoUrl = row.embedded_photo ? mediaPath(data.tournamentId, data.id, 'photoUrl') : row.photo;
  if (row.embedded_receipt || row.receipt != null) data.paymentScreenshotUrl = row.embedded_receipt ? mediaPath(data.tournamentId, data.id, 'paymentScreenshotUrl') : row.receipt;
  return projectMedia('players', { ...row, data });
}
export const restorePlayerMedia = (data, previous) => restoreMedia('players', data, previous);

export function registerBootstrapMedia(app, { pool, requireUser, owns }) {
  app.get('/api/tournaments/:id/players/:playerId/media/:field', requireUser, async (req, res) => {
    if (!mediaFields.includes(req.params.field) || !await owns(req.params.id, req.user.id)) return res.sendStatus(404);
    const result = await pool.query('SELECT data->>$3 AS image FROM players WHERE tournament_id=$1 AND id=$2', [req.params.id, req.params.playerId, req.params.field]);
    const image = decodeDataImage(await compressUploadedImage(result.rows[0]?.image));
    if (!image) return res.sendStatus(404);
    res.set('Cache-Control', 'private, no-store').type(image.mime).send(image.buffer);
  });
}
