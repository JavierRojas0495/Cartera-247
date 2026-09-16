import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, formatCop } from './api';

type MonthPoint = { month: string; label: string; amount: number };
type Allocation = { interest: number; lateFee: number; principal: number };
type PortfolioSummary = {
  activeLoansCount: number;
  totalOutstanding: number;
  totalPrincipal: number;
  activeBorrowers: number;
  overdueLoans: number;
  overdueInstallments?: number;
  totalPendingInterest: number;
  totalCollected: number;
  collectionsByMonth: MonthPoint[];
  allocationTotals: Allocation;
};

function CollectionsBarChart({ points }: { points: MonthPoint[] }) {
  const max = Math.max(...points.map((p) => p.amount), 1);
  const w = 360;
  const h = 160;
  const padX = 12;
  const padTop = 16;
  const padBottom = 28;
  const gap = 10;
  const barW = (w - padX * 2 - gap * (points.length - 1)) / points.length;
  const chartH = h - padTop - padBottom;

  return (
    <svg className="dash-chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Cobros de los últimos meses">
      <line x1={padX} y1={h - padBottom} x2={w - padX} y2={h - padBottom} className="dash-chart-axis" />
      {points.map((p, i) => {
        const barH = Math.max((p.amount / max) * chartH, p.amount > 0 ? 4 : 0);
        const x = padX + i * (barW + gap);
        const y = h - padBottom - barH;
        return (
          <g key={p.month}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              className={p.amount > 0 ? 'dash-bar' : 'dash-bar is-empty'}
            />
            <text x={x + barW / 2} y={h - 8} textAnchor="middle" className="dash-chart-label">
              {p.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function AllocationBars({ totals }: { totals: Allocation }) {
  const rows = [
    { key: 'interest', label: 'Interés', value: totals.interest, tone: 'accent' as const },
    { key: 'lateFee', label: 'Mora', value: totals.lateFee, tone: 'warn' as const },
    { key: 'principal', label: 'Capital', value: totals.principal, tone: 'info' as const },
  ];
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = rows.reduce((a, r) => a + r.value, 0);

  if (sum === 0) {
    return <p className="dash-empty">Aún no hay pagos aceptados para desglosar.</p>;
  }

  return (
    <ul className="dash-alloc">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="dash-alloc-meta">
            <span>{r.label}</span>
            <strong>{formatCop(r.value)}</strong>
          </div>
          <div className="dash-alloc-track" aria-hidden>
            <span
              className={`dash-alloc-fill tone-${r.tone}`}
              style={{ width: `${Math.max((r.value / max) * 100, r.value > 0 ? 4 : 0)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Contenido del inicio (sin Layout; App lo envuelve). */
export function DashboardContent() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([api<PortfolioSummary>('/reports/portfolio'), api<any[]>('/overdue/alerts')])
      .then(([portfolio, overdueAlerts]) => {
        if (!alive) return;
        setSummary(portfolio);
        setAlerts(overdueAlerts);
        setError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'No se pudo cargar el inicio');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const monthPoints = useMemo(() => summary?.collectionsByMonth ?? [], [summary]);
  const monthTotal = useMemo(() => monthPoints.reduce((a, p) => a + p.amount, 0), [monthPoints]);

  return (
    <>
      <div className="header">
        <h1>Inicio</h1>
        <Link to="/payments" className="btn btn-primary">
          Registrar pago
        </Link>
      </div>

      {loading && (
        <div className="dash-skeleton" aria-busy="true" aria-label="Cargando cartera">
          <div className="skel skel-hero" />
          <div className="skel-row">
            <div className="skel" />
            <div className="skel" />
            <div className="skel" />
            <div className="skel" />
          </div>
          <div className="skel-row skel-charts">
            <div className="skel skel-panel" />
            <div className="skel skel-panel" />
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="card dash-error" role="alert">
          <p>{error}</p>
        </div>
      )}

      {!loading && summary && (
        <div className="dash">
          <section className="dash-hero">
            <div className="dash-hero-main">
              <h2 className="dash-hero-label">Por cobrar</h2>
              <p className="dash-hero-value">{formatCop(summary.totalOutstanding)}</p>
              <p className="dash-hero-sub">
                Prestado {formatCop(summary.totalPrincipal)} · {summary.activeLoansCount} préstamos activos
              </p>
            </div>
            <div className="dash-hero-side">
              <div>
                <span className="dash-side-label">Interés pendiente</span>
                <strong className="dash-side-value">{formatCop(summary.totalPendingInterest ?? 0)}</strong>
              </div>
              <div>
                <span className="dash-side-label">Cobrado</span>
                <strong className="dash-side-value">{formatCop(summary.totalCollected)}</strong>
              </div>
              <div>
                <span className="dash-side-label">Prestatarios</span>
                <strong className="dash-side-value">{summary.activeBorrowers}</strong>
              </div>
              <div className={summary.overdueLoans > 0 ? 'is-warn' : undefined}>
                <span className="dash-side-label">Créditos en mora</span>
                <strong className="dash-side-value">{summary.overdueLoans}</strong>
              </div>
            </div>
          </section>

          <section className="dash-grid">
            <article className="dash-panel">
              <header className="dash-panel-head">
                <h2>Cobros recientes</h2>
                <span className="dash-panel-meta">{formatCop(monthTotal)} en 6 meses</span>
              </header>
              {monthTotal === 0 ? (
                <p className="dash-empty">Sin cobros en los últimos meses. Registra el primero desde Pagos.</p>
              ) : (
                <CollectionsBarChart points={monthPoints} />
              )}
            </article>

            <article className="dash-panel">
              <header className="dash-panel-head">
                <h2>Destino de los pagos</h2>
                <span className="dash-panel-meta">Interés → mora → capital</span>
              </header>
              <AllocationBars totals={summary.allocationTotals} />
            </article>
          </section>

          <section className="dash-panel dash-alerts">
            <header className="dash-panel-head">
              <h2>Alertas de mora</h2>
              <Link to="/overdue" className="dash-link">
                Ver todas
              </Link>
            </header>
            {alerts.length === 0 ? (
              <p className="dash-empty">Sin créditos en mora. La cartera está al día.</p>
            ) : (
              <ul className="dash-alert-list">
                {alerts.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <strong>{a.title}</strong>
                    <p>{a.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </>
  );
}
