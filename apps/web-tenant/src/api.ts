import { logout } from './session';

export const API_URL = 'http://localhost:3000/api/v1';

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401 && !path.startsWith('/auth/')) {
    logout('expired');
    throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Error en la solicitud');
  }
  return res.json();
}

export async function login(email: string, password: string) {
  const data = await api<{ accessToken: string; refreshToken: string; user: any }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }) },
  );
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export { logout } from './session';

export function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem('accessToken') && !!getUser();
}

export function formatCop(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(amount);
}

export type PaymentFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly';

/** Tasa decimal (0.03) → "3%" (sin unidad; la unidad la da la frecuencia). */
export function formatRatePercent(rate: number | string) {
  const pct = Number(rate) * 100;
  const formatted = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${formatted}%`;
}

const RATE_PERIOD_LABELS: Record<PaymentFrequency, string> = {
  daily: 'diario',
  weekly: 'semanal',
  biweekly: 'cada 15 días',
  monthly: 'mensual',
};

/** Tasa + frecuencia: "3% diario", "3% cada 15 días", "3% mensual". */
export function formatInterestRate(
  rate: number | string,
  frequency?: string | null,
) {
  const pct = formatRatePercent(rate);
  if (!frequency) return pct;
  const period = RATE_PERIOD_LABELS[frequency as PaymentFrequency];
  return period ? `${pct} ${period}` : pct;
}

/** @deprecated Preferir formatInterestRate con frecuencia. */
export function formatMonthlyRate(rate: number | string) {
  return formatInterestRate(rate, 'monthly');
}

/** Tasa diaria decimal (0.001) → "0,1% diario" */
export function formatDailyLateRate(rate: number | string) {
  const pct = Number(rate) * 100;
  const formatted = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${formatted.replace('.', ',')}% diario`;
}

export function estimateMonthlyInterest(balance: number, monthlyRate: number | string) {
  return Math.round(Number(balance) * Number(monthlyRate));
}

const FREQUENCY_LABELS: Record<PaymentFrequency, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Cada 15 días',
  monthly: 'Mensual',
};

export function formatPaymentFrequency(frequency?: string | null) {
  if (!frequency) return '—';
  return FREQUENCY_LABELS[frequency as PaymentFrequency] ?? frequency;
}

/** Interés del ciclo = saldo × tasa (la tasa ya es del periodo de cobro). */
export function estimatePeriodInterest(
  balance: number,
  periodRate: number | string,
  _frequency?: PaymentFrequency,
) {
  return Math.round(Number(balance) * Number(periodRate));
}

export function addPaymentPeriods(
  start: Date,
  frequency: PaymentFrequency,
  periods: number,
): Date {
  const result = new Date(start.getFullYear(), start.getMonth(), start.getDate());
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

export function loanOpenInstallment(loan: {
  installments?: Array<{
    expectedInterest: number;
    paidInterest: number;
    dueDate?: string | Date;
    status?: string;
  }>;
}) {
  const items = loan.installments ?? [];
  return items.find((item) => ['pending', 'partial', 'overdue'].includes(item.status ?? ''))
    ?? items[0]
    ?? null;
}

export function loanPendingInterest(loan: {
  installments?: Array<{ expectedInterest: number; paidInterest: number }>;
}) {
  const installment = loanOpenInstallment(loan);
  if (!installment) return 0;
  return Math.max(0, installment.expectedInterest - installment.paidInterest);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  return parseDateOnly(value).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function parseDateOnly(value: string | Date): Date {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [year, month, day] = value.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Última fecha de corte en o antes del pago, según frecuencia. */
export function lastCutoffDate(
  startDate: string | Date,
  asOf: string | Date,
  frequency: PaymentFrequency = 'monthly',
): Date {
  const start = parseDateOnly(startDate);
  const asOfDay = parseDateOnly(asOf);
  let cutoff = addPaymentPeriods(start, frequency, 1);
  if (asOfDay.getTime() <= cutoff.getTime()) return cutoff;
  let periods = 1;
  while (periods < 4000) {
    const next = addPaymentPeriods(start, frequency, periods + 1);
    if (next.getTime() > asOfDay.getTime()) return cutoff;
    cutoff = next;
    periods += 1;
  }
  return cutoff;
}

/** @deprecated Usar lastCutoffDate con frecuencia. */
export function lastMonthlyCutoff(startDate: string | Date, asOf: string | Date): Date {
  return lastCutoffDate(startDate, asOf, 'monthly');
}

/**
 * Días de atraso de un pago respecto a la fecha de corte del ciclo,
 * después de los días de gracia. No usa cuotas internas.
 */
export function daysLateOnPayment(
  startDate: string | Date,
  paymentDate: string | Date,
  graceDays = 0,
  frequency: PaymentFrequency = 'monthly',
): number {
  const asOf = parseDateOnly(paymentDate);
  const cutoff = lastCutoffDate(startDate, asOf, frequency);
  const effective = new Date(cutoff);
  effective.setDate(effective.getDate() + Number(graceDays || 0));
  const diff = Math.floor((asOf.getTime() - effective.getTime()) / 86_400_000);
  return Math.max(0, diff);
}
