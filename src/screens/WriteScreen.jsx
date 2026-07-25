import { useEffect, useRef, useState } from 'react';
import { fmtShort, fmtFull, fmtTime } from '../dateUtils';
import { isEditable, titleOf } from '../entryUtils';
import { WARNING_VISIBLE_MS } from '../constants';
import { NewNoteIcon } from '../components/Icons';

export function WriteScreen({
  entry,
  now,
  setTitle,
  setParagraphText,
  handleParagraphKeyDown,
  onOpenHistory,
  onNewEntry,
}) {
  const textareaRefs = useRef([]);
  const prevCount = useRef(entry?.paragraphs.length ?? 0);
  const prevEntryId = useRef(entry?.id);
  const [warningVisible, setWarningVisible] = useState(false);
  const warnTimer = useRef(null);

  useEffect(() => () => clearTimeout(warnTimer.current), []);

  useEffect(() => {
    if (!entry) return;
    const sameEntry = prevEntryId.current === entry.id;
    if (sameEntry && entry.paragraphs.length > prevCount.current) {
      textareaRefs.current[entry.paragraphs.length - 1]?.focus();
    }
    prevCount.current = entry.paragraphs.length;
    prevEntryId.current = entry.id;
  }, [entry]);

  if (!entry) return <div className="screen write-screen" />;

  const editable = isEditable(entry, now);

  const showWarning = () => {
    clearTimeout(warnTimer.current);
    setWarningVisible(true);
    warnTimer.current = setTimeout(() => setWarningVisible(false), WARNING_VISIBLE_MS);
  };

  return (
    <div className="screen write-screen">
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
                {i > 0 && p.time && (
                  <div className="dashed-divider">
                    <span className="dashed-divider__line" />
                    <span className="dashed-divider__time">{fmtTime(p.time)}</span>
                    <span className="dashed-divider__line" />
                  </div>
                )}
                <textarea
                  ref={(el) => (textareaRefs.current[i] = el)}
                  className="paragraph-textarea"
                  value={p.text}
                  onChange={(e) => setParagraphText(i, e.target.value)}
                  onKeyDown={(e) => handleParagraphKeyDown(i, e)}
                  rows={Math.max(1, Math.ceil((p.text.length + 1) / 38))}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="notebook-lines write-lines">
          <div className="detail-date">{fmtFull(entry.createdAt)}</div>
          <div className="detail-time">{fmtTime(entry.createdAt)}</div>
          <div className="detail-title">{titleOf(entry)}</div>
          {entry.paragraphs.map((p, i) => (
            <div key={i}>
              {i > 0 && p.time && (
                <div className="dashed-divider">
                  <span className="dashed-divider__line" />
                  <span className="dashed-divider__time">{fmtTime(p.time)}</span>
                  <span className="dashed-divider__line" />
                </div>
              )}
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
      )}

      <button type="button" className="fab" onClick={onOpenHistory} aria-label="Histórico">
        H
      </button>

      {warningVisible && <div className="toast">Este texto não é mais editável</div>}
    </div>
  );
}
