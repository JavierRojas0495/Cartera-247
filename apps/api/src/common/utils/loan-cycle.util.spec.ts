import { expectedInstallmentCount, daysOverdue, chargeableLateDays, parseDateOnly } from './loan-cycle.util';

describe('loan-cycle', () => {
  const start = parseDateOnly('2025-01-15');

  it('antes del primer corte solo existe el mes en curso', () => {
    expect(expectedInstallmentCount(start, parseDateOnly('2025-01-20'), 'monthly')).toBe(1);
    expect(expectedInstallmentCount(start, parseDateOnly('2025-02-15'), 'monthly')).toBe(1);
  });

  it('el día siguiente al corte abre el mes siguiente', () => {
    expect(expectedInstallmentCount(start, parseDateOnly('2025-02-16'), 'monthly')).toBe(2);
    expect(expectedInstallmentCount(start, parseDateOnly('2025-03-16'), 'monthly')).toBe(3);
  });

  it('cobro diario abre el siguiente ciclo al día siguiente del corte', () => {
    expect(expectedInstallmentCount(start, parseDateOnly('2025-01-15'), 'daily')).toBe(1);
    expect(expectedInstallmentCount(start, parseDateOnly('2025-01-16'), 'daily')).toBe(1);
    expect(expectedInstallmentCount(start, parseDateOnly('2025-01-17'), 'daily')).toBe(2);
  });

  it('cobro cada 15 días cuenta periodos de 15', () => {
    expect(expectedInstallmentCount(start, parseDateOnly('2025-01-30'), 'biweekly')).toBe(1);
    expect(expectedInstallmentCount(start, parseDateOnly('2025-01-31'), 'biweekly')).toBe(2);
    expect(expectedInstallmentCount(start, parseDateOnly('2025-02-15'), 'biweekly')).toBe(3);
  });

  it('no vuelve a cobrar días de mora ya saldados', () => {
    const due = parseDateOnly('2025-02-15');
    const settled = parseDateOnly('2025-03-20');
    expect(chargeableLateDays(due, parseDateOnly('2025-03-20'), 3, settled)).toBe(0);
    expect(chargeableLateDays(due, parseDateOnly('2025-03-25'), 3, settled)).toBe(5);
  });

  it('si el atraso es nuevo, cobra los días completos aunque hubo mora en un ciclo anterior', () => {
    const newDue = parseDateOnly('2025-04-15');
    const previousSettlement = parseDateOnly('2025-03-20');
    expect(chargeableLateDays(newDue, parseDateOnly('2025-04-25'), 3, previousSettlement)).toBe(
      daysOverdue(newDue, parseDateOnly('2025-04-25'), 3),
    );
  });
});
