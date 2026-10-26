import { sendConditionalJson } from './conditionalJson.js';
import { compressUploadedImage } from './imageCompression.js';
import { decodeDataImage } from '../shared/playerAccess.js';

const tournamentFields = ['id', 'name', 'season', 'year', 'sponsor', 'ground', 'city', 'registrationFee', 'registrationOpen', 'defaultBasePrice'];
const playerFields = ['id', 'name', 'role', 'battingStyle', 'bowlingStyle', 'city', 'basePrice', 'stats', 'approvalStatus', 'status', 'registeredAt'];
// Project public fields in PostgreSQL so photos and private form responses never
// travel through the directory query. The existing tournament/id keys cover these reads.
export const publicProjection = fields => fields.map(field => `'${field}', data->'${field}'`).join(', ');
const approved = "(coalesce(data->>'approvalStatus','') IN ('','APPROVED'))";
export const publicImageProjection = field => `CASE WHEN data->>'${field}' LIKE 'data:image/%' THEN NULL ELSE data->>'${field}' END AS image_url, (data->>'${field}' LIKE 'data:image/%') AS uploaded_image`;

export const publicImageUrl = (row, path) => row.uploaded_image ? path : row.image_url || '';

export function registerPublicDirectoryRoutes(app, { pool }) {
  const base = '/api/public/tournaments/:id/players-directory';
  app.get(base, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const root = `/api/public/tournaments/${encodeURIComponent(req.params.id)}/players-directory`;
    const result = await pool.query(`SELECT jsonb_build_object(${publicProjection(tournamentFields)}) AS data, ${publicImageProjection('logoUrl')} FROM tournaments WHERE id=$1`, [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Tournament not found' });
    const page = Math.max(0, Math.min(10000, Number.parseInt(req.query.page, 10) || 0));
    const pageSize = 48;
    const q = String(req.query.q || '').trim().slice(0, 100);
    const pattern = q ? `%${q.replace(/[\\%_]/g, '\\$&')}%` : '';
    const role = ['BATSMAN','BOWLER','ALL_ROUNDER','WICKET_KEEPER'].includes(req.query.role) ? req.query.role : '';
    const matches = "($2::text='' OR data->>'name' ILIKE $2 OR data->>'city' ILIKE $2 OR data->>'role' ILIKE $2) AND ($3::text='' OR data->>'role'=$3)";
    const [rows, totals] = await Promise.all([
      pool.query(`SELECT jsonb_build_object(${publicProjection(playerFields)}) AS data, ${publicImageProjection('photoUrl')} FROM players WHERE tournament_id=$1 AND ${approved} AND ${matches} ORDER BY data->>'registeredAt' DESC NULLS LAST, id LIMIT $4 OFFSET $5`, [req.params.id, pattern, role, pageSize, page * pageSize]),
      pool.query(`SELECT jsonb_build_object('total',count(*),'batsmen',count(*) FILTER (WHERE data->>'role'='BATSMAN'),'bowlers',count(*) FILTER (WHERE data->>'role'='BOWLER'),'allRounders',count(*) FILTER (WHERE data->>'role'='ALL_ROUNDER'),'keepers',count(*) FILTER (WHERE data->>'role'='WICKET_KEEPER'),'approved',count(*),'pending',0) AS stats, count(*) FILTER (WHERE ${matches})::int AS matched FROM players WHERE tournament_id=$1 AND ${approved}`, [req.params.id, pattern, role]),
    ]);
    const { stats, matched } = totals.rows[0];
    const row = result.rows[0];
    sendConditionalJson(req, res, {
      success: true, stats, matched, page, pageSize, hasMore: (page + 1) * pageSize < matched,
      tournament: { ...row.data, registrationOpen: row.data.registrationOpen !== false, logoUrl: row.uploaded_image ? `${root}/logo` : row.image_url || '' },
      players: rows.rows.map(row => ({ ...row.data, approvalStatus: row.data.approvalStatus || 'APPROVED', stats: row.data.stats || { matches: 0, runs: 0, wickets: 0, strikeRate: 0 }, photoUrl: row.uploaded_image ? `${root}/${encodeURIComponent(row.data.id)}/photo` : row.image_url || '' })),
    });
  });

  const sendImage = async (res, value) => {
    // Recheck approval on every photo request, including after moderation changes.
    res.set('Cache-Control', 'no-store');
    const image = decodeDataImage(await compressUploadedImage(value));
    if (!image) return res.status(404).json({ error: 'Image not found' });
    res.set('X-Content-Type-Options', 'nosniff');
    res.type(image.mime).send(image.buffer);
  };
  app.get(`${base}/logo`, async (req, res) => {
    const result = await pool.query("SELECT data->>'logoUrl' AS image FROM tournaments WHERE id=$1", [req.params.id]);
    await sendImage(res, result.rows[0]?.image);
  });
  app.get(`${base}/teams/:teamId/logo`, async (req, res) => {
    const result = await pool.query("SELECT data->>'logo' AS image FROM teams WHERE tournament_id=$1 AND id=$2", [req.params.id, req.params.teamId]);
    await sendImage(res, result.rows[0]?.image);
  });
  app.get(`${base}/:playerId/photo`, async (req, res) => {
    const result = await pool.query(`SELECT data->>'photoUrl' AS image FROM players WHERE tournament_id=$1 AND id=$2 AND ${approved}`, [req.params.id, req.params.playerId]);
    await sendImage(res, result.rows[0]?.image);
  });
}
