import { allocatePayment, calculateMonthlyInterest } from '../../common/utils/money.util';

describe('PaymentAllocationService', () => {
  describe('allocatePayment', () => {
    it('asigna todo al interés cuando el pago cubre solo interés', () => {
      const result = allocatePayment(30000, 30000, 0, 1000000);
      expect(result.toInterest).toBe(30000);
      expect(result.toLateFee).toBe(0);
      expect(result.toPrincipal).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it('si hay dos meses de interés vencidos, 60000 no baja capital', () => {
      const result = allocatePayment(60000, 60000, 0, 1000000);
      expect(result.toInterest).toBe(60000);
      expect(result.toPrincipal).toBe(0);
    });

    it('el excedente del mes en curso baja capital', () => {
      const result = allocatePayment(120000, 30000, 0, 1000000);
      expect(result.toInterest).toBe(30000);
      expect(result.toPrincipal).toBe(90000);
      expect(result.remaining).toBe(0);
    });

    it('asigna mora cobrada antes del capital', () => {
      const result = allocatePayment(50000, 30000, 5000, 1000000);
      expect(result.toInterest).toBe(30000);
      expect(result.toLateFee).toBe(5000);
      expect(result.toPrincipal).toBe(15000);
    });

    it('maneja pago parcial que no cubre todo el interés', () => {
      const result = allocatePayment(15000, 30000, 0, 1000000);
      expect(result.toInterest).toBe(15000);
      expect(result.toPrincipal).toBe(0);
      expect(result.remaining).toBe(0);
    });
  });

  describe('calculateMonthlyInterest', () => {
    it('calcula interés mensual sobre saldo', () => {
      expect(calculateMonthlyInterest(1000000, 0.03)).toBe(30000);
      expect(calculateMonthlyInterest(880000, 0.03)).toBe(26400);
    });
  });
});
