import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type AppDialogVariant = 'info' | 'success' | 'warning' | 'error';

type DialogBaseOptions = {
  title: string;
  message?: string;
  content?: ReactNode;
  variant?: AppDialogVariant;
  confirmText?: string;
};

type AlertOptions = DialogBaseOptions;

type ConfirmOptions = DialogBaseOptions & {
  cancelText?: string;
  destructive?: boolean;
};

type DialogState = {
  type: 'alert' | 'confirm';
  title: string;
  message?: string;
  content?: ReactNode;
  variant: AppDialogVariant;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  resolve: (value: boolean) => void;
};

type AppDialogContextValue = {
  alert: (options: AlertOptions) => Promise<void>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const AppDialogContext = createContext<AppDialogContextValue | null>(null);

function DialogIcon({ variant }: { variant: AppDialogVariant }) {
  const symbols: Record<AppDialogVariant, string> = {
    info: 'i',
    success: '✓',
    warning: '!',
    error: '×',
  };
  return <div className={`app-dialog-icon app-dialog-icon-${variant}`}>{symbols[variant]}</div>;
}

function DialogBody({ dialog }: { dialog: DialogState }) {
  if (dialog.content) {
    return <div className="app-dialog-body">{dialog.content}</div>;
  }
  return (
    <div className="app-dialog-body">
      <p className="app-dialog-message">{dialog.message}</p>
    </div>
  );
}

function AppDialogModal({
  dialog,
  onConfirm,
  onCancel,
}: {
  dialog: DialogState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  return (
    <div className="app-dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="app-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogIcon variant={dialog.variant} />
        <h2 id="app-dialog-title" className="app-dialog-title">{dialog.title}</h2>
        <DialogBody dialog={dialog} />
        <div className="app-dialog-actions">
          {dialog.type === 'confirm' && (
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {dialog.cancelText}
            </button>
          )}
          <button
            type="button"
            className={`btn ${dialog.destructive ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

function buildDialogState(
  type: 'alert' | 'confirm',
  options: AlertOptions | ConfirmOptions,
  resolve: (value: boolean) => void,
): DialogState {
  const confirmOpts = options as ConfirmOptions;
  return {
    type,
    title: options.title,
    message: options.message,
    content: options.content,
    variant: options.variant ?? 'info',
    confirmText: options.confirmText ?? (type === 'alert' ? 'Entendido' : 'Confirmar'),
    cancelText: confirmOpts.cancelText ?? 'Cancelar',
    destructive: confirmOpts.destructive ?? false,
    resolve,
  };
}

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setDialog(buildDialogState('alert', options, () => resolve()));
    });
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog(buildDialogState('confirm', options, resolve));
    });
  }, []);

  const close = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <AppDialogContext.Provider value={{ alert, confirm }}>
      {children}
      {dialog && (
        <AppDialogModal
          dialog={dialog}
          onConfirm={() => close(dialog.type === 'confirm' ? true : false)}
          onCancel={() => close(false)}
        />
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) throw new Error('useAppDialog debe usarse dentro de AppDialogProvider');
  return ctx;
}

/** Contenido estructurado: bloqueo por préstamos activos al desactivar */
export function borrowerDeactivateBlockedContent(name: string, activeLoansCount: number) {
  const loanLabel = activeLoansCount === 1 ? 'préstamo activo' : 'préstamos activos';
  return (
    <>
      <p className="app-dialog-lead">
        Para desactivar a <strong>{name}</strong>, todos sus préstamos deben estar pagados.
      </p>
      <div className="app-dialog-fact app-dialog-fact-warning">
        <span className="app-dialog-fact-label">Pendiente por saldar</span>
        <span className="app-dialog-fact-value">
          {activeLoansCount} {loanLabel}
        </span>
      </div>
    </>
  );
}
