import { formatCop, formatDate, formatInterestRate, formatPaymentFrequency, formatLoanCode, daysLateOnPayment, loanPendingInterest, buildInterestCycleHistory, type PaymentFrequency } from './api';

type Props = {
  loan: any;
};

const paymentMethodLabel: Record<string, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  other: 'Otro',
};

const paymentStatusLabel: Record<string, string> = {
  pending: 'Pendiente',
  accepted: 'Registrado',
  rejected: 'Rechazado',
  voided: 'Anulado',
};

const loanStatusLabel: Record<string, string> = {
  active: 'Activo',
  paid_off: 'Saldado',
  defaulted: 'En incumplimiento',
  cancelled: 'Cancelado',
};

const overdueStatusLabel: Record<string, string> = {
  pending_review: 'Por revisar',
  approved: 'Aprobada',
  waived: 'Condonada',
  applied: 'Aplicada',
};

const changeFieldLabel: Record<string, string> = {
  principalAmount: 'Prestado',
  currentBalance: 'Por cobrar',
  interestRate: 'Tasa',
  paymentFrequency: 'Frecuencia de cobro',
  startDate: 'Fecha de desembolso',
  borrowerId: 'Prestatario',
  productId: 'Producto',
};

function formatChangeValue(field: string, value: unknown, frequency?: string | null): string {
  if (value == null || value === '') return '—';
  if (field === 'principalAmount' || field === 'currentBalance') {
    return formatCop(Number(value));
  }
  if (field === 'interestRate') {
    return formatInterestRate(Number(value), frequency as PaymentFrequency | undefined);
  }
  if (field === 'paymentFrequency') {
    return formatPaymentFrequency(String(value));
  }
  if (field === 'startDate') {
    return formatDate(String(value));
  }
  return String(value);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function loanStatusBadge(status: string) {
  if (status === 'paid_off') return 'active';
  if (status === 'defaulted' || status === 'cancelled') return 'inactive';
  return 'active';
}

function sumAllocations(payment: any) {
  const rows = payment.allocations ?? [];
  return rows.reduce(
    (acc: { toInterest: number; toLateFee: number; toPrincipal: number }, row: any) => ({
      toInterest: acc.toInterest + (row.toInterest ?? 0),
      toLateFee: acc.toLateFee + (row.toLateFee ?? 0),
      toPrincipal: acc.toPrincipal + (row.toPrincipal ?? 0),
    }),
    { toInterest: 0, toLateFee: 0, toPrincipal: 0 },
  );
}

export function buildPaymentHistory(loan: any) {
  const installments = loan.installments ?? [];
  const byId = Object.fromEntries(installments.map((item: any) => [item.id, item]));
  const payments = [...(loan.payments ?? [])].sort(
    (a: any, b: any) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime(),
  );
  const graceDays = Number(loan.term?.lateFeeRules?.graceDays ?? 0);

  let runningBalance = Number(loan.principalAmount);
  return payments.map((payment: any) => {
    const alloc = sumAllocations(payment);
    if (payment.status === 'accepted') {
      runningBalance -= alloc.toPrincipal;
    }
    const installmentId = payment.allocations?.[0]?.installmentId;
    const installment = installmentId ? byId[installmentId] : null;
    const daysLate = loan.startDate
      ? daysLateOnPayment(
          loan.startDate,
          payment.paymentDate,
          graceDays,
          (loan.paymentFrequency as PaymentFrequency) || 'monthly',
        )
      : 0;

    return {
      payment,
      alloc,
      balanceAfter: runningBalance,
      installment,
      daysLate,
    };
  }).reverse();
}

function MoraCell({ daysLate, charged }: { daysLate: number; charged: boolean }) {
  if (daysLate <= 0) {
    return <span className="loan-on-time">Al día</span>;
  }
  return (
    <span className={charged ? 'loan-late' : 'loan-late-note'}>
      {daysLate} día{daysLate === 1 ? '' : 's'}
      {charged ? '' : ' (sin cobro)'}
    </span>
  );
}

export function LoanDetailView({ loan }: Props) {
  const borrowerName = `${loan.borrower?.firstName ?? ''} ${loan.borrower?.lastName ?? ''}`.trim();
  const pendingInterest = loanPendingInterest(loan);
  const cycleHistory = buildInterestCycleHistory(loan);
  const openCyclesCount = cycleHistory.filter((c) => c.remaining > 0).length;
  const history = buildPaymentHistory(loan);
  const overdueEvents = (loan.installments ?? []).flatMap((installment: any) =>
    (installment.overdueEvents ?? [])
      .filter((event: any) => event.status === 'applied')
      .map((event: any) => ({ event, installment })),
  );
  const acceptedPayments = (loan.payments ?? []).filter((p: any) => p.status === 'accepted');
  const totalPaid = acceptedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const totalToPrincipal = acceptedPayments.reduce(
    (sum: number, p: any) => sum + sumAllocations(p).toPrincipal,
    0,
  );
  const totalToInterest = acceptedPayments.reduce(
    (sum: number, p: any) => sum + sumAllocations(p).toInterest,
    0,
  );

  return (
    <div className="loan-detail">
      <div className="card loan-detail-hero">
        <div>
          <p className="borrower-detail-kicker">Crédito {formatLoanCode(loan)}</p>
          <h2 className="borrower-detail-name">{borrowerName || 'Prestatario'}</h2>
          <p className="borrower-detail-doc">
            {loan.borrower?.documentType || 'CC'} {loan.borrower?.documentNum}
          </p>
        </div>
        <div className="borrower-detail-hero-meta">
          <span className={`badge badge-${loanStatusBadge(loan.status)}`}>
            {loanStatusLabel[loan.status] ?? loan.status}
          </span>
          <span className="badge badge-inactive">{formatInterestRate(loan.interestRate, loan.paymentFrequency)}</span>
          <span className="badge badge-inactive">{formatPaymentFrequency(loan.paymentFrequency)}</span>
        </div>
      </div>

      <div className="card loan-detail-facts">
        <div className="detail-field">
          <dt>Prestado</dt>
          <dd>{formatCop(loan.principalAmount)}</dd>
          <p className="loan-stat-hint">Entregado el {formatDate(loan.startDate)}</p>
        </div>
        <div className="detail-field">
          <dt>Por cobrar</dt>
          <dd>{formatCop(loan.currentBalance)}</dd>
          <p className="loan-stat-hint">Capital que aún debe</p>
        </div>
        <div className="detail-field">
          <dt>Interés pendiente</dt>
          <dd className={pendingInterest > 0 ? 'loan-interest-due' : 'loan-interest-paid'}>
            {formatCop(pendingInterest)}
          </dd>
          <p className="loan-stat-hint">
            {openCyclesCount > 1
              ? `Suma de ${openCyclesCount} cortes pendientes`
              : 'Sobre el saldo actual'}
          </p>
        </div>
        <div className="detail-field">
          <dt>Pagado a la fecha</dt>
          <dd>{formatCop(totalPaid)}</dd>
          <p className="loan-stat-hint">
            {formatCop(totalToInterest)} interés · {formatCop(totalToPrincipal)} capital
          </p>
        </div>
      </div>

      <section className="card loan-detail-section">
        <div className="loan-section-head">
          <h3>Historial de cortes</h3>
          <p>
            Cortes del crédito <strong>{formatLoanCode(loan)}</strong> según cobro{' '}
            {formatPaymentFrequency(loan.paymentFrequency).toLowerCase()}:
            solo hasta hoy. Cada fila tiene su interés y sus propios días de mora.
            El día del corte aún no cuenta mora.
          </p>
        </div>
        {cycleHistory.length === 0 ? (
          <p className="detail-empty">Aún no hay cortes vencidos o en curso en este crédito.</p>
        ) : (
          <div className="table-scroll">
            <table className="loans-table responsive-table">
              <thead>
                <tr>
                  <th>Fecha de corte</th>
                  <th>Interés del ciclo</th>
                  <th>Ya pagado</th>
                  <th>Por cobrar</th>
                  <th>Días de mora</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {cycleHistory.map((cycle) => (
                  <tr key={cycle.id}>
                    <td data-label="Corte">{formatDate(cycle.dueDate)}</td>
                    <td data-label="Interés ciclo">{formatCop(cycle.expectedInterest)}</td>
                    <td data-label="Pagado">{formatCop(cycle.paidInterest)}</td>
                    <td data-label="Por cobrar">
                      <span className={cycle.remaining > 0 ? 'loan-interest-due' : 'loan-interest-paid'}>
                        {formatCop(cycle.remaining)}
                      </span>
                    </td>
                    <td data-label="Días mora">
                      {cycle.daysLate > 0 ? (
                        <span className="loan-late">
                          {cycle.daysLate} día{cycle.daysLate === 1 ? '' : 's'}
                        </span>
                      ) : (
                        <span className="loan-on-time">0</span>
                      )}
                    </td>
                    <td data-label="Estado">
                      <span
                        className={`badge badge-${
                          cycle.status === 'overdue' ? 'overdue' : 'active'
                        }`}
                      >
                        {cycle.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card loan-detail-section">
        <div className="loan-section-head">
          <h3>Abonos registrados</h3>
          <p>Pagos del crédito <strong>{formatLoanCode(loan)}</strong>: cómo se aplicaron a interés, mora y capital.</p>
        </div>
        {history.length === 0 ? (
          <p className="detail-empty">Aún no hay pagos registrados en este crédito.</p>
        ) : (
          <div className="table-scroll">
            <table className="loans-table loan-history-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Pagó</th>
                  <th>A interés</th>
                  <th>A mora</th>
                  <th>A capital</th>
                  <th>Por cobrar después</th>
                  <th>Días de mora</th>
                  <th>Medio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row: any) => (
                  <tr key={row.payment.id} className={row.payment.status === 'voided' ? 'loan-row-voided' : undefined}>
                    <td>{formatDate(row.payment.paymentDate)}</td>
                    <td>{formatCop(row.payment.amount)}</td>
                    <td>{formatCop(row.alloc.toInterest)}</td>
                    <td>{row.alloc.toLateFee ? formatCop(row.alloc.toLateFee) : '—'}</td>
                    <td>{formatCop(row.alloc.toPrincipal)}</td>
                    <td>{row.payment.status === 'accepted' ? formatCop(row.balanceAfter) : '—'}</td>
                    <td>
                      <MoraCell daysLate={row.daysLate} charged={row.alloc.toLateFee > 0} />
                    </td>
                    <td>{paymentMethodLabel[row.payment.method] ?? row.payment.method}</td>
                    <td>
                      <span className={`badge badge-${row.payment.status === 'accepted' ? 'active' : 'inactive'}`}>
                        {paymentStatusLabel[row.payment.status] ?? row.payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {(loan.changeHistory ?? []).length > 0 && (
        <section className="card loan-detail-section">
          <div className="loan-section-head">
            <h3>Historial de modificaciones</h3>
            <p>Registro de cambios del crédito: qué se editó, cuándo, valor anterior y valor nuevo.</p>
          </div>
          <div className="table-scroll">
            <table className="loans-table responsive-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Quién</th>
                  <th>Campo</th>
                  <th>Valor anterior</th>
                  <th>Valor nuevo</th>
                </tr>
              </thead>
              <tbody>
                {(loan.changeHistory as any[]).flatMap((entry) =>
                  entry.changes.map((change: any, index: number) => (
                    <tr key={`${entry.id}-${change.field}-${index}`}>
                      <td data-label="Fecha">{formatDateTime(entry.createdAt)}</td>
                      <td data-label="Quién">{entry.user?.name || entry.user?.email || '—'}</td>
                      <td data-label="Campo">{changeFieldLabel[change.field] ?? change.field}</td>
                      <td data-label="Anterior">
                        {formatChangeValue(change.field, change.previousValue, loan.paymentFrequency)}
                      </td>
                      <td data-label="Nuevo">
                        {formatChangeValue(change.field, change.newValue, loan.paymentFrequency)}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card loan-detail-section">
        <div className="loan-section-head">
          <h3>Mora</h3>
          <p>Solo aparecen recargos de mora que realmente se cobraron en un pago. Los días de atraso del historial se miden contra la fecha de corte (el mismo día del mes del desembolso).</p>
        </div>
        {overdueEvents.length === 0 ? (
          <p className="detail-empty">No se ha cobrado interés de mora en este crédito.</p>
        ) : (
          <div className="table-scroll">
            <table className="loans-table">
              <thead>
                <tr>
                  <th>Detectado</th>
                  <th>Vencimiento</th>
                  <th>Días de mora</th>
                  <th>Recargo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {overdueEvents.map(({ event, installment }: any) => (
                  <tr key={event.id}>
                    <td>{formatDate(event.detectedAt)}</td>
                    <td>{formatDate(installment.dueDate)}</td>
                    <td>
                      <span className="loan-late">
                        {event.daysOverdue} día{event.daysOverdue === 1 ? '' : 's'}
                      </span>
                    </td>
                    <td>{formatCop(event.calculatedFee)}</td>
                    <td>
                      <span className={`badge ${event.status === 'waived' ? 'badge-inactive' : 'badge-overdue'}`}>
                        {overdueStatusLabel[event.status] ?? event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
