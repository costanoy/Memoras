import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LOCK_CHECK_INTERVAL_MS } from '../constants';
import { newEntry, isEditable, isEmpty, sortByNewest } from '../entryUtils';
import { makeRepository, syncLocalEntriesOnce } from '../repository';

export function useEntries(uid = null) {
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const saveTimers = useRef({});
  const pendingSaves = useRef({});
  const dirty = useRef(false);

  const repo = useMemo(() => makeRepository(uid), [uid]);
  const repoRef = useRef(repo);
  repoRef.current = repo;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      if (uid) await syncLocalEntriesOnce(uid);
      const stored = await repo.getAll();
      if (cancelled) return;
      const all = sortByNewest(stored);
      const editable = all.find((e) => isEditable(e));
      if (editable) {
        setEntries(all);
        setSelectedId(editable.id);
      } else {
        const fresh = newEntry();
        repo.put(fresh);
        setEntries([fresh, ...all]);
        setSelectedId(fresh.id);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [repo, uid]);

  // Re-evaluates the 24h editability window without touching stored data.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), LOCK_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const scheduleSave = useCallback((entry) => {
    pendingSaves.current[entry.id] = entry;
    clearTimeout(saveTimers.current[entry.id]);
    saveTimers.current[entry.id] = setTimeout(() => {
      repoRef.current.put(entry);
      delete pendingSaves.current[entry.id];
    }, 400);
  }, []);

  /** Grava agora o que estiver pendente — usado ao sair da tela de digitação. */
  const flushSaves = useCallback(() => {
    Object.entries(pendingSaves.current).forEach(([id, entry]) => {
      clearTimeout(saveTimers.current[id]);
      repoRef.current.put(entry);
    });
    pendingSaves.current = {};
  }, []);

  /** True só se o usuário realmente escreveu algo desde a última checagem. */
  const consumeDirty = useCallback(() => {
    const wasDirty = dirty.current;
    dirty.current = false;
    return wasDirty;
  }, []);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushSaves();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [flushSaves]);

  const updateEntry = useCallback((id, updater) => {
    dirty.current = true;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const next = updater(e);
        scheduleSave(next);
        return next;
      })
    );
  }, [scheduleSave]);

  const setStatus = useCallback((id, status) => {
    setEntries((prev) => {
      const next = prev.map((e) =>
        e.id === id ? { ...e, status, statusChangedAt: Date.now() } : e
      );
      const changed = next.find((e) => e.id === id);
      if (changed) {
        clearTimeout(saveTimers.current[id]);
        repoRef.current.put(changed);
      }
      return next;
    });
  }, []);

  // Reuses a blank note instead of stacking up empty cards on repeated taps.
  const createEntry = useCallback(() => {
    const blank = entries.find((e) => isEditable(e) && isEmpty(e));
    if (blank) {
      setSelectedId(blank.id);
      return blank.id;
    }
    const fresh = newEntry();
    repoRef.current.put(fresh);
    setEntries((prev) => [fresh, ...prev]);
    setSelectedId(fresh.id);
    return fresh.id;
  }, [entries]);

  const deleteForever = useCallback((id) => {
    clearTimeout(saveTimers.current[id]);
    repoRef.current.remove(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const setTitle = useCallback((title) => {
    if (!selectedId) return;
    updateEntry(selectedId, (e) => ({ ...e, title, lastActiveAt: Date.now() }));
  }, [selectedId, updateEntry]);

  /** Título continua editável mesmo depois que a anotação trava — só o
   *  corpo do texto fica travado. Não mexe em lastActiveAt (isso é só
   *  relevante para o rascunho ativo, não para uma anotação já bloqueada). */
  const setEntryTitle = useCallback((id, title) => {
    updateEntry(id, (e) => ({ ...e, title }));
  }, [updateEntry]);

  const setParagraphText = useCallback((idx, text) => {
    if (!selectedId) return;
    updateEntry(selectedId, (e) => {
      const paragraphs = e.paragraphs.slice();
      paragraphs[idx] = { ...paragraphs[idx], text };
      return { ...e, paragraphs, lastActiveAt: Date.now() };
    });
  }, [selectedId, updateEntry]);

  /**
   * O texto de uma anotação é digitação livre, sem nenhuma configuração por
   * cima — a única coisa que separa o texto em blocos diferentes (com a
   * divisória tracejada e o horário) é o usuário ter ficado mais de
   * NEW_PARAGRAPH_GAP_MS sem escrever e voltado depois.
   */
  const startNewBlock = useCallback(() => {
    if (!selectedId) return;
    updateEntry(selectedId, (e) => {
      const stamp = Date.now();
      return {
        ...e,
        paragraphs: [...e.paragraphs, { text: '', time: stamp }],
        lastActiveAt: stamp,
      };
    });
  }, [selectedId, updateEntry]);

  const selectedEntry = useMemo(
    () => entries.find((e) => e.id === selectedId) ?? null,
    [entries, selectedId]
  );

  const activeEntries = useMemo(
    () => sortByNewest(entries.filter((e) => e.status === 'active')),
    [entries]
  );
  const archivedEntries = useMemo(
    () => sortByNewest(entries.filter((e) => e.status === 'archived')),
    [entries]
  );
  const trashedEntries = useMemo(
    () => sortByNewest(entries.filter((e) => e.status === 'trashed')),
    [entries]
  );

  return {
    loading,
    now,
    entries,
    activeEntries,
    archivedEntries,
    trashedEntries,
    selectedEntry,
    selectedId,
    selectEntry: setSelectedId,
    createEntry,
    flushSaves,
    consumeDirty,
    setTitle,
    setEntryTitle,
    setParagraphText,
    startNewBlock,
    archiveEntry: (id) => setStatus(id, 'archived'),
    trashEntry: (id) => setStatus(id, 'trashed'),
    restoreEntry: (id) => setStatus(id, 'active'),
    deleteForever,
    getEntry: (id) => entries.find((e) => e.id === id) ?? null,
  };
}
