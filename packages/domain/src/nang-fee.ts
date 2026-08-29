import type { MoneyMinor, DurationMs, EquivalentMs } from '@not/contracts';

/**
 * Calculate per-millisecond nang fee rate.
 * rate = dailySalary / standardPaidMs
 */
export function calculateNangFeeRate(
  dailySalaryMinor: MoneyMinor,
  standardPaidMs: DurationMs,
): number {
  if (standardPaidMs <= 0) throw new Error('standardPaidMs must be positive');
  return dailySalaryMinor / standardPaidMs;
}

/**
 * Accrue nang fee for worked duration.
 */
export function accrue(
  durationMs: DurationMs,
  dailySalaryMinor: MoneyMinor,
  standardPaidMs: DurationMs,
): { deltaEquivalentMs: EquivalentMs; displayDeltaMinor: MoneyMinor } {
  const deltaEquivalentMs = durationMs;
  const rate = calculateNangFeeRate(dailySalaryMinor, standardPaidMs);
  const displayDeltaMinor = Math.round(deltaEquivalentMs * rate);
  return { deltaEquivalentMs, displayDeltaMinor };
}

/**
 * Forfeit (deduct) nang fee for overtime.
 * Returns negative delta.
 */
export function forfeit(
  overtimeMs: DurationMs,
  dailySalaryMinor: MoneyMinor,
  standardPaidMs: DurationMs,
): { deltaEquivalentMs: EquivalentMs; displayDeltaMinor: MoneyMinor; poolContributionMinor: MoneyMinor } {
  const deltaEquivalentMs = -overtimeMs;
  const rate = calculateNangFeeRate(dailySalaryMinor, standardPaidMs);
  const displayDeltaMinor = -Math.round(overtimeMs * rate);
  const poolContributionMinor = Math.round(overtimeMs * rate); // positive into pool
  return { deltaEquivalentMs, displayDeltaMinor, poolContributionMinor };
}
