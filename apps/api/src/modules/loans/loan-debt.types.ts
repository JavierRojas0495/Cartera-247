export interface LoanDebtSummary {
  loanId: string;
  loanCode: string;
  borrowerName: string;
  principalBalance: number;
  pendingInterest: number;
  pendingLateFee: number;
  suggestedLateFee: number;
  lateFeeDailyRate: number;
  lateFeeDailyPercent: number;
  graceDays: number;
  fixedPenalty: number;
  minimumDueThisPeriod: number;
  totalDebt: number;
  cutoffDate: string | null;
  isOverdue: boolean;
  daysOverdue: number;
  chargeableLateDays: number;
  daysAlreadyCharged: number;
  canChargeLateFee: boolean;
  moraSettledOn: string | null;
  unpaidCycles: number;
  currentInstallment: {
    number: number;
    dueDate: string;
    expectedInterest: number;
    paidInterest: number;
    interestRemaining: number;
  } | null;
}

export interface PaymentResultSummary {
  paidAmount: number;
  appliedToInterest: number;
  appliedToLateFee: number;
  appliedToPrincipal: number;
  interestRemaining: number;
  newPrincipalBalance: number;
  totalDebtRemaining: number;
}
