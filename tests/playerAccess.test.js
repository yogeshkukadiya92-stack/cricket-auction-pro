import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidPlayerPassword, isUuid, isLiveTournament, toRegistrationSummary,
  toPublicProfile, toHistoryEntry, decodeDataImage,
} from '../shared/playerAccess.js';

const tournament = { id: 't1', name: 'Box Premier League', season: 'S3', year: 2026, status: 'UPCOMING', rules: { currency: 'LAKHS' }, upiId: 'secret@upi', userId: 'org' };
const team = { id: 'team1', name: 'Royal Strikers', shortCode: 'RS', logo: '🦁', colorHex: '#ff0000', ownerMobile: '9999999999' };
const player = { id: 'p1', name: 'Ravi', mobile: '9876543210', email: 'ravi@example.com', role: 'BATSMAN', status: 'SOLD', soldToTeamId: 'team1', soldPrice: 150000, basePrice: 20000, approvalStatus: 'APPROVED', paymentStatus: 'VERIFIED', paymentUtr: 'UTR123', customData: { aadhaar: 'x' } };

test('player password length rules', () => {
  assert.equal(isValidPlayerPassword('short'), false);
  assert.equal(isValidPlayerPassword('longenough'), true);
  assert.equal(isValidPlayerPassword('x'.repeat(129)), false);
  assert.equal(isValidPlayerPassword(12345678), false);
});

test('uuid validation guards profile lookups', () => {
  assert.equal(isUuid('3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b'), true);
  assert.equal(isUuid("1' OR 1=1"), false);
});

test('tournament is live when marked LIVE or a lot is on the block', () => {
  assert.equal(isLiveTournament({ status: 'UPCOMING' }, {}), false);
  assert.equal(isLiveTournament({ status: 'LIVE' }, {}), true);
  assert.equal(isLiveTournament({ status: 'UPCOMING' }, { currentPlayerId: 'p9' }), true);
});

test('own registration summary carries status but no organizer secrets', () => {
  const summary = toRegistrationSummary({ player, tournament, team, liveState: { currentPlayerId: 'p1' } });
  assert.equal(summary.isOnBlock, true);
  assert.equal(summary.isLive, true);
  assert.equal(summary.soldPrice, 150000);
  assert.equal(summary.team.name, 'Royal Strikers');
  assert.equal(summary.tournament.currency, 'LAKHS');
  const json = JSON.stringify(summary);
  for (const secret of ['secret@upi', 'org', '9999999999', 'UTR123', 'aadhaar']) assert.ok(!json.includes(secret), secret);
});

test('public profile never exposes mobile or e-mail', () => {
  const profile = toPublicProfile('id-1', { ...player, photoUrl: 'data:image/png;base64,AAAA', stats: { matches: '4', runs: 120 } });
  const json = JSON.stringify(profile);
  assert.ok(!json.includes('9876543210'));
  assert.ok(!json.includes('ravi@example.com'));
  assert.ok(!json.includes('base64'));
  assert.deepEqual(profile.stats, { matches: 4, runs: 120, wickets: 0, strikeRate: 0 });
  assert.equal(profile.hasPhoto, true);
});

test('history lists only approved registrations', () => {
  assert.equal(toHistoryEntry({ player: { ...player, approvalStatus: 'PENDING' }, tournament, team, liveState: {} }), null);
  const entry = toHistoryEntry({ player: { ...player, status: 'UNSOLD' }, tournament, team, liveState: {} });
  assert.equal(entry.soldPrice, null);
  assert.equal(entry.team, null);
});

test('decodes uploaded data-URL photos only', () => {
  const image = decodeDataImage('data:image/png;base64,aGVsbG8=');
  assert.equal(image.mime, 'image/png');
  assert.equal(image.buffer.toString(), 'hello');
  assert.equal(decodeDataImage('https://example.com/a.png'), null);
  assert.equal(decodeDataImage('data:text/html;base64,PGgxPg=='), null);
});
