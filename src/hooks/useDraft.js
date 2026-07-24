import { useState, useEffect, useRef, useCallback } from 'react';
import { getDraft, putDraft, getEntries, putEntry } from '../db';
import { LOCK_AFTER_MS, NEW_PARAGRAPH_GAP_MS, LOCK_CHECK_INTERVAL_MS } from '../constants';

function freshDraft() {
  return { title: '', createdAt: null, paragraphs: [{ text: '', time: null }], lastActiveAt: Date.now() };
}

function touchCreatedAt(draft) {
  return draft.createdAt ? draft : { ...draft, createdAt: Date.now() };
}

export function useDraft() {
  const [draft, setDraft] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const saveTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [d, es] = await Promise.all([getDraft(), getEntries()]);
      if (cancelled) return;
      es.sort((a, b) => b.createdAt - a.createdAt);
      setDraft(d);
      setEntries(es);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!draft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => putDraft(draft), 400);
    return () => clearTimeout(saveTimer.current);
  }, [draft]);

  const lockIfExpired = useCallback(() => {
    setDraft((current) => {
      if (!current || !current.createdAt) return current;
      if (Date.now() - current.createdAt < LOCK_AFTER_MS) return current;
      const entry = {
        id: `e${current.createdAt}`,
        title: current.title,
        createdAt: current.createdAt,
        paragraphs: current.paragraphs,
      };
      putEntry(entry);
      setEntries((prev) => (prev.some((e) => e.id === entry.id) ? prev : [entry, ...prev]));
      const next = freshDraft();
      putDraft(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (loading) return;
    lockIfExpired();
    const id = setInterval(lockIfExpired, LOCK_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loading, lockIfExpired]);

  const setTitle = useCallback((title) => {
    setDraft((d) => touchCreatedAt({ ...d, title, lastActiveAt: Date.now() }));
  }, []);

  const setParagraphText = useCallback((idx, text) => {
    setDraft((d) => {
      const paragraphs = d.paragraphs.slice();
      paragraphs[idx] = { ...paragraphs[idx], text };
      return touchCreatedAt({ ...d, paragraphs, lastActiveAt: Date.now() });
    });
  }, []);

  const addParagraph = useCallback(() => {
    setDraft((d) => {
      const now = Date.now();
      const hasTime = now - d.lastActiveAt > NEW_PARAGRAPH_GAP_MS;
      return {
        ...d,
        paragraphs: [...d.paragraphs, { text: '', time: hasTime ? now : null }],
        lastActiveAt: now,
      };
    });
  }, []);

  const handleParagraphKeyDown = useCallback((idx, e) => {
    if (e.key !== 'Enter' || e.shiftKey) return;
    if (!draft || idx !== draft.paragraphs.length - 1) return;
    e.preventDefault();
    addParagraph();
  }, [draft, addParagraph]);

  return { loading, draft, entries, setTitle, setParagraphText, handleParagraphKeyDown };
}
