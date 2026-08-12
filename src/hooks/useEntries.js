import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { NEW_PARAGRAPH_GAP_MS, LOCK_CHECK_INTERVAL_MS, HISTORY_GROUP_MS, HISTORY_LIMIT } from '../constants';
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

  // Desfazer/refazer por anotação: uma pilha de snapshots {title, paragraphs}
  // guardada num ref (não precisa de re-render a cada tecla) + um contador em
  // estado só pra avisar a UI (botões desfazer/refazer) quando algo mudou.
  const historyByEntry = useRef({});
  const [historyTick, setHistoryTick] = useState(0);

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

  const getHistory = (id) => {
    if (!historyByEntry.current[id]) {
      historyByEntry.current[id] = { past: [], future: [], lastSnapshotAt: 0 };
    }
    return historyByEntry.current[id];
  };

  const snapshotOf = (e) => ({ title: e.title, paragraphs: e.paragraphs });

  /** `force: true` sempre abre um passo novo de desfazer (Enter, apagar
   *  parágrafo...); sem isso, edições dentro da mesma "leva" de digitação
   *  (HISTORY_GROUP_MS) se juntam num só passo, como a maioria dos editores. */
  const updateEntry = useCallback((id, updater, { force = false, skipHistory = false } = {}) => {
    dirty.current = true;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        if (!skipHistory) {
          const h = getHistory(id);
          const now = Date.now();
          if (force || now - h.lastSnapshotAt > HISTORY_GROUP_MS) {
            h.past.push(snapshotOf(e));
            if (h.past.length > HISTORY_LIMIT) h.past.shift();
            h.future = [];
          }
          h.lastSnapshotAt = now;
        }
        const next = updater(e);
        scheduleSave(next);
        return next;
      })
    );
    if (!skipHistory) setHistoryTick((t) => t + 1);
  }, [scheduleSave]);

  const undo = useCallback((id) => {
    const h = historyByEntry.current[id];
    if (!h || h.past.length === 0) return;
    const previous = h.past.pop();
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        h.future.push(snapshotOf(e));
        const next = { ...e, ...previous, lastActiveAt: Date.now() };
        scheduleSave(next);
        return next;
      })
    );
    dirty.current = true;
    setHistoryTick((t) => t + 1);
  }, [scheduleSave]);

  const redo = useCallback((id) => {
    const h = historyByEntry.current[id];
    if (!h || h.future.length === 0) return;
    const nextSnapshot = h.future.pop();
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        h.past.push(snapshotOf(e));
        const next = { ...e, ...nextSnapshot, lastActiveAt: Date.now() };
        scheduleSave(next);
        return next;
      })
    );
    dirty.current = true;
    setHistoryTick((t) => t + 1);
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
   * Enter divide o parágrafo em dois, no ponto exato do cursor (ou no lugar
   * do que estiver selecionado) — não só quando o cursor está no fim do
   * último parágrafo. A divisória tracejada com horário só faz sentido para
   * sinalizar "voltei depois de um tempo": só aparece quando o novo
   * parágrafo é criado no fim da anotação E já fazia tempo que o usuário
   * não escrevia — um Enter no meio do texto é uma quebra intencional
   * imediata, não uma pausa real.
   */
  const splitParagraph = useCallback((idx, start, end) => {
    if (!selectedId) return;
    updateEntry(selectedId, (e) => {
      if (idx < 0 || idx >= e.paragraphs.length) return e;
      const current = e.paragraphs[idx];
      const before = current.text.slice(0, start);
      const after = current.text.slice(end);
      const stamp = Date.now();
      const isAtEnd = idx === e.paragraphs.length - 1 && end >= current.text.length;
      const hasTime = isAtEnd && stamp - e.lastActiveAt > NEW_PARAGRAPH_GAP_MS;
      const paragraphs = [
        ...e.paragraphs.slice(0, idx),
        { ...current, text: before },
        { text: after, time: hasTime ? stamp : null },
        ...e.paragraphs.slice(idx + 1),
      ];
      return { ...e, paragraphs, lastActiveAt: stamp };
    }, { force: true });
  }, [selectedId, updateEntry]);

  /** Colapsa todos os parágrafos em um só — usado quando o usuário digita ou
   *  apaga logo depois de um "selecionar tudo" virtual (Ctrl+A entre caixas). */
  const resetParagraphs = useCallback((text) => {
    if (!selectedId) return;
    updateEntry(selectedId, (e) => ({
      ...e,
      paragraphs: [{ text, time: null }],
      lastActiveAt: Date.now(),
    }), { force: true });
  }, [selectedId, updateEntry]);

  /** Backspace no início de um parágrafo funde ele com o anterior — apagar
   *  continua para trás entre parágrafos, como num editor de texto normal. */
  const mergeParagraphBack = useCallback((idx) => {
    if (!selectedId) return;
    updateEntry(selectedId, (e) => {
      if (idx <= 0 || idx >= e.paragraphs.length) return e;
      const prev = e.paragraphs[idx - 1];
      const current = e.paragraphs[idx];
      const paragraphs = [
        ...e.paragraphs.slice(0, idx - 1),
        { ...prev, text: prev.text + current.text },
        ...e.paragraphs.slice(idx + 1),
      ];
      return { ...e, paragraphs, lastActiveAt: Date.now() };
    }, { force: true });
  }, [selectedId, updateEntry]);

  /** Apaga a divisória tracejada de um parágrafo junto com o texto que veio
   *  depois dela — usado quando o usuário confirma que quer descartar aquele
   *  trecho "retomado depois de um tempo" inteiro. Nunca deixa a anotação
   *  sem nenhum parágrafo. */
  const removeParagraph = useCallback((idx) => {
    if (!selectedId) return;
    updateEntry(selectedId, (e) => {
      if (idx <= 0 || idx >= e.paragraphs.length) return e;
      const paragraphs = e.paragraphs.filter((_, i) => i !== idx);
      return {
        ...e,
        paragraphs: paragraphs.length ? paragraphs : [{ text: '', time: null }],
        lastActiveAt: Date.now(),
      };
    }, { force: true });
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

  const undoSelected = useCallback(() => undo(selectedId), [undo, selectedId]);
  const redoSelected = useCallback(() => redo(selectedId), [redo, selectedId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- historyTick só existe pra forçar essa recontagem
  const canUndo = useMemo(
    () => !!historyByEntry.current[selectedId]?.past.length,
    [selectedId, historyTick]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canRedo = useMemo(
    () => !!historyByEntry.current[selectedId]?.future.length,
    [selectedId, historyTick]
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
    resetParagraphs,
    mergeParagraphBack,
    splitParagraph,
    removeParagraph,
    undo: undoSelected,
    redo: redoSelected,
    canUndo,
    canRedo,
    archiveEntry: (id) => setStatus(id, 'archived'),
    trashEntry: (id) => setStatus(id, 'trashed'),
    restoreEntry: (id) => setStatus(id, 'active'),
    deleteForever,
    getEntry: (id) => entries.find((e) => e.id === id) ?? null,
  };
}
