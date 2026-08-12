import { useState, useEffect, useCallback } from 'react';
import { getPrefs, putPrefs } from '../db';

export function usePrefs() {
  const [diaryName, setDiaryNameState] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPrefs().then((prefs) => {
      if (cancelled) return;
      setDiaryNameState(prefs.diaryName ?? '');
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const setDiaryName = useCallback((name) => {
    setDiaryNameState(name);
    putPrefs({ diaryName: name });
  }, []);

  return { loading, diaryName, setDiaryName };
}
