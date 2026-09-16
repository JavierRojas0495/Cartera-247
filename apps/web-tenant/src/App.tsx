import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { login, logout, getUser, isAuthenticated, api, formatCop, formatLoanCode, formatInterestRate, formatDailyLateRate, estimatePeriodInterest, formatPaymentFrequency, loanPendingInterest, loanCollectionStatus, type PaymentFrequency } from './api';
import { BorrowerFormPanel } from './BorrowerFormPanel';
import { useAppDialog, borrowerDeactivateBlockedContent } from './app-dialog';
import { LoanDetailView } from './LoanDetailView';
import { BorrowerDetailView, primaryBorrowerPhone } from './BorrowerDetailView';
import { getLogoutMessage } from './session';
import { useSessionTimeout } from './useSessionTimeout';
import { SessionTimeoutModal } from './SessionTimeoutModal';
import { DashboardContent } from './DashboardPage';

function SessionGuard({ children }: { children: React.ReactNode }) {
  const { showWarning, countdown, continueSession } = useSessionTimeout();

  return (
    <>
      {children}
      {showWarning && (
        <SessionTimeoutModal countdown={countdown} onContinue={continueSession} />
      )}
    </>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('dueno@demo.com');
  const [password, setPassword] = useState('Demo123!');
  const [error, setError] = useState('');
  const [sessionNotice, setSessionNotice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const message = getLogoutMessage();
    if (message) setSessionNotice(message);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="brand-mark">Cartera24/7</h1>
        <p className="brand-sub">Panel del prestamista — oficina y campo</p>
        {sessionNotice && <div className="session-notice">{sessionNotice}</div>}
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

function navActive(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = getUser();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryNav = [
    { to: '/', label: 'Inicio', ico: '⌂' },
    { to: '/borrowers', label: 'Clientes', ico: '◎' },
    { to: '/loans', label: 'Créditos', ico: '₡' },
    { to: '/payments', label: 'Pagos', ico: '⇢' },
  ];
  const moreNav = [
    { to: '/overdue', label: 'Mora' },
    { to: '/reports', label: 'Informes' },
  ];
  const allNav = [
    { to: '/', label: 'Dashboard' },
    { to: '/borrowers', label: 'Prestatarios' },
    { to: '/loans', label: 'Préstamos' },
    { to: '/payments', label: 'Pagos' },
    { to: '/overdue', label: 'Mora' },
    { to: '/reports', label: 'Informes' },
  ];

  useEffect(() => {
    setMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  return (
    <div className="layout">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="sidebar-brand">
          Cartera24/7
          <span>Panel prestamista</span>
        </div>
        <nav>
          {allNav.map((n) => (
            <Link key={n.to} to={n.to} className={navActive(location.pathname, n.to) ? 'active' : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-user">
          <strong>{user?.firstName} {user?.lastName}</strong>
          <button type="button" className="btn btn-secondary" style={{ width: '100%' }} onClick={() => logout()}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <header className="mobile-topbar">
        <div className="mobile-topbar-brand">Cartera24/7</div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Abrir menú"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen(true)}
        >
          ☰
        </button>
      </header>

      <main className="main">{children}</main>

      <nav className="bottom-nav" aria-label="Navegación móvil">
        {primaryNav.map((n) => (
          <Link key={n.to} to={n.to} className={navActive(location.pathname, n.to) ? 'active' : ''}>
            <span className="nav-ico" aria-hidden="true">{n.ico}</span>
            {n.label}
          </Link>
        ))}
        <button
          type="button"
          className={`bottom-nav-more${moreOpen || moreNav.some((n) => navActive(location.pathname, n.to)) ? ' active' : ''}`}
          onClick={() => setMoreOpen(true)}
        >
          <span className="nav-ico" aria-hidden="true">⋯</span>
          Más
        </button>
      </nav>

      <div
        className={`drawer-backdrop${moreOpen ? ' open' : ''}`}
        onClick={() => setMoreOpen(false)}
        aria-hidden={!moreOpen}
      />
      <aside className={`drawer${moreOpen ? ' open' : ''}`} aria-hidden={!moreOpen} aria-label="Más opciones">
        <h3>Más</h3>
        {moreNav.map((n) => (
          <Link key={n.to} to={n.to} className={navActive(location.pathname, n.to) ? 'active' : ''}>
            {n.label}
          </Link>
        ))}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--line)' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.65rem' }}>
            {user?.firstName} {user?.lastName}
          </p>
          <button type="button" className="drawer-link" onClick={() => logout()}>
            Cerrar sesión
          </button>
          <button type="button" className="drawer-link" onClick={() => setMoreOpen(false)}>
            Cerrar menú
          </button>
        </div>
      </aside>
    </div>
  );
}

function DashboardPage() {
  return (
    <Layout>
      <DashboardContent />
    </Layout>
  );
}

function borrowerListAddress(b: any): string {
  return b.residenceAddress || b.address || '—';
}

function borrowerStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Activo';
    case 'inactive': return 'Inactivo';
    case 'delinquent': return 'En mora';
    case 'blocked': return 'Bloqueado';
    default: return status;
  }
}

function borrowerStatusBadgeClass(status: string): string {
  if (status === 'active') return 'active';
  if (status === 'delinquent') return 'overdue';
  return 'inactive';
}

function BorrowersPage() {
  type ViewMode = 'list' | 'create' | 'edit' | 'view';

  const { alert, confirm } = useAppDialog();
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewMode>('list');
  const [selectedBorrower, setSelectedBorrower] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const reload = () => api<any[]>('/borrowers').then(setBorrowers);

  useEffect(() => {
    if (view === 'list') reload().catch(console.error);
  }, [view]);

  const loadBorrower = async (id: string) => {
    setLoadingDetail(true);
    try {
      const detail = await api<any>(`/borrowers/${id}`);
      setSelectedBorrower(detail);
      return detail;
    } catch (err) {
      console.error(err);
      setView('list');
      setSelectedBorrower(null);
      return null;
    } finally {
      setLoadingDetail(false);
    }
  };

  const openCreate = () => {
    setSelectedBorrower(null);
    setView('create');
  };

  const openView = (id: string) => {
    setView('view');
    loadBorrower(id);
  };

  const openEdit = async (id: string) => {
    setView('edit');
    await loadBorrower(id);
  };

  const backToList = () => {
    setView('list');
    setSelectedBorrower(null);
  };

  const onSaved = async () => {
    await reload();
    backToList();
  };

  const toggleStatus = async (b: any) => {
    const activeLoansCount = b.loans?.length ?? 0;
    const deactivating = b.status === 'active' || b.status === 'delinquent' || b.status === 'blocked';
    const nextStatus = deactivating ? 'inactive' : 'active';
    const name = `${b.firstName} ${b.lastName}`.trim();

    if (deactivating && activeLoansCount > 0) {
      await alert({
        title: 'No se puede desactivar',
        variant: 'warning',
        content: borrowerDeactivateBlockedContent(name, activeLoansCount),
      });
      return;
    }

    const confirmed = await confirm({
      title: deactivating ? 'Desactivar prestatario' : 'Reactivar prestatario',
      variant: deactivating ? 'warning' : 'info',
      confirmText: deactivating ? 'Desactivar' : 'Activar',
      cancelText: 'Cancelar',
      destructive: deactivating,
      content: deactivating ? (
        <>
          <p className="app-dialog-lead">
            ¿Deseas desactivar a <strong>{name}</strong>?
          </p>
          <p className="app-dialog-note">
            No podrá recibir nuevos préstamos mientras permanezca inactivo.
          </p>
        </>
      ) : (
        <p className="app-dialog-lead">
          ¿Deseas reactivar a <strong>{name}</strong>?
        </p>
      ),
    });
    if (!confirmed) return;

    setTogglingId(b.id);
    try {
      await api(`/borrowers/${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      await reload();
      await alert({
        title: deactivating ? 'Prestatario desactivado' : 'Prestatario activado',
        variant: 'success',
        content: (
          <p className="app-dialog-lead">
            <strong>{name}</strong>{' '}
            {deactivating ? 'fue desactivado correctamente.' : 'fue reactivado correctamente.'}
          </p>
        ),
      });
    } catch (err: any) {
      await alert({
        title: 'Error',
        variant: 'error',
        message: err.message || 'No se pudo cambiar el estado del prestatario.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const filteredBorrowers = borrowers.filter((b) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const fullName = `${b.firstName} ${b.lastName}`.toLowerCase();
    const doc = (b.documentNum || '').toLowerCase();
    return fullName.includes(q) || doc.includes(q);
  });

  const pageTitle = {
    list: 'Prestatarios',
    create: 'Nuevo prestatario',
    edit: 'Editar prestatario',
    view: 'Detalle del prestatario',
  }[view];

  return (
    <Layout>
      <div className="header">
        <h1>{pageTitle}</h1>
        {view === 'list' ? (
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo</button>
        ) : (
          <button className="btn btn-secondary" onClick={backToList}>← Volver al listado</button>
        )}
      </div>

      {view === 'create' && (
        <BorrowerFormPanel mode="create" onSuccess={onSaved} onCancel={backToList} />
      )}

      {loadingDetail && (view === 'view' || view === 'edit') && (
        <div className="card"><p>Cargando prestatario...</p></div>
      )}

      {view === 'view' && selectedBorrower && !loadingDetail && (
        <BorrowerDetailView
          borrower={selectedBorrower}
          onEdit={() => openEdit(selectedBorrower.id)}
        />
      )}

      {view === 'edit' && selectedBorrower && !loadingDetail && (
        <BorrowerFormPanel
          mode="edit"
          borrowerId={selectedBorrower.id}
          original={selectedBorrower}
          hasActiveLoans={(selectedBorrower.loans?.length ?? 0) > 0}
          onSuccess={onSaved}
          onCancel={backToList}
        />
      )}

      {view === 'list' && (
      <div className="card">
        <div className="borrower-search">
          <input
            type="search"
            placeholder="Buscar por nombre o cédula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar prestatario"
          />
          {search.trim() && (
            <span className="borrower-search-count">
              {filteredBorrowers.length} resultado{filteredBorrowers.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Estado</th>
              <th>Préstamos activos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredBorrowers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                  {search.trim() ? 'No hay prestatarios que coincidan con la búsqueda.' : 'No hay prestatarios registrados.'}
                </td>
              </tr>
            ) : filteredBorrowers.map((b) => {
              const activeLoansCount = b.loans?.length ?? 0;
              const canDeactivate = b.status === 'active' || b.status === 'delinquent' || b.status === 'blocked';
              const blockDeactivate = canDeactivate && activeLoansCount > 0;
              return (
              <tr key={b.id}>
                <td data-label="Documento">{b.documentType || 'CC'} {b.documentNum}</td>
                <td data-label="Nombre">{b.firstName} {b.lastName}</td>
                <td data-label="Teléfono">{primaryBorrowerPhone(b) || '—'}</td>
                <td data-label="Dirección">{borrowerListAddress(b)}</td>
                <td data-label="Estado">
                  <span className={`badge badge-${borrowerStatusBadgeClass(b.status)}`}>
                    {borrowerStatusLabel(b.status)}
                  </span>
                </td>
                <td data-label="Activos">{b.loans?.length ?? 0}</td>
                <td data-label="Acciones">
                  <div className="table-actions">
                    <button type="button" className="btn btn-primary" onClick={() => openView(b.id)}>
                      Ver
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => openEdit(b.id)} disabled={loadingDetail}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className={`btn ${canDeactivate ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => toggleStatus(b)}
                      disabled={togglingId === b.id}
                      title={
                        blockDeactivate
                          ? 'Debe saldar todos los préstamos activos antes de desactivar'
                          : undefined
                      }
                    >
                      {togglingId === b.id ? '...' : canDeactivate ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>
      )}
    </Layout>
  );
}

function LoansPage() {
  type ViewMode = 'list' | 'view' | 'edit';
  type ListScope = 'active' | 'paid_off';

  const { alert } = useAppDialog();
  const [loans, setLoans] = useState<any[]>([]);
  const [borrowers, setBorrowers] = useState<any[]>([]);
  const [listScope, setListScope] = useState<ListScope>('active');
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [form, setForm] = useState({
    borrowerId: '',
    principalAmount: 1000000,
    startDate: new Date().toISOString().split('T')[0],
    interestRatePercent: 3 as number | '',
    paymentFrequency: 'monthly' as PaymentFrequency,
  });
  const [editForm, setEditForm] = useState({
    principalAmount: 1000000,
    startDate: '',
    interestRatePercent: 3 as number | '',
    paymentFrequency: 'monthly' as PaymentFrequency,
    confirmPassword: '',
  });

  const effectiveFrequency = form.paymentFrequency;
  const effectiveRate =
    form.interestRatePercent !== '' ? Number(form.interestRatePercent) / 100 : null;
  const estimatedFirstInterest =
    effectiveRate != null
      ? estimatePeriodInterest(form.principalAmount, effectiveRate, effectiveFrequency)
      : null;

  useEffect(() => {
    if (view !== 'list') return;
    api<any[]>('/loans').then(setLoans).catch(console.error);
    api<any[]>('/borrowers').then(setBorrowers).catch(console.error);
  }, [view]);

  const openView = async (id: string) => {
    setView('view');
    setLoadingDetail(true);
    try {
      const detail = await api<any>(`/loans/${id}`);
      setSelectedLoan(detail);
    } catch (err) {
      console.error(err);
      setView('list');
      setSelectedLoan(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const openEdit = async (id: string) => {
    setView('edit');
    setLoadingDetail(true);
    setEditError('');
    try {
      const detail = await api<any>(`/loans/${id}`);
      if (detail.status !== 'active') {
        await alert({
          title: 'No se puede modificar',
          message: 'Solo los créditos activos se pueden editar.',
        });
        setView('list');
        setSelectedLoan(null);
        return;
      }
      setSelectedLoan(detail);
      setEditForm({
        principalAmount: Number(detail.principalAmount) || 0,
        startDate: new Date(detail.startDate).toISOString().slice(0, 10),
        interestRatePercent: Math.round(Number(detail.interestRate) * 10000) / 100,
        paymentFrequency: (detail.paymentFrequency || 'monthly') as PaymentFrequency,
        confirmPassword: '',
      });
    } catch (err) {
      console.error(err);
      setView('list');
      setSelectedLoan(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const backToList = () => {
    setView('list');
    setSelectedLoan(null);
    setShowForm(false);
    setEditError('');
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.interestRatePercent === '') return;
    await api('/loans', {
      method: 'POST',
      body: JSON.stringify({
        borrowerId: form.borrowerId,
        principalAmount: Number(form.principalAmount),
        startDate: form.startDate,
        paymentFrequency: form.paymentFrequency,
        interestRate: Number(form.interestRatePercent) / 100,
      }),
    });
    setShowForm(false);
    setForm({
      borrowerId: '',
      principalAmount: 1000000,
      startDate: new Date().toISOString().split('T')[0],
      interestRatePercent: 3,
      paymentFrequency: 'monthly',
    });
    setLoans(await api<any[]>('/loans'));
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan || editForm.interestRatePercent === '') return;
    if (!editForm.confirmPassword.trim()) {
      setEditError('Ingresa tu contraseña para confirmar la modificación.');
      return;
    }
    setSavingEdit(true);
    setEditError('');
    try {
      const updated = await api<any>(`/loans/${selectedLoan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          principalAmount: Number(editForm.principalAmount),
          startDate: editForm.startDate,
          paymentFrequency: editForm.paymentFrequency,
          interestRate: Number(editForm.interestRatePercent) / 100,
          confirmPassword: editForm.confirmPassword,
        }),
      });
      setSelectedLoan(updated);
      setView('view');
      setEditForm((prev) => ({ ...prev, confirmPassword: '' }));
      await alert({
        title: 'Crédito actualizado',
        message: 'Los cambios quedaron guardados y el interés pendiente se recalculó.',
      });
    } catch (err: any) {
      setEditError(err?.message || 'No se pudo guardar el crédito.');
    } finally {
      setSavingEdit(false);
    }
  };

  const editBalancePreview = selectedLoan
    ? Math.max(
        0,
        Number(selectedLoan.currentBalance) +
          (Number(editForm.principalAmount) - Number(selectedLoan.principalAmount)),
      )
    : 0;

  const editEstimatedInterest =
    editForm.interestRatePercent !== ''
      ? estimatePeriodInterest(
          editBalancePreview,
          Number(editForm.interestRatePercent) / 100,
          editForm.paymentFrequency,
        )
      : null;

  const activeLoans = loans.filter((l) => l.status === 'active');
  const paidOffLoans = loans.filter((l) => l.status === 'paid_off');
  const visibleLoans = listScope === 'active' ? activeLoans : paidOffLoans;

  return (
    <Layout>
      <div className="header">
        <h1>
          {view === 'view' ? 'Detalle del crédito' : view === 'edit' ? 'Modificar crédito' : 'Préstamos'}
        </h1>
        {view === 'list' ? (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Nuevo préstamo</button>
        ) : (
          <div className="header-actions">
            {view === 'view' && selectedLoan?.status === 'active' && (
              <button className="btn btn-secondary" type="button" onClick={() => openEdit(selectedLoan.id)}>
                Modificar
              </button>
            )}
            <button className="btn btn-secondary" onClick={backToList}>← Volver al listado</button>
          </div>
        )}
      </div>

      {(view === 'view' || view === 'edit') && loadingDetail && (
        <div className="card"><p>Cargando historial del crédito...</p></div>
      )}

      {view === 'view' && selectedLoan && !loadingDetail && (
        <LoanDetailView loan={selectedLoan} />
      )}

      {view === 'edit' && selectedLoan && !loadingDetail && (
        <div className="card">
          <p className="form-note" style={{ marginBottom: '1rem' }}>
            Editando crédito de <strong>{selectedLoan.borrower?.firstName} {selectedLoan.borrower?.lastName}</strong>.
            Si cambias el valor prestado, <strong>Por cobrar</strong> se ajusta en la misma diferencia (se conservan los abonos a capital ya hechos).
          </p>
          <form onSubmit={saveEdit}>
            <div className="form-row">
              <div className="form-group">
                <label>Valor prestado (COP)</label>
                <input
                  type="number"
                  required
                  min={1}
                  step={1}
                  value={editForm.principalAmount}
                  onChange={(e) =>
                    setEditForm({ ...editForm, principalAmount: Number(e.target.value) })
                  }
                />
                <p className="loan-stat-hint" style={{ marginTop: '0.35rem' }}>
                  Por cobrar quedaría en {formatCop(editBalancePreview)}
                </p>
              </div>
              <div className="form-group">
                <label>Fecha de desembolso</label>
                <input
                  type="date"
                  required
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tasa del ciclo (%)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={editForm.interestRatePercent}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      interestRatePercent: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="form-group">
                <label>Frecuencia de cobro</label>
                <select
                  value={editForm.paymentFrequency}
                  onChange={(e) =>
                    setEditForm({ ...editForm, paymentFrequency: e.target.value as PaymentFrequency })
                  }
                >
                  <option value="daily">Diario</option>
                  <option value="weekly">Semanal</option>
                  <option value="biweekly">Cada 15 días</option>
                  <option value="monthly">Mensual</option>
                </select>
              </div>
            </div>
            {editEstimatedInterest != null && (
              <p className="loan-interest-preview-meta" style={{ marginBottom: '1rem' }}>
                Interés estimado por ciclo con el saldo actual:{' '}
                <strong>{formatCop(editEstimatedInterest)}</strong>
              </p>
            )}
            <div className="form-group" style={{ maxWidth: 360 }}>
              <label>Tu contraseña (obligatoria)</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={editForm.confirmPassword}
                onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                placeholder="Confirma para guardar"
              />
            </div>
            {editError && <div className="error" style={{ marginBottom: '0.75rem' }}>{editError}</div>}
            <div className="header-actions">
              <button className="btn btn-primary" type="submit" disabled={savingEdit}>
                {savingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={savingEdit}
                onClick={() => {
                  setView('view');
                  setEditError('');
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {view === 'list' && showForm && (
        <div className="card">
          <form onSubmit={create}>
            <div className="form-row">
              <div className="form-group">
                <label>Prestatario</label>
                <select required value={form.borrowerId} onChange={(e) => setForm({ ...form, borrowerId: e.target.value })}>
                  <option value="">Seleccionar...</option>
                  {borrowers.map((b) => <option key={b.id} value={b.id}>{b.firstName} {b.lastName}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Dinero prestado (COP)</label>
                <input type="number" required min={1} value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: Number(e.target.value) })} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Tasa de interés (%)</label>
                <input
                  type="number"
                  required
                  min={0}
                  step={0.01}
                  placeholder="Ej. 3"
                  value={form.interestRatePercent}
                  onChange={(e) => setForm({
                    ...form,
                    interestRatePercent: e.target.value === '' ? '' : Number(e.target.value),
                  })}
                />
                <span className="field-hint">
                  Se aplica por ciclo según la frecuencia de cobro
                </span>
              </div>
              <div className="form-group">
                <label>Frecuencia de cobro</label>
                <select
                  required
                  value={form.paymentFrequency}
                  onChange={(e) =>
                    setForm({ ...form, paymentFrequency: e.target.value as PaymentFrequency })
                  }
                >
                  <option value="daily">Diario</option>
                  <option value="biweekly">Cada 15 días</option>
                  <option value="monthly">Mensual</option>
                  <option value="weekly">Semanal</option>
                </select>
                <span className="field-hint">
                  Define cada cuánto se cobra el interés del ciclo
                </span>
              </div>
              <div className="form-group">
                <label>Fecha de desembolso</label>
                <input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
            </div>
            {effectiveRate != null && estimatedFirstInterest != null && (
              <div className="loan-interest-preview">
                <p>
                  <strong>Interés estimado del ciclo:</strong> {formatCop(estimatedFirstInterest)}
                  {' · '}
                  <span className="loan-interest-preview-meta">
                    {formatInterestRate(effectiveRate, effectiveFrequency)} sobre {formatCop(form.principalAmount)}
                  </span>
                </p>
              </div>
            )}
            <p className="form-note">
              Sin plazo fijo: el prestatario paga intereses sobre el saldo y puede abonar a capital en cualquier momento hasta saldar la deuda.
              La tasa es del ciclo de cobro (ej. 3% diario cobra 3% cada día; 3% mensual cobra 3% cada mes).
            </p>
            <button className="btn btn-primary" type="submit">Crear préstamo</button>
          </form>
        </div>
      )}

      {view === 'list' && (
      <>
      <div className="list-scope" role="tablist" aria-label="Alcance del listado">
        <button
          type="button"
          role="tab"
          aria-selected={listScope === 'active'}
          className={`list-scope-btn${listScope === 'active' ? ' is-active' : ''}`}
          onClick={() => setListScope('active')}
        >
          En cartera
          <span className="list-scope-count">{activeLoans.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={listScope === 'paid_off'}
          className={`list-scope-btn${listScope === 'paid_off' ? ' is-active' : ''}`}
          onClick={() => setListScope('paid_off')}
        >
          Saldados
          <span className="list-scope-count">{paidOffLoans.length}</span>
        </button>
      </div>
      <div className="card table-scroll">
        <table className="loans-table responsive-table">
          <thead>
            <tr>
              <th>ID crédito</th>
              <th>Prestatario</th>
              <th title="Dinero entregado al prestatario">Prestado</th>
              <th>Tasa</th>
              <th>Cobro</th>
              {listScope === 'active' ? (
                <>
                  <th>Interés pendiente</th>
                  <th title="Si el crédito tiene cortes vencidos sin pagar">Cobranza</th>
                  <th>Desembolso</th>
                </>
              ) : (
                <>
                  <th>Desembolso</th>
                  <th>Saldado</th>
                </>
              )}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visibleLoans.length === 0 ? (
              <tr>
                <td colSpan={listScope === 'active' ? 9 : 8} style={{ textAlign: 'center', color: 'var(--muted)', padding: '2rem' }}>
                  {listScope === 'active'
                    ? 'No hay créditos en cartera.'
                    : 'Aún no hay créditos saldados.'}
                </td>
              </tr>
            ) : visibleLoans.map((l) => {
              const pendingInterest = loanPendingInterest(l);
              const collection = loanCollectionStatus(l);
              return (
                <tr key={l.id}>
                  <td data-label="ID crédito">
                    <code className="loan-code">{formatLoanCode(l)}</code>
                  </td>
                  <td data-label="Prestatario">{l.borrower?.firstName} {l.borrower?.lastName}</td>
                  <td data-label="Prestado">{formatCop(l.principalAmount)}</td>
                  <td data-label="Tasa">{formatInterestRate(l.interestRate, l.paymentFrequency)}</td>
                  <td data-label="Cobro">{formatPaymentFrequency(l.paymentFrequency)}</td>
                  {listScope === 'active' ? (
                    <>
                      <td data-label="Interés pend.">
                        <span className={pendingInterest > 0 ? 'loan-interest-due' : 'loan-interest-paid'}>
                          {formatCop(pendingInterest)}
                        </span>
                      </td>
                      <td data-label="Cobranza">
                        <span className={`badge badge-${collection.badge}`}>{collection.label}</span>
                      </td>
                      <td data-label="Desembolso">{new Date(l.startDate).toLocaleDateString('es-CO')}</td>
                    </>
                  ) : (
                    <>
                      <td data-label="Desembolso">{new Date(l.startDate).toLocaleDateString('es-CO')}</td>
                      <td data-label="Saldado">
                        {l.endDate
                          ? new Date(l.endDate).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                    </>
                  )}
                  <td data-label="Acciones">
                    <div className="table-actions">
                      <button type="button" className="btn btn-primary" onClick={() => openView(l.id)}>
                        Ver
                      </button>
                      {l.status === 'active' && (
                        <button type="button" className="btn btn-secondary" onClick={() => openEdit(l.id)}>
                          Modificar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
    </Layout>
  );
}

function PaymentsPage() {
  const { alert, confirm } = useAppDialog();
  const [payments, setPayments] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [debtSummary, setDebtSummary] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<any>(null);
  const emptyForm = () => ({
    loanId: '',
    amount: 30000,
    paymentDate: new Date().toISOString().split('T')[0],
    method: 'cash',
    chargeLateFee: false,
    lateFeeAmount: '' as number | '',
  });
  const [form, setForm] = useState(emptyForm());

  const openNewPaymentForm = () => {
    setForm(emptyForm());
    setDebtSummary(null);
    setSuccessMessage(null);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setForm(emptyForm());
    setDebtSummary(null);
  };

  useEffect(() => {
    api<any[]>('/payments').then(setPayments).catch(console.error);
    api<any[]>('/loans').then(setLoans).catch(console.error);
  }, []);

  useEffect(() => {
    if (!showForm || !form.loanId) {
      if (!form.loanId) setDebtSummary(null);
      return;
    }
    api<any>(`/loans/${form.loanId}/debt-summary?asOf=${form.paymentDate}`)
      .then((summary) => {
        setDebtSummary(summary);
        if (!summary.canChargeLateFee) {
          setForm((current) => ({ ...current, chargeLateFee: false, lateFeeAmount: '' }));
        }
      })
      .catch(console.error);
  }, [form.loanId, form.paymentDate, showForm]);

  const paymentPreview = (() => {
    if (!debtSummary) return null;
    let remaining = Number(form.amount) || 0;
    const toInterest = Math.min(remaining, Number(debtSummary.pendingInterest) || 0);
    remaining -= toInterest;
    const lateCap = form.chargeLateFee && debtSummary.canChargeLateFee ? Number(form.lateFeeAmount) || 0 : 0;
    const toLateFee = Math.min(remaining, lateCap);
    remaining -= toLateFee;
    const toPrincipal = Math.min(remaining, Number(debtSummary.principalBalance) || 0);
    return { toInterest, toLateFee, toPrincipal };
  })();

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (debtSummary?.canChargeLateFee && form.chargeLateFee && !(Number(form.lateFeeAmount) > 0)) {
      await alert({
        title: 'Valor de mora',
        variant: 'warning',
        message: 'Indica el valor de mora a cobrar, o desmarca el cobro para registrar el pago normal.',
      });
      return;
    }

    if (debtSummary?.canChargeLateFee && !form.chargeLateFee) {
      const proceed = await confirm({
        title: 'Crédito con días de mora',
        variant: 'warning',
        confirmText: 'Pago normal',
        cancelText: 'Volver',
        content: (
          <>
            <p className="app-dialog-lead">
              Este crédito tiene <strong>{debtSummary.daysOverdue} día{debtSummary.daysOverdue === 1 ? '' : 's'} de atraso</strong>.
            </p>
            <p className="app-dialog-note">
              Puedes volver y marcar <strong>Cobrar mora</strong> con el valor acordado con el cliente, o continuar con el pago normal de intereses y capital.
            </p>
          </>
        ),
      });
      if (!proceed) return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        loanId: form.loanId,
        amount: Number(form.amount),
        paymentDate: form.paymentDate,
        method: form.method,
      };
      if (debtSummary?.canChargeLateFee && form.chargeLateFee) {
        payload.chargeLateFee = true;
        payload.lateFeeAmount = Number(form.lateFeeAmount);
      }
      const res = await api<any>('/payments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSuccessMessage(res.result);
      setShowForm(false);
      setForm(emptyForm());
      setDebtSummary(null);
      setPayments(await api<any[]>('/payments'));
      setLoans(await api<any[]>('/loans'));
    } catch (err: any) {
      await alert({
        title: 'Error al registrar pago',
        variant: 'error',
        message: err.message || 'No se pudo registrar el pago. Intenta de nuevo.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="header">
        <h1>Pagos</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={openNewPaymentForm}>+ Registrar pago</button>
        )}
      </div>
      {successMessage && (
        <div className="card" style={{ background: '#ecfdf5', border: '1px solid #86efac' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <strong>Pago registrado correctamente</strong>
            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}
              onClick={() => setSuccessMessage(null)}>Cerrar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.75rem', fontSize: '0.875rem' }}>
            <div>Monto pagado:</div><div>{formatCop(successMessage.paidAmount)}</div>
            <div>A intereses:</div><div>{formatCop(successMessage.appliedToInterest)}</div>
            {successMessage.appliedToLateFee > 0 && (
              <><div>A mora:</div><div>{formatCop(successMessage.appliedToLateFee)}</div></>
            )}
            <div>A capital:</div><div>{formatCop(successMessage.appliedToPrincipal)}</div>
            <div>Faltó por intereses:</div><div><strong style={{ color: successMessage.interestRemaining > 0 ? '#dc2626' : '#166534' }}>{formatCop(successMessage.interestRemaining)}</strong></div>
            <div>Nuevo saldo capital:</div><div>{formatCop(successMessage.newPrincipalBalance)}</div>
            <div>Deuda total restante:</div><div><strong>{formatCop(successMessage.totalDebtRemaining)}</strong></div>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
            Para registrar otro pago, use el botón &quot;+ Registrar pago&quot;.
          </p>
        </div>
      )}
      {showForm && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <strong>Nuevo registro de pago</strong>
            <button type="button" className="btn btn-secondary" onClick={cancelForm} disabled={submitting}>Cancelar</button>
          </div>
          <form onSubmit={create}>
            <div className="form-group">
              <label>Préstamo</label>
              <select required value={form.loanId} disabled={submitting} onChange={(e) => {
                const id = e.target.value;
                setForm({ ...form, loanId: id });
              }}>
                <option value="">Seleccionar...</option>
                {loans.filter((l) => l.status === 'active').map((l) => (
                  <option key={l.id} value={l.id}>
                    {formatLoanCode(l)} — {l.borrower?.firstName} {l.borrower?.lastName} — {formatCop(l.currentBalance)}
                  </option>
                ))}
              </select>
            </div>
            {debtSummary && (
              <div className="payment-debt-box">
                <strong>
                  Estado de deuda — {debtSummary.loanCode ? `${debtSummary.loanCode} · ` : ''}
                  {debtSummary.borrowerName}
                </strong>
                <div className="payment-debt-grid">
                  <div>Por cobrar:</div><div><strong>{formatCop(debtSummary.principalBalance)}</strong></div>
                  <div>Interés pendiente:</div><div><strong>{formatCop(debtSummary.pendingInterest)}</strong></div>
                  <div>Mínimo a pagar ahora:</div><div><strong>{formatCop(debtSummary.minimumDueThisPeriod)}</strong></div>
                  <div>Deuda total:</div><div><strong style={{ color: '#2563eb' }}>{formatCop(debtSummary.totalDebt)}</strong></div>
                </div>
                {debtSummary.cutoffDate && (
                  <p className="payment-debt-note">
                    Fecha de corte: {new Date(debtSummary.cutoffDate).toLocaleDateString('es-CO')}.
                    {debtSummary.unpaidCycles > 1
                      ? ` Hay ${debtSummary.unpaidCycles} meses de interés por cubrir.`
                      : ' Si paga de más estando al día, el excedente baja el capital.'}
                  </p>
                )}
              </div>
            )}
            {debtSummary?.isOverdue && !debtSummary.canChargeLateFee && (
              <div className="payment-mora-settled">
                <p>
                  Este crédito sigue con interés pendiente, pero la mora de{' '}
                  <strong>{debtSummary.daysAlreadyCharged || debtSummary.daysOverdue} día{(debtSummary.daysAlreadyCharged || debtSummary.daysOverdue) === 1 ? '' : 's'}</strong>
                  {debtSummary.moraSettledOn
                    ? ` ya se cobró el ${new Date(debtSummary.moraSettledOn).toLocaleDateString('es-CO')}`
                    : ' ya se cobró'}
                  . No se vuelve a cobrar esos días aunque aún falte un mes o varios meses vencidos.
                </p>
              </div>
            )}
            {debtSummary?.canChargeLateFee && (
              <div className="payment-mora-box">
                <p>
                  Este crédito tiene <strong>{debtSummary.daysOverdue} día{debtSummary.daysOverdue === 1 ? '' : 's'} de atraso</strong>.
                  {debtSummary.daysAlreadyCharged > 0
                    ? ` Ya se cobró mora de ${debtSummary.daysAlreadyCharged} día${debtSummary.daysAlreadyCharged === 1 ? '' : 's'}${debtSummary.moraSettledOn ? ` el ${new Date(debtSummary.moraSettledOn).toLocaleDateString('es-CO')}` : ''}. Solo aplicarían ${debtSummary.chargeableLateDays} día${debtSummary.chargeableLateDays === 1 ? '' : 's'} nuevo${debtSummary.chargeableLateDays === 1 ? '' : 's'}.`
                    : ' ¿Deseas cobrar un interés de mora en este pago?'}
                </p>
                <p className="payment-mora-rate">
                  Tasa de mora: <strong>{formatDailyLateRate(debtSummary.lateFeeDailyRate)}</strong>
                  {debtSummary.graceDays > 0 ? ` · ${debtSummary.graceDays} día${debtSummary.graceDays === 1 ? '' : 's'} de gracia` : ''}
                  {debtSummary.daysAlreadyCharged > 0
                    ? ' · el recargo fijo ya no se vuelve a aplicar'
                    : debtSummary.fixedPenalty > 0 ? ` · recargo fijo ${formatCop(debtSummary.fixedPenalty)}` : ''}
                </p>
                <label className="payment-mora-check">
                  <input
                    type="checkbox"
                    disabled={submitting}
                    checked={form.chargeLateFee}
                    onChange={(e) => setForm({
                      ...form,
                      chargeLateFee: e.target.checked,
                      lateFeeAmount: e.target.checked ? (form.lateFeeAmount || debtSummary.suggestedLateFee || '') : '',
                    })}
                  />
                  Cobrar mora{debtSummary.daysAlreadyCharged > 0 ? ' de días nuevos' : ''}
                </label>
                {form.chargeLateFee && (
                  <div className="form-group" style={{ marginBottom: 0, marginTop: '0.75rem' }}>
                    <label>Valor de mora (COP)</label>
                    <input
                      type="number"
                      min={1}
                      disabled={submitting}
                      value={form.lateFeeAmount}
                      onChange={(e) => setForm({
                        ...form,
                        lateFeeAmount: e.target.value === '' ? '' : Number(e.target.value),
                      })}
                    />
                    {debtSummary.suggestedLateFee > 0 && (
                      <span className="field-hint">
                        Sugerido: {formatCop(debtSummary.suggestedLateFee)} = interés pendiente × {formatDailyLateRate(debtSummary.lateFeeDailyRate)} × {debtSummary.chargeableLateDays} día{debtSummary.chargeableLateDays === 1 ? '' : 's'}
                        {debtSummary.daysAlreadyCharged > 0
                          ? ''
                          : debtSummary.fixedPenalty > 0 ? ` + ${formatCop(debtSummary.fixedPenalty)} de recargo fijo` : ''}
                        . Puedes dejar el valor acordado con el cliente.
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="form-group">
              <label>Monto a pagar (COP)</label>
              <input type="number" required disabled={submitting} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              {debtSummary && !submitting && (
                <button type="button" className="btn btn-secondary" style={{ marginTop: '0.5rem' }}
                  onClick={() => setForm({ ...form, amount: debtSummary.minimumDueThisPeriod })}>
                  Usar mínimo a pagar ({formatCop(debtSummary.minimumDueThisPeriod)})
                </button>
              )}
            </div>
            {paymentPreview && form.loanId && (
              <div className="payment-preview">
                <p><strong>Este pago se aplicaría así</strong></p>
                <div className="payment-debt-grid">
                  <div>A interés:</div><div>{formatCop(paymentPreview.toInterest)}</div>
                  {paymentPreview.toLateFee > 0 && (<><div>A mora:</div><div>{formatCop(paymentPreview.toLateFee)}</div></>)}
                  <div>A capital:</div><div>{formatCop(paymentPreview.toPrincipal)}</div>
                </div>
              </div>
            )}
            <div className="form-group"><label>Fecha</label><input type="date" required disabled={submitting} value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} /></div>
            <div className="form-group">
              <label>Método</label>
              <select disabled={submitting} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting || !form.loanId}>
              {submitting ? 'Registrando...' : 'Registrar pago'}
            </button>
          </form>
        </div>
      )}
      <div className="card table-scroll">
        <table className="responsive-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>ID crédito</th>
              <th>Prestatario</th>
              <th>Pagó</th>
              <th>Interés</th>
              <th>Capital</th>
              <th>Saldo después</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => {
              const alloc = p.allocations?.[0];
              return (
              <tr key={p.id}>
                <td data-label="Fecha">{new Date(p.paymentDate).toLocaleDateString('es-CO')}</td>
                <td data-label="ID crédito">
                  <code className="loan-code">{formatLoanCode(p.loan)}</code>
                </td>
                <td data-label="Prestatario">{p.loan?.borrower?.firstName} {p.loan?.borrower?.lastName}</td>
                <td data-label="Pagó">{formatCop(p.amount)}</td>
                <td data-label="Interés">{formatCop(alloc?.toInterest ?? 0)}</td>
                <td data-label="Capital">{formatCop(alloc?.toPrincipal ?? 0)}</td>
                <td data-label="Saldo">{p.result ? formatCop(p.result.newPrincipalBalance) : '—'}</td>
                <td data-label="Estado"><span className={`badge badge-${p.status === 'accepted' ? 'active' : 'inactive'}`}>{p.status}</span></td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function OverduePage() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/overdue').then(setEvents).catch(console.error); }, []);

  const approve = async (id: string) => {
    await api(`/overdue/${id}/approve`, { method: 'POST' });
    setEvents(await api<any[]>('/overdue'));
  };

  const waive = async (id: string) => {
    const reason = prompt('Motivo de condonación:');
    if (!reason) return;
    await api(`/overdue/${id}/waive`, { method: 'POST', body: JSON.stringify({ reason }) });
    setEvents(await api<any[]>('/overdue'));
  };

  return (
    <Layout>
      <div className="header"><h1>Mora</h1></div>
      <div className="card table-scroll">
        <table className="responsive-table">
          <thead><tr><th>ID crédito</th><th>Prestatario</th><th>Ciclo</th><th>Días mora</th><th>Mora calculada</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td data-label="ID crédito"><code className="loan-code">{formatLoanCode(e.installment?.loan)}</code></td>
                <td data-label="Prestatario">{e.installment?.loan?.borrower?.firstName} {e.installment?.loan?.borrower?.lastName}</td>
                <td data-label="Ciclo">#{e.installment?.installmentNumber}</td>
                <td data-label="Días">{e.daysOverdue}</td>
                <td data-label="Mora">{formatCop(e.calculatedFee)}</td>
                <td data-label="Estado"><span className="badge badge-overdue">{e.status}</span></td>
                <td data-label="Acciones">
                  {e.status === 'pending_review' && (
                    <div className="table-actions">
                      <button type="button" className="btn btn-primary" onClick={() => approve(e.id)}>Aprobar</button>
                      <button type="button" className="btn btn-secondary" onClick={() => waive(e.id)}>Condonar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function ReportsPage() {
  const [tab, setTab] = useState<'portfolio' | 'debt' | 'clients'>('portfolio');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const endpoints = { portfolio: '/reports/portfolio', debt: '/reports/debt', clients: '/reports/clients' };
    api<any>(endpoints[tab]).then(setData).catch(console.error);
  }, [tab]);

  return (
    <Layout>
      <div className="header"><h1>Informes</h1></div>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        {(['portfolio', 'debt', 'clients'] as const).map((t) => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)}>
            {t === 'portfolio' ? 'Cartera' : t === 'debt' ? 'Deuda' : 'Clientes'}
          </button>
        ))}
      </div>
      <div className="card">
        {tab === 'portfolio' && data && (
          <div className="stats">
            <div className="stat"><div className="label">Cartera activa</div><div className="value">{formatCop(data.totalOutstanding)}</div></div>
            <div className="stat"><div className="label">Préstamos</div><div className="value">{data.activeLoansCount}</div></div>
            <div className="stat"><div className="label">Cobrado</div><div className="value">{formatCop(data.totalCollected)}</div></div>
          </div>
        )}
        {tab === 'debt' && Array.isArray(data) && (
          <table>
            <thead><tr><th>Prestatario</th><th>Documento</th><th>Saldo</th><th>Tasa</th></tr></thead>
            <tbody>
              {data.map((l: any) => (
                <tr key={l.id}>
                  <td>{l.borrower?.firstName} {l.borrower?.lastName}</td>
                  <td>{l.borrower?.documentNum}</td>
                  <td>{formatCop(l.currentBalance)}</td>
                  <td>{formatInterestRate(l.interestRate, l.paymentFrequency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'clients' && Array.isArray(data) && (
          <table>
            <thead><tr><th>Nombre</th><th>Documento</th><th>Teléfono</th><th>Préstamos</th><th>Estado</th></tr></thead>
            <tbody>
              {data.map((b: any) => (
                <tr key={b.id}>
                  <td>{b.firstName} {b.lastName}</td>
                  <td>{b.documentNum}</td>
                  <td>{primaryBorrowerPhone(b) || '—'}</td>
                  <td>{b._count?.loans ?? 0}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user || !isAuthenticated()) return <Navigate to="/login" replace />;
  if (user.isPlatformAdmin) return <Navigate to="/login" replace />;
  return <SessionGuard>{children}</SessionGuard>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/borrowers" element={<ProtectedRoute><BorrowersPage /></ProtectedRoute>} />
      <Route path="/loans" element={<ProtectedRoute><LoansPage /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
      <Route path="/overdue" element={<ProtectedRoute><OverduePage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
    </Routes>
  );
}
