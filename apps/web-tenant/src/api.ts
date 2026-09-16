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

export function formatLoanCode(loan?: { code?: string | null; id?: string } | null) {
  if (!loan) return '—';
  if (loan.code && String(loan.code).trim()) return String(loan.code).trim();
  if (loan.id) return `CR-${loan.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  return '—';
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
  installments?: Array<{
    expectedInterest: number;
    paidInterest: number;
    status?: string;
  }>;
  pendingInterest?: number;
}) {
  if (typeof loan.pendingInterest === 'number' && Number.isFinite(loan.pendingInterest)) {
    return Math.max(0, Math.round(loan.pendingInterest));
  }
  const items = loan.installments ?? [];
  return items.reduce((sum, item) => {
    if (item.status && !['pending', 'partial', 'overdue'].includes(item.status)) {
      return sum;
    }
    return sum + Math.max(0, Number(item.expectedInterest) - Number(item.paidInterest));
  }, 0);
}

/** Situación de cobranza del crédito (no confundir con status del préstamo). */
export function loanCollectionStatus(loan: {
  status?: string;
  installments?: Array<{
    status?: string;
    dueDate?: string | Date;
    expectedInterest?: number;
    paidInterest?: number;
  }>;
}): { key: 'current' | 'overdue' | 'settled' | 'closed'; label: string; badge: string } {
  if (loan.status === 'paid_off') {
    return { key: 'settled', label: 'Saldado', badge: 'active' };
  }
  if (loan.status && loan.status !== 'active') {
    return { key: 'closed', label: 'Cerrado', badge: 'inactive' };
  }

  const today = parseDateOnly(new Date());
  const hasOverdue = (loan.installments ?? []).some((item) => {
    if (item.status === 'overdue') return true;
    if (!['pending', 'partial'].includes(item.status ?? '')) return false;
    const remaining = Math.max(0, Number(item.expectedInterest ?? 0) - Number(item.paidInterest ?? 0));
    if (remaining <= 0 || !item.dueDate) return false;
    return parseDateOnly(item.dueDate).getTime() < today.getTime();
  });

  if (hasOverdue) {
    return { key: 'overdue', label: 'En mora', badge: 'overdue' };
  }
  return { key: 'current', label: 'Al día', badge: 'active' };
}

/** Días de atraso de UN corte (solo después de la fecha de corte; el día del corte = 0). */
export function daysLateForDueDate(dueDate: string | Date, asOf: Date = new Date()) {
  const due = parseDateOnly(dueDate);
  const today = parseDateOnly(asOf);
  const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
  return Math.max(0, diff);
}

export type InterestCycleRow = {
  id: string;
  dueDate: string | Date;
  expectedInterest: number;
  paidInterest: number;
  remaining: number;
  /** Días de mora SOLO de este corte (0 el día del corte o si ya está pagado). */
  daysLate: number;
  status: 'paid' | 'due_today' | 'overdue';
  statusLabel: string;
};

/**
 * Historial de cortes según frecuencia, solo hasta hoy (no genera el día/mes futuro).
 * Cada fila es independiente: los días de mora no se suman entre cortes.
 */
export function buildInterestCycleHistory(
  loan: {
    installments?: Array<{
      id?: string;
      dueDate?: string | Date;
      expectedInterest?: number;
      paidInterest?: number;
      status?: string;
    }>;
  },
  asOf: Date = new Date(),
): InterestCycleRow[] {
  const today = parseDateOnly(asOf);
  return (loan.installments ?? [])
    .map((item, index) => {
      if (!item.dueDate) return null;
      if (item.status === 'paid' || item.status === 'waived') {
        // se incluyen abajo si due <= today
      } else if (item.status && !['pending', 'partial', 'overdue', 'paid'].includes(item.status)) {
        return null;
      }

      const due = parseDateOnly(item.dueDate);
      // Aún no llega ese corte (ej. mañana en cobro diario) → no aparece.
      if (due.getTime() > today.getTime()) return null;

      const expectedInterest = Math.round(Number(item.expectedInterest ?? 0));
      const paidInterest = Math.round(Number(item.paidInterest ?? 0));
      const remaining = Math.max(0, expectedInterest - paidInterest);
      const calendarLate = daysLateForDueDate(due, today);

      let status: InterestCycleRow['status'];
      let statusLabel: string;
      let daysLate = 0;

      if (remaining <= 0) {
        status = 'paid';
        statusLabel = 'Al día';
        daysLate = 0;
      } else if (calendarLate > 0) {
        status = 'overdue';
        statusLabel = 'En mora';
        daysLate = calendarLate;
      } else {
        // due === today: el corte llegó, pero el día aún no cuenta como mora.
        status = 'due_today';
        statusLabel = 'En curso';
        daysLate = 0;
      }

      return {
        id: item.id ?? `cycle-${index}`,
        dueDate: item.dueDate,
        expectedInterest,
        paidInterest,
        remaining,
        daysLate,
        status,
        statusLabel,
      };
    })
    .filter((row): row is InterestCycleRow => row != null)
    .sort((a, b) => parseDateOnly(a.dueDate).getTime() - parseDateOnly(b.dueDate).getTime());
}

/** @deprecated Usar buildInterestCycleHistory */
export function buildOpenInterestCycles(
  loan: Parameters<typeof buildInterestCycleHistory>[0],
  asOf?: Date,
) {
  return buildInterestCycleHistory(loan, asOf).filter((row) => row.remaining > 0);
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
