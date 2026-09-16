export type UserRole =
  | 'platform_admin'
  | 'owner'
  | 'admin'
  | 'operator'
  | 'readonly'
  | 'borrower';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId?: string;
  isPlatformAdmin: boolean;
  modules: string[];
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface Borrower {
  id: string;
  documentNum: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: string;
}

export interface Loan {
  id: string;
  principalAmount: number;
  currentBalance: number;
  interestRate: number;
  status: string;
  startDate: string;
  borrower?: Borrower;
}

export interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  method: string;
  status: string;
  allocations?: PaymentAllocation[];
}

export interface PaymentAllocation {
  toInterest: number;
  toLateFee: number;
  toPrincipal: number;
}

export interface PortfolioSummary {
  activeLoansCount: number;
  totalOutstanding: number;
  totalPrincipal?: number;
  activeBorrowers: number;
  /** Créditos activos en mora (KPI). */
  overdueLoans: number;
  /** Ciclos internos vencidos; no usar como KPI de UI. */
  overdueInstallments: number;
  /** Suma de interés pendiente (todos los ciclos abiertos). */
  totalPendingInterest?: number;
  totalCollected: number;
}

export const MODULE_CODES = {
  CORE_CLIENTS: 'CORE_CLIENTS',
  CORE_LOANS: 'CORE_LOANS',
  CORE_PAYMENTS: 'CORE_PAYMENTS',
  REPORTS: 'REPORTS',
  BORROWER_PORTAL: 'BORROWER_PORTAL',
  COLLECTORS: 'COLLECTORS',
  NOTIFICATIONS: 'NOTIFICATIONS',
} as const;

export const API_BASE_URL = 'http://localhost:3000/api/v1';
