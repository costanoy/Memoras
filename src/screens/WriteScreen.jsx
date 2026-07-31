import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { fmtShort, fmtFull, fmtTime } from '../dateUtils';
import { isEditable, titleOf } from '../entryUtils';
import { WARNING_VISIBLE_MS, LINE_HEIGHT } from '../constants';
import { NewNoteIcon } from '../components/Icons';

/** Foca a linha e deixa o cursor no fim do que já estava escrito. */
function caretToEnd(el) {
  if (!el) return;
  el.focus();
  const end = el.value.length;
  el.setSelectionRange(end, end);
}

/** Trava a altura em múltiplos exatos da pauta, senão o texto sai da linha. */
function snapToGrid(el) {
  if (!el) return;
  el.style.height = 'auto';
  const lines = Math.max(1, Math.round(el.scrollHeight / LINE_HEIGHT));
  el.style.height = `${lines * LINE_HEIGHT}px`;
}

export function WriteScreen({
  entry,
  now,
  setTitle,
  setParagraphText,
  resetParagraphs,
  handleParagraphKeyDown,
  onOpenHistory,
  onNewEntry,
}) {
  const textareaRefs = useRef([]);
  const prevCount = useRef(entry?.paragraphs.length ?? 0);
  const prevEntryId = useRef(entry?.id);
  const openedOnce = useRef(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const warnTimer = useRef(null);

  // "Selecionar tudo" virtual: cada parágrafo é uma <textarea> separada, então
  // o Ctrl+A nativo só pega a caixa focada. Isto estende a seleção visualmente
  // por todas as caixas e intercepta copiar/digitar/apagar para agir sobre o
  // texto inteiro, como um editor de verdade.
  const allSelectedRef = useRef(false);
  const outsideClickRef = useRef(null);

  const clearMultiSelect = () => {
    if (!allSelectedRef.current) return;
    allSelectedRef.current = false;
    textareaRefs.current.forEach((el) => el && el.setSelectionRange(0, 0));
    if (outsideClickRef.current) {
      window.removeEventListener('click', outsideClickRef.current);
      outsideClickRef.current = null;
    }
  };

  const selectAllTextareas = () => {
    textareaRefs.current.forEach((el) => el && el.setSelectionRange(0, el.value.length));
    allSelectedRef.current = true;
    outsideClickRef.current = () => clearMultiSelect();
    window.addEventListener('click', outsideClickRef.current);
  };

  useEffect(() => () => clearTimeout(warnTimer.current), []);
  useEffect(() => () => {
    if (outsideClickRef.current) window.removeEventListener('click', outsideClickRef.current);
  }, []);

  useLayoutEffect(() => {
    textareaRefs.current.forEach(snapToGrid);
  });

  useEffect(() => {
    if (!entry) return;
    const sameEntry = prevEntryId.current === entry.id;

    if (!sameEntry || !openedOnce.current) {
      // Abrir uma anotação já deixa o cursor pronto na primeira linha.
      openedOnce.current = true;
      if (isEditable(entry)) caretToEnd(textareaRefs.current[0]);
    } else if (entry.paragraphs.length !== prevCount.current) {
      caretToEnd(textareaRefs.current[entry.paragraphs.length - 1]);
    }

    prevCount.current = entry.paragraphs.length;
    prevEntryId.current = entry.id;
  }, [entry]);

  if (!entry) return <div className="screen write-screen" />;

  const editable = isEditable(entry, now);

  /** Clicar em qualquer lugar coloca o cursor no texto, como num bloco de notas. */
  const focusNearestLine = (e) => {
    if (!editable) return;
    if (e.target.closest('textarea, input, button, a, svg')) return;

    const boxes = textareaRefs.current.filter(Boolean);
    if (boxes.length === 0) return;

    const y = e.clientY;
    const target =
      boxes.find((el) => {
        const r = el.getBoundingClientRect();
        return y <= r.bottom;
      }) ?? boxes[boxes.length - 1];

    // O foco precisa ser síncrono no clique, senão o teclado do celular não sobe.
    caretToEnd(target);
  };

  const handleTextareaKeyDown = (idx) => (e) => {
    const mod = e.ctrlKey || e.metaKey;

    if (mod && e.key.toLowerCase() === 'a') {
      if (entry.paragraphs.length <= 1) return; // o Ctrl+A nativo já resolve
      e.preventDefault();
      selectAllTextareas();
      return;
    }

    if (mod && e.key.toLowerCase() === 'c' && allSelectedRef.current) {
      e.preventDefault();
      const fullText = entry.paragraphs.map((p) => p.text).join('\n\n');
      navigator.clipboard?.writeText(fullText).catch(() => {});
      return;
    }

    if (allSelectedRef.current) {
      const isPrintable = e.key.length === 1 && !mod && !e.altKey;
      const isErase = e.key === 'Backspace' || e.key === 'Delete';
      if (isPrintable || isErase) {
        e.preventDefault();
        clearMultiSelect();
        resetParagraphs(isPrintable ? e.key : '');
        return;
      }
      clearMultiSelect();
    }

    handleParagraphKeyDown(idx, e);
  };

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
    <div
      className={`screen write-screen${editable ? '' : ' screen--aged'}`}
      onClick={focusNearestLine}
    >
      <div className="write-topbar">
        {!editable && <span className="badge">Bloqueada</span>}
        <span className="short-date">{fmtShort(entry.createdAt)}</span>
      </div>

      {editable ? (
        <>
          <input
            className="title-input"
            placeholder="Título (opcional)"
            value={entry.title}
            onChange={(e) => setTitle(e.target.value)}
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
                  }}
                  onKeyDown={handleTextareaKeyDown(i)}
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
            <div className="detail-title">{titleOf(entry)}</div>
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
