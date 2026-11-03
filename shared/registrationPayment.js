// Missing setting preserves the payment behavior of existing tournaments.
export function registrationPayment(tournament) {
  const enabled = tournament.paymentEnabled ?? ((tournament.registrationFee ?? 0) > 0 || !!tournament.paymentMandatory);
  return { enabled, required: enabled && !!tournament.paymentMandatory, amount: enabled ? (tournament.registrationFee ?? 0) : 0 };
}
