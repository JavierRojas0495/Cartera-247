import { randomBytes } from 'crypto';

/** Código visible del crédito: CR-AñosMesDía-XXXX (único por tenant). */
export function generateLoanCode(asOf: Date = new Date()): string {
  const yy = String(asOf.getFullYear()).slice(-2);
  const mm = String(asOf.getMonth() + 1).padStart(2, '0');
  const dd = String(asOf.getDate()).padStart(2, '0');
  const suffix = randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
  return `CR-${yy}${mm}${dd}-${suffix}`;
}
