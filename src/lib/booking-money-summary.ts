/** Total / paid / still due from booking contract total + payment ledger. */
export function bookingMoneyFromLedger(
  totalCents: number | null | undefined,
  paidCents: number,
): { totalCents: number; paidCents: number; stillDueCents: number } {
  const total = totalCents ?? 0;
  const paid = Math.max(0, paidCents);
  const stillDueCents = total > 0 ? Math.max(0, total - paid) : 0;
  return { totalCents: total, paidCents: paid, stillDueCents };
}

export function bookingCollectPercent(totalCents: number, paidCents: number): number {
  if (totalCents <= 0) return 0;
  return Math.min(100, Math.round((paidCents / totalCents) * 100));
}
