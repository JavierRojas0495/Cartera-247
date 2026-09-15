import { formatCop, formatInterestRate, loanPendingInterest } from './api';

export function primaryBorrowerPhone(borrower: any): string {
  return borrower.phones?.[0]?.phone || borrower.phone || '';
}

type Props = {
  borrower: any;
  onEdit: () => void;
};

function DetailField({ label, value }: { label: string; value?: string | null }) {
  const display = value?.trim();
  return (
    <div className="detail-field">
      <dt>{label}</dt>
      <dd>{display || '—'}</dd>
    </div>
  );
}

function statusLabel(status: string) {
  if (status === 'active') return 'Activo';
  if (status === 'inactive') return 'Inactivo';
  return status;
}

export function BorrowerDetailView({ borrower, onEdit }: Props) {
  const fullName = `${borrower.firstName} ${borrower.lastName}`;
  const residence = borrower.residenceAddress || borrower.address;
  const activeLoans = borrower.loans ?? [];
  const references = borrower.personalReferences ?? [];
  const phones = borrower.phones?.length
    ? borrower.phones
    : borrower.phone
      ? [{ phone: borrower.phone, label: 'Personal', isPrimary: true }]
      : [];
  const workPhones = borrower.workPhones?.length
    ? borrower.workPhones
    : borrower.workPhone
      ? [{ phone: borrower.workPhone, label: 'Oficina', isPrimary: true }]
      : [];
  const workAddresses = borrower.workAddresses?.length
    ? borrower.workAddresses
    : borrower.workAddress
      ? [{ address: borrower.workAddress, label: 'Sede principal', isPrimary: true }]
      : [];

  return (
    <div className="borrower-detail">
      <div className="card borrower-detail-hero">
        <div className="borrower-detail-hero-main">
          <div>
            <p className="borrower-detail-kicker">Prestatario</p>
            <h2 className="borrower-detail-name">{fullName}</h2>
            <p className="borrower-detail-doc">
              {borrower.documentType || 'CC'} {borrower.documentNum}
            </p>
          </div>
          <div className="borrower-detail-hero-meta">
            <span className={`badge badge-${borrower.status === 'active' ? 'active' : 'inactive'}`}>
              {statusLabel(borrower.status)}
            </span>
            {activeLoans.length > 0 && (
              <span className="badge badge-overdue">
                {activeLoans.length} préstamo{activeLoans.length > 1 ? 's' : ''} activo{activeLoans.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="borrower-detail-hero-actions">
          <button type="button" className="btn btn-primary" onClick={onEdit}>
            Editar prestatario
          </button>
        </div>
      </div>

      <div className="borrower-detail-grid">
        <section className="card borrower-detail-section">
          <h3>Contacto</h3>
          {phones.length > 0 ? (
            <dl className="detail-list">
              {phones.map((p: any, i: number) => (
                <DetailField
                  key={p.id || i}
                  label={p.isPrimary || i === 0 ? `${p.label} (principal)` : p.label}
                  value={p.phone}
                />
              ))}
              <DetailField label="Correo electrónico" value={borrower.email} />
            </dl>
          ) : (
            <dl className="detail-list">
              <DetailField label="Correo electrónico" value={borrower.email} />
            </dl>
          )}
        </section>

        <section className="card borrower-detail-section">
          <h3>Residencia</h3>
          <dl className="detail-list">
            <DetailField label="Dirección" value={residence} />
            <DetailField label="Barrio" value={borrower.neighborhood} />
            <DetailField label="Ciudad" value={borrower.city} />
          </dl>
        </section>

        <section className="card borrower-detail-section borrower-detail-section-wide">
          <h3>Información laboral</h3>
          {(borrower.workCompanyName || borrower.workContactName || workPhones.length || workAddresses.length) ? (
            <>
              <dl className="detail-list" style={{ marginBottom: '1rem' }}>
                <DetailField label="Empresa" value={borrower.workCompanyName} />
                <DetailField label="Jefe o contacto" value={borrower.workContactName} />
              </dl>
              {workPhones.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p className="borrower-detail-kicker" style={{ marginBottom: '0.5rem' }}>Teléfonos</p>
                  <dl className="detail-list">
                    {workPhones.map((p: any, i: number) => (
                      <DetailField
                        key={p.id || i}
                        label={p.isPrimary || i === 0 ? `${p.label} (principal)` : p.label}
                        value={p.phone}
                      />
                    ))}
                  </dl>
                </div>
              )}
              {workAddresses.length > 0 && (
                <div>
                  <p className="borrower-detail-kicker" style={{ marginBottom: '0.5rem' }}>Direcciones</p>
                  <dl className="detail-list">
                    {workAddresses.map((a: any, i: number) => (
                      <DetailField
                        key={a.id || i}
                        label={a.isPrimary || i === 0 ? `${a.label} (principal)` : a.label}
                        value={a.address}
                      />
                    ))}
                  </dl>
                </div>
              )}
            </>
          ) : (
            <p className="detail-empty">Sin información laboral registrada.</p>
          )}
        </section>

        <section className="card borrower-detail-section borrower-detail-section-wide">
          <h3>Referencias personales</h3>
          {references.length > 0 ? (
            <div className="reference-cards">
              {references.map((ref: any) => (
                <article key={ref.id} className="reference-card">
                  <p className="reference-name">{ref.fullName}</p>
                  <p className="reference-meta">{ref.relationship}</p>
                  <p className="reference-phone">{ref.phone}</p>
                  {ref.address && <p className="reference-address">{ref.address}</p>}
                </article>
              ))}
            </div>
          ) : (
            <p className="detail-empty">Sin referencias registradas.</p>
          )}
        </section>

        {activeLoans.length > 0 && (
          <section className="card borrower-detail-section borrower-detail-section-wide">
            <h3>Préstamos activos</h3>
            <div className="loan-summary-cards">
              {activeLoans.map((loan: any) => {
                const pendingInterest = loanPendingInterest(loan);
                return (
                  <article key={loan.id} className="loan-summary-card">
                    <p className="loan-summary-product">Préstamo</p>
                    <p className="loan-summary-label">Por cobrar</p>
                    <p className="loan-summary-value">{formatCop(Number(loan.currentBalance))}</p>
                    <dl className="loan-summary-meta">
                      <div>
                        <dt>Tasa</dt>
                        <dd>{formatInterestRate(loan.interestRate, loan.paymentFrequency)}</dd>
                      </div>
                      <div>
                        <dt>Interés pendiente</dt>
                        <dd className={pendingInterest > 0 ? 'loan-interest-due' : 'loan-interest-paid'}>
                          {formatCop(pendingInterest)}
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
