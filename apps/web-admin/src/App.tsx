import { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { login, logout, getUser, api } from './api';
import { useEffect } from 'react';

function LoginPage() {
  const [email, setEmail] = useState('admin@cartera247.com');
  const [password, setPassword] = useState('Admin123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await login(email, password);
      if (!data.user.isPlatformAdmin) {
        setError('Acceso solo para administradores de plataforma');
        return;
      }
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
        <h1>Cartera24/7</h1>
        <p>Panel de administración de plataforma</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button className="btn btn-primary" type="submit" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const user = getUser();
  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>CARTERA24/7 ADMIN</h2>
        <nav>
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Prestamistas</Link>
          <Link to="/modules" className={location.pathname === '/modules' ? 'active' : ''}>Módulos</Link>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: '2rem', fontSize: '0.8rem', color: '#64748b' }}>
          {user?.email}
          <br />
          <button className="btn btn-secondary" style={{ marginTop: '0.5rem', width: '100%' }} onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', ownerEmail: '', ownerPassword: 'Demo123!', ownerFirstName: '', ownerLastName: '' });

  useEffect(() => { api<any[]>('/tenants').then(setTenants).catch(console.error); }, []);

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    await api('/tenants', { method: 'POST', body: JSON.stringify(form) });
    setShowForm(false);
    setTenants(await api<any[]>('/tenants'));
  };

  const toggleStatus = async (id: string, status: string) => {
    await api(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify({ status: status === 'active' ? 'inactive' : 'active' }) });
    setTenants(await api<any[]>('/tenants'));
  };

  return (
    <Layout>
      <div className="header">
        <h1>Prestamistas</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Nuevo prestamista</button>
      </div>
      {showForm && (
        <div className="card">
          <h3>Crear prestamista</h3>
          <form onSubmit={createTenant}>
            <div className="form-group"><label>Nombre</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label>Email contacto</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group"><label>Email dueño</label><input required type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} /></div>
            <div className="form-group"><label>Contraseña dueño</label><input required value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} /></div>
            <div className="form-group"><label>Nombre dueño</label><input required value={form.ownerFirstName} onChange={(e) => setForm({ ...form, ownerFirstName: e.target.value })} /></div>
            <div className="form-group"><label>Apellido dueño</label><input required value={form.ownerLastName} onChange={(e) => setForm({ ...form, ownerLastName: e.target.value })} /></div>
            <button className="btn btn-primary" type="submit">Crear</button>
          </form>
        </div>
      )}
      <div className="card">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Estado</th><th>Clientes</th><th>Préstamos</th><th>Acciones</th></tr></thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.email}</td>
                <td><span className={`badge badge-${t.status === 'active' ? 'active' : 'inactive'}`}>{t.status}</span></td>
                <td>{t._count?.borrowers ?? 0}</td>
                <td>{t._count?.loans ?? 0}</td>
                <td>
                  <button className="btn btn-secondary" onClick={() => toggleStatus(t.id, t.status)}>
                    {t.status === 'active' ? 'Inactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function ModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  useEffect(() => { api<any[]>('/modules').then(setModules).catch(console.error); }, []);
  return (
    <Layout>
      <div className="header"><h1>Catálogo de módulos</h1></div>
      <div className="card">
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Descripción</th><th>Core</th></tr></thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.id}>
                <td><code>{m.code}</code></td>
                <td>{m.name}</td>
                <td>{m.description}</td>
                <td>{m.isCore ? 'Sí' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  if (!user.isPlatformAdmin) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><TenantsPage /></ProtectedRoute>} />
      <Route path="/modules" element={<ProtectedRoute><ModulesPage /></ProtectedRoute>} />
    </Routes>
  );
}
