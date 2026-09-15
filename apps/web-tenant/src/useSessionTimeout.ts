import { useCallback, useEffect, useRef, useState } from 'react';
import { getIdleBeforeWarningMs, logout, SESSION_CONFIG } from './session';
import { isAuthenticated } from './api';

export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(SESSION_CONFIG.warningCountdownSec);
  const lastActivityRef = useRef(Date.now());
  const warningActiveRef = useRef(false);

  const continueSession = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningActiveRef.current = false;
    setShowWarning(false);
    setCountdown(SESSION_CONFIG.warningCountdownSec);
  }, []);

  const checkIdleState = useCallback(() => {
    if (!isAuthenticated()) return;

    const idleMs = Date.now() - lastActivityRef.current;
    const idleLimit = getIdleBeforeWarningMs();
    const totalLimit = idleLimit + SESSION_CONFIG.warningCountdownSec * 1000;

    if (idleMs >= totalLimit) {
      logout('inactivity');
      return;
    }

    if (idleMs >= idleLimit) {
      const elapsedInWarning = idleMs - idleLimit;
      const remaining = SESSION_CONFIG.warningCountdownSec - Math.floor(elapsedInWarning / 1000);
      warningActiveRef.current = true;
      setShowWarning(true);
      setCountdown(Math.max(1, remaining));
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) return;

    lastActivityRef.current = Date.now();

    const onActivity = () => {
      if (!warningActiveRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkIdleState();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const tick = setInterval(() => {
      if (!isAuthenticated()) return;

      const idleMs = Date.now() - lastActivityRef.current;
      const idleLimit = getIdleBeforeWarningMs();

      if (!warningActiveRef.current && idleMs >= idleLimit) {
        warningActiveRef.current = true;
        setShowWarning(true);
        setCountdown(SESSION_CONFIG.warningCountdownSec);
        return;
      }

      if (warningActiveRef.current) {
        setCountdown((prev) => {
          if (prev <= 1) {
            logout('inactivity');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      events.forEach((event) => window.removeEventListener(event, onActivity));
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(tick);
    };
  }, [checkIdleState]);

  return { showWarning, countdown, continueSession };
}
