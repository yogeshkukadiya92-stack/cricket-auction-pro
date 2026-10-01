import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaymentLinks } from '../shared/paymentLinks.js';
const details = { upiId: 'organizer@bank', name: 'Cricket & Sports', amount: 1500, note: 'League Entry Fee' };
test('Android Google Pay intent uses configured payee and exact fee', () => {
  const links = getPaymentLinks(details, 'Android');
  assert.match(links.googlePay, /package=com.google.android.apps.nbu.paisa.user/);
  const query = new URLSearchParams(links.upi.split('?')[1]);
  assert.equal(query.get('am'), '1500.00');
  assert.equal(query.get('pa'), details.upiId);
  assert.equal(query.get('pn'), details.name);
  assert.equal(query.get('cu'), 'INR');
});
test('iPhone Google Pay scheme and generic UPI fallback are both provided', () => {
  const links = getPaymentLinks(details, 'iPhone');
  assert.match(links.googlePay, /^gpay:\/\/upi\/pay\?/);
  assert.match(links.upi, /^upi:\/\/pay\?/);
});
test('mobile number alone and invalid fees cannot generate payment links', () => {
  assert.equal(getPaymentLinks({ ...details, upiId: '9876543210' }), null);
  assert.equal(getPaymentLinks({ ...details, amount: 0 }), null);
  assert.equal(getPaymentLinks({ ...details, amount: NaN }), null);
});
