import { CurrencyType } from '../types';

export function formatAuctionPrice(amount: number, currency: CurrencyType = 'INR'): string {
  const value = Number.isFinite(amount) ? amount : 0;
  if (currency === 'POINTS') return `${new Intl.NumberFormat('en-IN').format(value)} pts`;
  if (currency === 'LAKHS') return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value / 100000)} lakh`;
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', { style: 'currency', currency: currency === 'USD' ? 'USD' : 'INR', maximumFractionDigits: 0 }).format(value);
}
