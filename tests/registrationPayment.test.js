import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationPayment } from '../shared/registrationPayment.js';

test('payment off overrides saved fee and mandatory receipt while registration stays open', () => {
  const tournament = { registrationOpen: true, paymentEnabled: false, paymentMandatory: true, registrationFee: 1500 };
  assert.deepEqual(registrationPayment(tournament), { enabled: false, required: false, amount: 0 });
  assert.equal(tournament.registrationOpen, true);
});
test('payment and public registration switches operate independently', () => {
  for (const registrationOpen of [true, false]) {
    assert.deepEqual(registrationPayment({ registrationOpen, paymentEnabled: true, paymentMandatory: false, registrationFee: 1500 }), { enabled: true, required: false, amount: 1500 });
    assert.equal(registrationPayment({ registrationOpen, paymentEnabled: true, paymentMandatory: true }).required, true);
  }
});
test('existing tournaments preserve their payment settings', () => {
  assert.equal(registrationPayment({ registrationFee: 1500 }).enabled, true);
  assert.equal(registrationPayment({ paymentMandatory: true }).required, true);
  assert.equal(registrationPayment({}).enabled, false);
});
