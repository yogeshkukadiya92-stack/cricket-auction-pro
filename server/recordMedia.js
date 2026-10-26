import { decodeDataImage } from '../shared/playerAccess.js';
import { compressUploadedImage } from './imageCompression.js';

const fieldsByKind = { players: ['photoUrl', 'paymentScreenshotUrl'], teams: ['logo'], tournaments: ['logoUrl', 'gpayQrUrl'] };
export const recordMediaPath = (kind, record, field) => kind === 'players'
  ? `/api/tournaments/${encodeURIComponent(record.tournamentId)}/players/${encodeURIComponent(record.id)}/media/${field}`
  : kind === 'teams' ? `/api/tournaments/${encodeURIComponent(record.tournamentId)}/teams/${encodeURIComponent(record.id)}/media/${field}`
  : `/api/public/tournaments/${encodeURIComponent(record.id)}/media/${field}`;

export const customMediaPath = (record, key) => `${recordMediaPath('players', record, 'custom')}/${encodeURIComponent(key)}`;

// Keep image bytes in PostgreSQL, outside list, polling and auction payloads.
export function mediaColumns(kind, alias = '') {
  const data = alias ? `${alias}.data` : 'data';
  const fields = fieldsByKind[kind];
  const custom = kind === 'players' ? `, (SELECT jsonb_object_agg(entry.key, CASE WHEN entry.value #>> '{}' LIKE 'data:image/%' THEN jsonb_build_object('__auctionUpload',true) ELSE entry.value END) FROM jsonb_each(CASE WHEN jsonb_typeof(${data}->'customData')='object' THEN ${data}->'customData' ELSE '{}'::jsonb END) entry) AS custom_data` : '';
  return `${data}${fields.map(f => ` - '${f}'`).join('')}${kind === 'players' ? " - 'customData'" : ''} AS data, ` + fields.map(field =>
    `(${data}->>'${field}' LIKE 'data:image/%') AS "${field}_embedded", CASE WHEN ${data}->>'${field}' LIKE 'data:image/%' THEN NULL ELSE ${data}->>'${field}' END AS "${field}_value"`).join(', ') + custom;
}

export function projectMedia(kind, row) {
  const record = { ...row.data };
  for (const field of fieldsByKind[kind]) {
    // Also handle legacy live state and in-memory records.
    if (row[`${field}_embedded`] || /^data:image\//.test(record[field] || '')) record[field] = recordMediaPath(kind, record, field);
    else if (`${field}_value` in row) record[field] = row[`${field}_value`] || '';
  }
  if (kind === 'players' && ('custom_data' in row || record.customData)) {
    record.customData = { ...('custom_data' in row ? row.custom_data : record.customData) };
    for (const [key, value] of Object.entries(record.customData)) {
      if (value?.__auctionUpload === true || typeof value === 'string' && value.startsWith('data:image/')) record.customData[key] = customMediaPath(record, key);
    }
  }
  return record;
}

export function restoreMedia(kind, record, previous) {
  const next = { ...record };
  for (const field of fieldsByKind[kind]) {
    if (next[field] === recordMediaPath(kind, record, field)) {
      if (!previous?.[field]) throw Object.assign(new Error('Image is no longer available. Refresh and retry.'), { status: 409 });
      next[field] = previous[field];
    }
  }
  if (kind === 'players' && next.customData) {
    next.customData = { ...next.customData };
    for (const [key, value] of Object.entries(next.customData)) {
      if (value === customMediaPath(next, key)) {
        if (!previous?.customData?.[key]) throw Object.assign(new Error('Uploaded answer is no longer available. Refresh and retry.'), {status:409});
        next.customData[key] = previous.customData[key];
      }
    }
  }
  return next;
}

export function compactLiveState(state, tournamentId) {
  if (!state) return {};
  const player = value => value && projectMedia('players', { data: { ...value, tournamentId } });
  const team = value => value && projectMedia('teams', { data: { ...value, tournamentId } });
  return { ...state, leadingTeam: team(state.leadingTeam), ...(state.lastEvent ? { lastEvent: { ...state.lastEvent, player: player(state.lastEvent.player), team: team(state.lastEvent.team) } } : {}) };
}

async function sendImage(req, res, pool, kind, id) {
  const fields = fieldsByKind[kind];
  if (!fields.includes(req.params.field)) return res.sendStatus(404);
  const row = await pool.query(kind === 'tournaments'
    ? 'SELECT data->>$2 AS image FROM tournaments WHERE id=$1'
    : `SELECT data->>$3 AS image FROM ${kind} WHERE tournament_id=$1 AND id=$2`,
  kind === 'tournaments' ? [id, req.params.field] : [req.params.id, id, req.params.field]);
  const image = decodeDataImage(await compressUploadedImage(row.rows[0]?.image));
  if (!image) return res.sendStatus(404);
  res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }).type(image.mime).send(image.buffer);
}

export function registerRecordMedia(app, { pool, requireUser, owns }) {
  app.get('/api/tournaments/:id/players/:playerId/media/custom/:key', requireUser, async (req, res) => {
    if (!await owns(req.params.id, req.user.id)) return res.sendStatus(404);
    const row = await pool.query("SELECT data->'customData'->>$3 AS image FROM players WHERE tournament_id=$1 AND id=$2", [req.params.id, req.params.playerId, req.params.key]);
    const image = decodeDataImage(await compressUploadedImage(row.rows[0]?.image));
    if (!image) return res.sendStatus(404);
    res.set({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}).type(image.mime).send(image.buffer);
  });
  app.get('/api/tournaments/:id/teams/:teamId/media/:field', requireUser, async (req, res) => {
    if (!await owns(req.params.id, req.user.id)) return res.sendStatus(404);
    await sendImage(req, res, pool, 'teams', req.params.teamId);
  });
  // These two images were already exposed by the public registration form.
  app.get('/api/public/tournaments/:id/media/:field', async (req, res) => sendImage(req, res, pool, 'tournaments', req.params.id));
}
