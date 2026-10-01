export function getPaymentLinks({ upiId, name, amount, note }, userAgent = '') {
  const payee = (upiId || '').trim();
  if (!/^[^\s@]+@[^\s@]+$/.test(payee) || !Number.isFinite(amount) || amount <= 0) return null;
  const params = new URLSearchParams({ pa: payee, pn: name || 'Tournament Organizer', am: amount.toFixed(2), cu: 'INR', tn: note || 'Player Entry Fee' }).toString();
  const upi = `upi://pay?${params}`;
  const googlePay = /Android/i.test(userAgent)
    ? `intent://pay?${params}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`
    : `gpay://upi/pay?${params}`;
  return { upi, googlePay };
}
