export function getPaymentLinks(details: { upiId: string; name: string; amount: number; note: string }, userAgent?: string): { upi: string; googlePay: string; bhim: string; paytm: string } | null;
