import { useState, useEffect, useCallback } from 'react';
import { getSettings, putSettings } from '../db';
import { generateSalt, hashPin } from '../crypto';

const DEFAULT_SETTINGS = { passwordEnabled: false, passwordHash: null, passwordSalt: null };

export function useLock() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await getSettings();
      if (cancelled) return;
      setSettings(s);
      setLocked(!!(s.passwordEnabled && s.passwordHash));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next) => {
    setSettings(next);
    putSettings(next);
  }, []);

  const setPasswordEnabled = useCallback((enabled) => {
    setSettings((current) => {
      const next = enabled
        ? { ...current, passwordEnabled: true }
        : { passwordEnabled: false, passwordHash: null, passwordSalt: null };
      putSettings(next);
      return next;
    });
  }, []);

  const setPin = useCallback(async (pin) => {
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);
    persist({ passwordEnabled: true, passwordHash: hash, passwordSalt: salt });
  }, [persist]);

  const clearPin = useCallback(() => {
    setSettings((current) => {
      const next = { ...current, passwordHash: null, passwordSalt: null };
      putSettings(next);
      return next;
    });
  }, []);

  const verifyPin = useCallback(async (pin) => {
    if (!settings.passwordHash || !settings.passwordSalt) return false;
    const hash = await hashPin(pin, settings.passwordSalt);
    const ok = hash === settings.passwordHash;
    if (ok) setLocked(false);
    return ok;
  }, [settings]);

  return {
    loading,
    locked,
    passwordEnabled: settings.passwordEnabled,
    hasPin: !!settings.passwordHash,
    setPasswordEnabled,
    setPin,
    clearPin,
    verifyPin,
  };
}
