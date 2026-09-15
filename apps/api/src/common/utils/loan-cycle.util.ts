export type CycleFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export function parseDateOnly(value: string | Date): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function startOfDay(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function addPaymentPeriods(
  start: Date,
  frequency: CycleFrequency,
  periods: number,
): Date {
  const result = startOfDay(start);
  switch (frequency) {
    case 'daily':
      result.setDate(result.getDate() + periods);
      break;
    case 'weekly':
      result.setDate(result.getDate() + 7 * periods);
      break;
    case 'biweekly':
      result.setDate(result.getDate() + 15 * periods);
      break;
    default:
      result.setMonth(result.getMonth() + periods);
  }
  return result;
}

/**
 * Cuántos ciclos de interés deben existir a la fecha.
 * El siguiente ciclo solo abre el día DESPUÉS de la fecha de corte anterior.
 */
export function expectedInstallmentCount(
  startDate: Date,
  asOf: Date,
  frequency: CycleFrequency,
  max = 4000,
): number {
  const asOfDay = startOfDay(asOf).getTime();
  let count = 1;
  while (count < max) {
    const previousDue = addPaymentPeriods(startDate, frequency, count);
    if (asOfDay > previousDue.getTime()) count += 1;
    else break;
  }
  return count;
}

export function addDays(date: Date, days: number): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function daysOverdue(dueDate: Date, asOf: Date, graceDays = 0): number {
  const effectiveDue = addDays(dueDate, graceDays);
  const diff = Math.floor(
    (startOfDay(asOf).getTime() - startOfDay(effectiveDue).getTime()) / 86_400_000,
  );
  return Math.max(0, diff);
}

export function daysAfter(from: Date, to: Date): number {
  const diff = Math.floor(
    (startOfDay(to).getTime() - startOfDay(from).getTime()) / 86_400_000,
  );
  return Math.max(0, diff);
}

/**
 * Días de mora que todavía se pueden cobrar.
 * Si ya se cobró mora en este atraso, no se vuelven a cobrar esos días;
 * solo contarían días nuevos después de esa fecha.
 */
export function chargeableLateDays(
  dueDate: Date,
  asOf: Date,
  graceDays = 0,
  settledThrough?: Date | null,
): number {
  const total = daysOverdue(dueDate, asOf, graceDays);
  if (total <= 0) return 0;
  if (!settledThrough) return total;
  const effectiveDue = addDays(dueDate, graceDays);
  if (startOfDay(settledThrough).getTime() < startOfDay(effectiveDue).getTime()) {
    return total;
  }
  return daysAfter(settledThrough, asOf);
}

export function graceDaysFromRules(rules: unknown): number {
  if (!rules || typeof rules !== 'object') return 0;
  const grace = Number((rules as { graceDays?: number }).graceDays ?? 0);
  return Number.isFinite(grace) ? grace : 0;
}

export function lateFeeRulesFromJson(rules: unknown): {
  graceDays: number;
  dailyRate: number;
  fixedPenalty: number;
} {
  if (!rules || typeof rules !== 'object') {
    return { graceDays: 0, dailyRate: 0, fixedPenalty: 0 };
  }
  const typed = rules as { graceDays?: number; dailyRate?: number; fixedPenalty?: number };
  return {
    graceDays: Number.isFinite(Number(typed.graceDays)) ? Number(typed.graceDays) : 0,
    dailyRate: Number.isFinite(Number(typed.dailyRate)) ? Number(typed.dailyRate) : 0,
    fixedPenalty: Number.isFinite(Number(typed.fixedPenalty)) ? Number(typed.fixedPenalty) : 0,
  };
}
