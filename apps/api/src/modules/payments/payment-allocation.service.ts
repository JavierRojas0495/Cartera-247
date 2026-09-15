import { Injectable } from '@nestjs/common';
import { allocatePayment } from '../../common/utils/money.util';

export interface AllocationInput {
  paymentAmount: number;
  accruedInterest: number;
  approvedLateFee: number;
  principalBalance: number;
}

@Injectable()
export class PaymentAllocationService {
  allocate(input: AllocationInput) {
    return allocatePayment(
      input.paymentAmount,
      input.accruedInterest,
      input.approvedLateFee,
      input.principalBalance,
    );
  }
}
