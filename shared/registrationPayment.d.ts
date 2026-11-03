export function registrationPayment(tournament: { paymentEnabled?: boolean; registrationFee?: number; paymentMandatory?: boolean }): { enabled: boolean; required: boolean; amount: number };
