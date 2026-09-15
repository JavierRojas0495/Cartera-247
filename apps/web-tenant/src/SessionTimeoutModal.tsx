type Props = {
  countdown: number;
  onContinue: () => void;
};

export function SessionTimeoutModal({ countdown, onContinue }: Props) {
  return (
    <div className="session-overlay" role="dialog" aria-modal="true" aria-labelledby="session-timeout-title">
      <div className="session-modal">
        <h2 id="session-timeout-title">Sesión por cerrarse</h2>
        <p>
          Llevas varios minutos sin actividad. Por seguridad, tu sesión se cerrará automáticamente.
        </p>
        <p className="session-countdown">
          Cierre en <strong>{countdown}</strong> {countdown === 1 ? 'segundo' : 'segundos'}
        </p>
        <div className="session-actions">
          <button type="button" className="btn btn-primary" onClick={onContinue}>
            Continuar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
