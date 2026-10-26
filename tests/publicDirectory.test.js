import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerPublicDirectoryRoutes } from '../server/publicDirectoryRoutes.js';

test('anonymous directory loads metadata separately from photos and keeps photos scoped to approved players', async t => {
  const photo = 'data:image/png;base64,aGVsbG8=';
  let approved = true;
  const queries = [];
  const app = express();
  registerPublicDirectoryRoutes(app, { pool: { query: async (sql, params) => {
    queries.push({ sql, params });
    if (params[0] !== 't1') return { rowCount: 0, rows: [] };
    if (sql.includes('AS image FROM')) {
      if (sql.includes('FROM tournaments')) return { rows: [{ image: photo }] };
      assert.ok(sql.includes("coalesce(data->>'approvalStatus'"), 'Photo reads must enforce approval');
      return { rows: approved && params[1] === 'p1' ? [{ image: photo }] : [] };
    }
    if (sql.includes('count(*)')) return {rows:[{stats:{total:1,batsmen:1,bowlers:0,allRounders:0,keepers:0,approved:1,pending:0},matched:1}]};
    assert.ok(sql.includes('jsonb_build_object'), 'List queries project metadata rather than full records');
    assert.ok(sql.includes("LIKE 'data:image/%'"), 'Embedded images stay in the database during list reads');
    for (const privateField of ['mobile', 'email', 'paymentScreenshotUrl', 'customData', 'paymentUtr']) {
      assert.ok(!sql.includes(`data->'${privateField}'`));
    }
    if (sql.includes('FROM tournaments')) return { rowCount: 1, rows: [{ data: { id: 't1', name: 'League' }, uploaded_image: true }] };
    assert.ok(sql.includes("coalesce(data->>'approvalStatus'"));
    assert.ok(sql.includes("DESC NULLS LAST, id"));
    return { rows: [{ data: { id: 'p1', name: 'Ravi', role: 'BATSMAN' }, uploaded_image: true }] };
  } } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(`${base}/api/public/tournaments/t1/players-directory`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const text = await response.text();
  assert.ok(text.length < 1000, 'Directory payload contains no embedded images');
  assert.ok(!text.includes('base64'));
  const data = JSON.parse(text);
  assert.equal(data.players[0].name, 'Ravi');
  assert.equal(data.players[0].approvalStatus, 'APPROVED');
  for (const imagePath of [data.players[0].photoUrl, data.tournament.logoUrl]) {
    const image = await fetch(`${base}${imagePath}`);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('content-type'), 'image/png');
    assert.equal(image.headers.get('cache-control'), 'no-store');
    assert.equal(await image.text(), 'hello');
  }
  approved = false;
  assert.equal((await fetch(`${base}${data.players[0].photoUrl}`)).status, 404);
  assert.equal((await fetch(`${base}/api/public/tournaments/other/players-directory/p1/photo`)).status, 404);
  assert.equal((await fetch(`${base}/api/public/tournaments/other/players-directory`)).status, 404);
  assert.deepEqual(queries.find(q => q.sql.includes('id=$2')).params, ['t1', 'p1']);
});
