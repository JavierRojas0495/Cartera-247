export const SESSION_CONFIG = {
  /** Minutos sin actividad antes de mostrar la alerta */
  idleBeforeWarningMinutes: 10,
  /** Segundos de cuenta regresiva en la alerta */
  warningCountdownSec: 60,
};

export type LogoutReason = 'inactivity' | 'expired' | 'manual';

const LOGOUT_REASON_KEY = 'cartera247_logout_reason';

export function logout(reason: LogoutReason = 'manual') {
  if (reason !== 'manual') {
    sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
  }
  localStorage.clear();
  window.location.href = '/login';
}

export function getLogoutMessage(): string | null {
  const reason = sessionStorage.getItem(LOGOUT_REASON_KEY) as LogoutReason | null;
  sessionStorage.removeItem(LOGOUT_REASON_KEY);

  switch (reason) {
    case 'inactivity':
      return 'Tu sesión se cerró por inactividad. Inicia sesión de nuevo para continuar.';
    case 'expired':
      return 'Tu sesión expiró por seguridad. Inicia sesión de nuevo para continuar.';
    default:
      return null;
  }
}

export function getIdleBeforeWarningMs() {
  return SESSION_CONFIG.idleBeforeWarningMinutes * 60 * 1000;
}
