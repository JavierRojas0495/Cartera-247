export const roundCop = (amount: number): number => Math.round(amount);

export const monthlyRateFromAnnual = (annualRate: number): number =>
  annualRate / 12;

export type InterestFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export const calculateMonthlyInterest = (
  principalBalance: number,
  monthlyRate: number,
): number => roundCop(principalBalance * monthlyRate);

/**
 * Interés del ciclo: la tasa guardada aplica al periodo de cobro
 * (si es 3% y cobro diario → 3% por día; si es mensual → 3% por mes).
 */
export const calculatePeriodInterest = (
  principalBalance: number,
  periodRate: number,
  _frequency?: InterestFrequency,
): number => roundCop(principalBalance * periodRate);

export const calculateLateFee = (
  overdueAmount: number,
  dailyRate: number,
  daysOverdue: number,
  fixedPenalty = 0,
): number =>
  roundCop(overdueAmount * dailyRate * daysOverdue + fixedPenalty);

export interface PaymentAllocationResult {
  toInterest: number;
  toLateFee: number;
  toPrincipal: number;
  remaining: number;
}

export const allocatePayment = (
  paymentAmount: number,
  accruedInterest: number,
  approvedLateFee: number,
  principalBalance: number,
): PaymentAllocationResult => {
  let remaining = paymentAmount;
  let toInterest = 0;
  let toLateFee = 0;
  let toPrincipal = 0;

  toInterest = Math.min(remaining, accruedInterest);
  remaining -= toInterest;

  toLateFee = Math.min(remaining, approvedLateFee);
  remaining -= toLateFee;

  toPrincipal = Math.min(remaining, principalBalance);
  remaining -= toPrincipal;

  return { toInterest, toLateFee, toPrincipal, remaining };
};
