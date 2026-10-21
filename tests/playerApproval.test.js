import test from 'node:test';
import assert from 'node:assert/strict';
import { approveRegistration, migrateAutomaticApproval } from '../shared/playerApproval.js';

test('all new, legacy, imported and restored registrations are approved without changing money or auction results', () => {
  for (const approvalStatus of [undefined, 'PENDING', 'REJECTED', 'APPROVED']) {
    const player = { id: 'p1', approvalStatus, status: 'SOLD', soldPrice: 50000, soldToTeamId: 'team1', paymentStatus: 'PENDING', paymentUtr: 'receipt' };
    const approved = approveRegistration(player);
    assert.deepEqual(approved, { ...player, approvalStatus: 'APPROVED' });
    assert.equal(player.approvalStatus, approvalStatus, 'Original data remains unchanged');
    assert.equal(approved.paymentStatus, 'PENDING', 'Auto approval does not verify payment');
  }
});

test('backfill updates only approval state and skips already approved rows', async () => {
  let query;
  await migrateAutomaticApproval({ query: async sql => { query = sql; } });
  assert.match(query, /UPDATE players SET data=jsonb_set\(data,'\{approvalStatus\}','"APPROVED"'::jsonb\)/);
  assert.match(query, /IS DISTINCT FROM 'APPROVED'/);
  assert.ok(!query.includes('paymentStatus'));
  assert.ok(!query.includes('soldPrice'));
});
