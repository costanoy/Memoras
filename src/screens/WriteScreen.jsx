import { useEffect, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { fmtShort, fmtFull, fmtTime } from '../dateUtils';
import { isEditable } from '../entryUtils';
import { WARNING_VISIBLE_MS, LINE_HEIGHT, NEW_PARAGRAPH_GAP_MS } from '../constants';
import { NewNoteIcon } from '../components/Icons';

/** Foca a linha e deixa o cursor no fim do que já estava escrito. */
function caretToEnd(el) {
  if (!el) return;
  el.focus({ preventScroll: true });
  const end = el.value.length;
  el.setSelectionRange(end, end);
}

/** Trava a altura em múltiplos exatos da pauta, senão o texto sai da linha. */
function snapToGrid(el) {
  if (!el) return;
  el.style.height = 'auto';
  const lines = Math.max(1, Math.ceil(el.scrollHeight / LINE_HEIGHT));
  el.style.height = `${lines * LINE_HEIGHT}px`;
}

export function WriteScreen({
  entry,
  now,
  setTitle,
  setEntryTitle,
  setParagraphText,
  startNewBlock,
  onOpenHistory,
  onNewEntry,
  onStartTyping,
}) {
  const textareaRefs = useRef([]);
  const prevCount = useRef(entry?.paragraphs.length ?? 0);
  const prevEntryId = useRef(entry?.id);
  const openedOnce = useRef(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const warnTimer = useRef(null);

  useEffect(() => () => clearTimeout(warnTimer.current), []);

  // Ajusta a altura de todas as caixas sempre que o texto muda, pra pauta
  // (as linhas do papel) continuar batendo com o conteúdo real.
  useLayoutEffect(() => {
    textareaRefs.current.filter(Boolean).forEach(snapToGrid);
  }, [entry?.paragraphs]);

  /**
   * A única separação automática do texto: se o usuário ficou mais de
   * NEW_PARAGRAPH_GAP_MS sem escrever e volta a mexer no último bloco, abre
   * um bloco novo (com a divisória tracejada) em vez de continuar colado no
   * texto antigo. Retorna true se abriu um bloco novo.
   */
  const resumeIfStale = useCallback(() => {
    if (!entry || entry.paragraphs.length === 0) return false;
    const last = entry.paragraphs[entry.paragraphs.length - 1];
    if (!last.text) return false;
    if (Date.now() - entry.lastActiveAt <= NEW_PARAGRAPH_GAP_MS) return false;
    startNewBlock();
    return true;
  }, [entry, startNewBlock]);

  useEffect(() => {
    if (!entry) return;
    const sameEntry = prevEntryId.current === entry.id;

    if (!sameEntry || !openedOnce.current) {
      // Abrir a anotação retoma no fim do último bloco — ou abre um bloco
      // novo direto, se já fazia tempo que ninguém escrevia nela.
      openedOnce.current = true;
      if (isEditable(entry) && !resumeIfStale()) {
        caretToEnd(textareaRefs.current[textareaRefs.current.length - 1]);
      }
    } else if (entry.paragraphs.length !== prevCount.current) {
      caretToEnd(textareaRefs.current[entry.paragraphs.length - 1]);
    }

    prevCount.current = entry.paragraphs.length;
    prevEntryId.current = entry.id;
  }, [entry, resumeIfStale]);

  if (!entry) return <div className="screen write-screen" />;

  const editable = isEditable(entry, now);

  const showWarning = () => {
    clearTimeout(warnTimer.current);
    setWarningVisible(true);
    warnTimer.current = setTimeout(() => setWarningVisible(false), WARNING_VISIBLE_MS);
  };

  const timeDivider = (p, i) =>
    i > 0 && p.time ? (
      <div className="dashed-divider">
        <span className="dashed-divider__line" />
        <span className="dashed-divider__time">{fmtTime(p.time)}</span>
        <span className="dashed-divider__line" />
      </div>
    ) : null;

  return (
    <div className={`screen write-screen${editable ? '' : ' screen--aged'}`}>
      <div className="write-topbar">
        {!editable && <span className="badge">Bloqueada</span>}
        <span className="short-date">{fmtShort(entry.createdAt)}</span>
      </div>

      {editable ? (
        <>
          <input
            className="title-input"
            placeholder="Título"
            value={entry.title}
            onChange={(e) => {
              setTitle(e.target.value);
              onStartTyping?.();
            }}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (!resumeIfStale()) {
                caretToEnd(textareaRefs.current[textareaRefs.current.length - 1]);
              }
            }}
          />
          <div className="notebook-lines write-lines">
            {entry.paragraphs.map((p, i) => (
              <div key={i}>
                {timeDivider(p, i)}
                <textarea
                  ref={(el) => (textareaRefs.current[i] = el)}
                  className="paragraph-textarea"
                  value={p.text}
                  onChange={(e) => {
                    setParagraphText(i, e.target.value);
                    snapToGrid(e.target);
                    onStartTyping?.();
                  }}
                  onFocus={i === entry.paragraphs.length - 1 ? () => resumeIfStale() : undefined}
                  rows={1}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="read-head">
            <div className="detail-date">{fmtFull(entry.createdAt)}</div>
            <div className="detail-time">{fmtTime(entry.createdAt)}</div>
            <input
              className="detail-title-input"
              placeholder="Título"
              value={entry.title}
              onChange={(e) => setEntryTitle(entry.id, e.target.value)}
            />
          </div>
          <div className="notebook-lines write-lines">
            {entry.paragraphs.map((p, i) => (
              <div key={i}>
                {timeDivider(p, i)}
                <div className="paragraph-readonly" onClick={showWarning}>
                  {p.text}
                </div>
              </div>
            ))}
            <button type="button" className="ghost-button" onClick={onNewEntry}>
              <NewNoteIcon size={16} />
              <span>Escrever uma nova anotação</span>
            </button>
          </div>
        </>
      )}

      <button type="button" className="fab" onClick={onOpenHistory} aria-label="Histórico">
        H
      </button>

      {warningVisible && <div className="toast">Este texto não é mais editável</div>}
    </div>
  );
}
