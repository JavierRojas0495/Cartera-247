import { useEffect, useState } from 'react';
import { api } from './api';

export type BorrowerFormData = {
  documentNum: string;
  documentType: string;
  firstName: string;
  lastName: string;
  email: string;
  phones: { phone: string; label: string }[];
  residenceAddress: string;
  city: string;
  neighborhood: string;
  workCompanyName: string;
  workContactName: string;
  workPhones: { phone: string; label: string }[];
  workAddresses: { address: string; label: string }[];
  personalReferences: { fullName: string; phone: string; relationship: string; address: string }[];
};

export const PHONE_LABELS = ['Personal', 'Casa', 'WhatsApp', 'Trabajo', 'Otro'];
export const WORK_PHONE_LABELS = ['Oficina', 'Celular jefe', 'Recepción', 'WhatsApp empresa', 'Otro'];
export const WORK_ADDRESS_LABELS = ['Sede principal', 'Sucursal', 'Bodega', 'Otro'];

export const emptyPhone = () => ({ phone: '', label: 'Personal' });
export const emptyWorkPhone = () => ({ phone: '', label: 'Oficina' });
export const emptyWorkAddress = () => ({ address: '', label: 'Sede principal' });

export const emptyReference = () => ({ fullName: '', phone: '', relationship: '', address: '' });

export const emptyBorrowerForm = (): BorrowerFormData => ({
  documentNum: '',
  documentType: 'CC',
  firstName: '',
  lastName: '',
  email: '',
  phones: [emptyPhone()],
  residenceAddress: '',
  city: '',
  neighborhood: '',
  workCompanyName: '',
  workContactName: '',
  workPhones: [emptyWorkPhone()],
  workAddresses: [emptyWorkAddress()],
  personalReferences: [emptyReference(), emptyReference()],
});

export function borrowerToForm(b: any): BorrowerFormData {
  return {
    documentNum: b.documentNum || '',
    documentType: b.documentType || 'CC',
    firstName: b.firstName || '',
    lastName: b.lastName || '',
    email: b.email || '',
    phones: b.phones?.length
      ? b.phones.map((p: any) => ({ phone: p.phone, label: p.label || 'Personal' }))
      : b.phone
        ? [{ phone: b.phone, label: 'Personal' }]
        : [emptyPhone()],
    residenceAddress: b.residenceAddress || b.address || '',
    city: b.city || '',
    neighborhood: b.neighborhood || '',
    workCompanyName: b.workCompanyName || '',
    workContactName: b.workContactName || '',
    workPhones: b.workPhones?.length
      ? b.workPhones.map((p: any) => ({ phone: p.phone, label: p.label || 'Oficina' }))
      : b.workPhone
        ? [{ phone: b.workPhone, label: 'Oficina' }]
        : [emptyWorkPhone()],
    workAddresses: b.workAddresses?.length
      ? b.workAddresses.map((a: any) => ({ address: a.address, label: a.label || 'Sede principal' }))
      : b.workAddress
        ? [{ address: b.workAddress, label: 'Sede principal' }]
        : [emptyWorkAddress()],
    personalReferences: b.personalReferences?.length
      ? b.personalReferences.map((r: any) => ({
          fullName: r.fullName,
          phone: r.phone,
          relationship: r.relationship,
          address: r.address || '',
        }))
      : [emptyReference(), emptyReference()],
  };
}

export function hasSensitiveChanges(original: any, form: BorrowerFormData): boolean {
  return (
    form.documentNum.trim() !== (original.documentNum || '') ||
    form.documentType.trim() !== (original.documentType || 'CC') ||
    form.firstName.trim() !== (original.firstName || '') ||
    form.lastName.trim() !== (original.lastName || '') ||
    form.residenceAddress.trim() !== (original.residenceAddress || original.address || '')
  );
}

const UNLOCK_KEY = 'cartera247_borrower_sensitive_unlock';
const UNLOCK_MS = 10 * 60 * 1000;

export function isSensitiveUnlocked(borrowerId: string): boolean {
  const raw = sessionStorage.getItem(UNLOCK_KEY);
  if (!raw) return false;
  try {
    const { id, expiresAt } = JSON.parse(raw);
    return id === borrowerId && Date.now() < expiresAt;
  } catch {
    return false;
  }
}

export function persistSensitiveUnlock(borrowerId: string) {
  sessionStorage.setItem(
    UNLOCK_KEY,
    JSON.stringify({ id: borrowerId, expiresAt: Date.now() + UNLOCK_MS }),
  );
}

type Props = {
  mode: 'create' | 'edit';
  borrowerId?: string;
  original?: any;
  hasActiveLoans?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="borrower-form-section-head">
      <h3>{children}</h3>
      {hint && <p>{hint}</p>}
    </div>
  );
}

function LockedLabel({ locked, children }: { locked?: boolean; children: React.ReactNode }) {
  return (
    <label className={locked ? 'label-locked' : undefined}>
      {children}
      {locked && <span className="field-lock">Protegido</span>}
    </label>
  );
}

export function BorrowerFormPanel({
  mode,
  borrowerId,
  original,
  hasActiveLoans = false,
  onSuccess,
  onCancel,
}: Props) {
  const [form, setForm] = useState<BorrowerFormData>(
    original ? borrowerToForm(original) : emptyBorrowerForm(),
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [sensitiveUnlocked, setSensitiveUnlocked] = useState(
    mode === 'edit' && borrowerId ? isSensitiveUnlocked(borrowerId) : true,
  );
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyPassword, setVerifyPassword] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (mode === 'edit' && original) {
      setForm(borrowerToForm(original));
    }
  }, [mode, original?.id]);

  useEffect(() => {
    if (mode === 'edit' && borrowerId) {
      setSensitiveUnlocked(isSensitiveUnlocked(borrowerId) || !hasActiveLoans);
    }
  }, [mode, borrowerId, hasActiveLoans]);

  const sensitiveLocked = mode === 'edit' && hasActiveLoans && !sensitiveUnlocked;
  const sensitiveChanged = mode === 'edit' && original ? hasSensitiveChanges(original, form) : false;

  const updateField = <K extends keyof BorrowerFormData>(key: K, value: BorrowerFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateReference = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      personalReferences: prev.personalReferences.map((ref, i) =>
        i === index ? { ...ref, [field]: value } : ref,
      ),
    }));
  };

  const updatePhone = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const removePhone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));
  };

  const updateWorkPhone = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      workPhones: prev.workPhones.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const removeWorkPhone = (index: number) => {
    setForm((prev) => ({
      ...prev,
      workPhones: prev.workPhones.filter((_, i) => i !== index),
    }));
  };

  const updateWorkAddress = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      workAddresses: prev.workAddresses.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry,
      ),
    }));
  };

  const removeWorkAddress = (index: number) => {
    setForm((prev) => ({
      ...prev,
      workAddresses: prev.workAddresses.filter((_, i) => i !== index),
    }));
  };

  const removeReference = (index: number) => {
    setForm((prev) => ({
      ...prev,
      personalReferences: prev.personalReferences.filter((_, i) => i !== index),
    }));
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError('');
    setVerifyLoading(true);
    try {
      await api('/auth/verify-password', {
        method: 'POST',
        body: JSON.stringify({ password: verifyPassword }),
      });
      if (borrowerId) persistSensitiveUnlock(borrowerId);
      setSensitiveUnlocked(true);
      setShowVerifyModal(false);
      setVerifyPassword('');
    } catch (err: any) {
      setVerifyError(err.message || 'Contraseña incorrecta.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const refs = form.personalReferences.filter(
      (r) => r.fullName.trim() && r.phone.trim() && r.relationship.trim(),
    );
    if (refs.length === 0) {
      setError('Agrega al menos una referencia personal completa (nombre, teléfono y relación).');
      return;
    }

    if (sensitiveLocked && sensitiveChanged) {
      setError('Debes verificar tu identidad para modificar cédula, nombre o dirección de residencia.');
      return;
    }

    if (mode === 'edit' && hasActiveLoans && sensitiveChanged && !confirmPassword.trim()) {
      setError('Confirma tu contraseña para guardar cambios en datos sensibles.');
      return;
    }

    setSaving(true);
    try {
      const validPhones = form.phones.filter((p) => p.phone.trim());
      const validWorkPhones = form.workPhones.filter((p) => p.phone.trim());
      const validWorkAddresses = form.workAddresses.filter((a) => a.address.trim());
      const payload: Record<string, unknown> = {
        ...form,
        phones: validPhones,
        workPhones: validWorkPhones,
        workAddresses: validWorkAddresses,
        personalReferences: refs,
      };

      if (mode === 'edit' && hasActiveLoans && sensitiveChanged) {
        payload.confirmPassword = confirmPassword;
      }

      if (mode === 'create') {
        await api('/borrowers', { method: 'POST', body: JSON.stringify(payload) });
      } else if (borrowerId) {
        await api(`/borrowers/${borrowerId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el prestatario.');
    } finally {
      setSaving(false);
    }
  };

  const lockProps = (sensitive: boolean) =>
    sensitive && sensitiveLocked
      ? { disabled: true, title: 'Verifica tu identidad para editar este campo' }
      : {};

  const displayName = [form.firstName, form.lastName].filter(Boolean).join(' ') || 'Sin nombre';

  return (
    <>
      <form className="borrower-form" onSubmit={submit}>
        {mode === 'edit' && original && (
          <div className="card borrower-form-summary">
            <div>
              <p className="borrower-detail-kicker">Editando prestatario</p>
              <p className="borrower-form-summary-name">{displayName}</p>
              <p className="borrower-form-summary-doc">{form.documentType} {form.documentNum}</p>
            </div>
            {hasActiveLoans && (
              <span className="badge badge-overdue">Préstamos activos — datos sensibles protegidos</span>
            )}
          </div>
        )}

        {error && <div className="borrower-form-alert error">{error}</div>}

        {sensitiveLocked && (
          <div className="borrower-form-alert session-notice">
            <div>
              <strong>Datos sensibles bloqueados.</strong> La cédula, nombre y dirección de residencia requieren verificación de identidad porque hay préstamos activos.
            </div>
            <button type="button" className="btn btn-primary" onClick={() => setShowVerifyModal(true)}>
              Verificar identidad
            </button>
          </div>
        )}

        <div className="borrower-form-grid">
          <section className="card borrower-form-section">
            <SectionTitle hint="Documento de identidad y medios de contacto">
              Identificación y contacto
            </SectionTitle>
            <div className="form-row">
              <div className="form-group">
                <LockedLabel locked={sensitiveLocked}>Tipo de documento</LockedLabel>
                <select
                  {...lockProps(true)}
                  value={form.documentType}
                  onChange={(e) => updateField('documentType', e.target.value)}
                >
                  <option value="CC">Cédula de ciudadanía</option>
                  <option value="CE">Cédula de extranjería</option>
                  <option value="PA">Pasaporte</option>
                  <option value="NIT">NIT</option>
                </select>
              </div>
              <div className="form-group">
                <LockedLabel locked={sensitiveLocked}>Número de documento</LockedLabel>
                <input
                  required
                  {...lockProps(true)}
                  value={form.documentNum}
                  onChange={(e) => updateField('documentNum', e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <LockedLabel locked={sensitiveLocked}>Nombre</LockedLabel>
                <input
                  required
                  {...lockProps(true)}
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <LockedLabel locked={sensitiveLocked}>Apellido</LockedLabel>
                <input
                  required
                  {...lockProps(true)}
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Correo electrónico</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="borrower-phones-block">
              <div className="borrower-form-section-head-row" style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Teléfonos
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>Puedes registrar varios números de contacto.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => updateField('phones', [...form.phones, emptyPhone()])}
                >
                  + Agregar teléfono
                </button>
              </div>
              <div className="phone-form-grid">
                {form.phones.map((entry, i) => (
                  <article key={i} className="reference-form-card">
                    <div className="reference-form-card-head">
                      <span>Teléfono {i + 1}{i === 0 ? ' · Principal' : ''}</span>
                      {form.phones.length > 1 && (
                        <button type="button" className="btn-link-danger" onClick={() => removePhone(i)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Número</label>
                        <input
                          value={entry.phone}
                          onChange={(e) => updatePhone(i, 'phone', e.target.value)}
                          placeholder="3001234567"
                        />
                      </div>
                      <div className="form-group">
                        <label>Tipo</label>
                        <select value={entry.label} onChange={(e) => updatePhone(i, 'label', e.target.value)}>
                          {PHONE_LABELS.map((label) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="card borrower-form-section">
            <SectionTitle hint="Ubicación principal del prestatario">
              Dirección de residencia
            </SectionTitle>
            <div className="form-group">
              <LockedLabel locked={sensitiveLocked}>Dirección completa</LockedLabel>
              <input
                required
                {...lockProps(true)}
                placeholder="Calle, número, apartamento"
                value={form.residenceAddress}
                onChange={(e) => updateField('residenceAddress', e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Barrio</label>
                <input value={form.neighborhood} onChange={(e) => updateField('neighborhood', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Ciudad</label>
                <input value={form.city} onChange={(e) => updateField('city', e.target.value)} />
              </div>
            </div>
          </section>

          <section className="card borrower-form-section borrower-form-section-wide">
            <SectionTitle hint="Empresa, contacto responsable y ubicaciones (opcional)">
              Información laboral
            </SectionTitle>
            <div className="form-row">
              <div className="form-group">
                <label>Empresa</label>
                <input
                  value={form.workCompanyName}
                  onChange={(e) => updateField('workCompanyName', e.target.value)}
                  placeholder="Nombre de la empresa"
                />
              </div>
              <div className="form-group">
                <label>Jefe o contacto en la empresa</label>
                <input
                  value={form.workContactName}
                  onChange={(e) => updateField('workContactName', e.target.value)}
                  placeholder="Nombre y cargo, ej. Laura Méndez — Jefe"
                />
              </div>
            </div>

            <div className="borrower-phones-block">
              <div className="borrower-form-section-head-row" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h4 className="borrower-form-subtitle">Teléfonos de la empresa</h4>
                  <p className="borrower-form-subhint">Indica a quién corresponde cada número si aplica.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => updateField('workPhones', [...form.workPhones, emptyWorkPhone()])}
                >
                  + Agregar teléfono
                </button>
              </div>
              <div className="phone-form-grid">
                {form.workPhones.map((entry, i) => (
                  <article key={i} className="reference-form-card">
                    <div className="reference-form-card-head">
                      <span>Teléfono laboral {i + 1}{i === 0 ? ' · Principal' : ''}</span>
                      {form.workPhones.length > 1 && (
                        <button type="button" className="btn-link-danger" onClick={() => removeWorkPhone(i)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Número</label>
                        <input
                          value={entry.phone}
                          onChange={(e) => updateWorkPhone(i, 'phone', e.target.value)}
                          placeholder="6017654321"
                        />
                      </div>
                      <div className="form-group">
                        <label>Tipo</label>
                        <select value={entry.label} onChange={(e) => updateWorkPhone(i, 'label', e.target.value)}>
                          {WORK_PHONE_LABELS.map((label) => (
                            <option key={label} value={label}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="borrower-phones-block">
              <div className="borrower-form-section-head-row" style={{ marginBottom: '0.75rem' }}>
                <div>
                  <h4 className="borrower-form-subtitle">Direcciones de la empresa</h4>
                  <p className="borrower-form-subhint">Sede, sucursal, bodega u otras ubicaciones.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => updateField('workAddresses', [...form.workAddresses, emptyWorkAddress()])}
                >
                  + Agregar dirección
                </button>
              </div>
              <div className="phone-form-grid">
                {form.workAddresses.map((entry, i) => (
                  <article key={i} className="reference-form-card">
                    <div className="reference-form-card-head">
                      <span>Dirección {i + 1}{i === 0 ? ' · Principal' : ''}</span>
                      {form.workAddresses.length > 1 && (
                        <button type="button" className="btn-link-danger" onClick={() => removeWorkAddress(i)}>
                          Eliminar
                        </button>
                      )}
                    </div>
                    <div className="form-group">
                      <label>Dirección</label>
                      <input
                        value={entry.address}
                        onChange={(e) => updateWorkAddress(i, 'address', e.target.value)}
                        placeholder="Calle, número, oficina"
                      />
                    </div>
                    <div className="form-group">
                      <label>Tipo</label>
                      <select value={entry.label} onChange={(e) => updateWorkAddress(i, 'label', e.target.value)}>
                        {WORK_ADDRESS_LABELS.map((label) => (
                          <option key={label} value={label}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="card borrower-form-section borrower-form-section-wide">
            <div className="borrower-form-section-head borrower-form-section-head-row">
              <div>
                <h3>Referencias personales</h3>
                <p>Mínimo una referencia con nombre, teléfono y relación.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => updateField('personalReferences', [...form.personalReferences, emptyReference()])}
              >
                + Agregar referencia
              </button>
            </div>

            <div className="reference-form-grid">
              {form.personalReferences.map((ref, i) => (
                <article key={i} className="reference-form-card">
                  <div className="reference-form-card-head">
                    <span>Referencia {i + 1}</span>
                    {form.personalReferences.length > 1 && (
                      <button type="button" className="btn-link-danger" onClick={() => removeReference(i)}>
                        Eliminar
                      </button>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Nombre completo</label>
                    <input value={ref.fullName} onChange={(e) => updateReference(i, 'fullName', e.target.value)} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input value={ref.phone} onChange={(e) => updateReference(i, 'phone', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Relación</label>
                      <input
                        value={ref.relationship}
                        onChange={(e) => updateReference(i, 'relationship', e.target.value)}
                        placeholder="Familiar, amigo..."
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Dirección</label>
                    <input
                      value={ref.address}
                      onChange={(e) => updateReference(i, 'address', e.target.value)}
                      placeholder="Calle, número, barrio, ciudad"
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {mode === 'edit' && hasActiveLoans && sensitiveChanged && !sensitiveLocked && (
          <div className="card borrower-form-confirm">
            <h3>Confirmación de seguridad</h3>
            <p>Estás modificando datos sensibles. Ingresa tu contraseña para confirmar los cambios.</p>
            <div className="form-group">
              <label>Tu contraseña</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Contraseña de acceso"
              />
            </div>
          </div>
        )}

        <div className="borrower-form-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : mode === 'create' ? 'Registrar prestatario' : 'Guardar cambios'}
          </button>
        </div>
      </form>

      {showVerifyModal && (
        <div className="session-overlay">
          <div className="session-modal">
            <h2>Verificar identidad</h2>
            <p>Ingresa tu contraseña para habilitar la edición de cédula, nombre y dirección de residencia.</p>
            {verifyError && <div className="error">{verifyError}</div>}
            <form onSubmit={handleVerify}>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  autoFocus
                  required
                  value={verifyPassword}
                  onChange={(e) => setVerifyPassword(e.target.value)}
                />
              </div>
              <div className="session-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowVerifyModal(false)} disabled={verifyLoading}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={verifyLoading}>
                  {verifyLoading ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
