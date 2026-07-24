import { useEffect, useRef } from 'react';
import { fmtShort, fmtTime } from '../dateUtils';

export function WriteScreen({ draft, setTitle, setParagraphText, handleParagraphKeyDown, onOpenHistory }) {
  const textareaRefs = useRef([]);
  const prevCount = useRef(draft.paragraphs.length);

  useEffect(() => {
    if (draft.paragraphs.length > prevCount.current) {
      const last = textareaRefs.current[draft.paragraphs.length - 1];
      last?.focus();
    }
    prevCount.current = draft.paragraphs.length;
  }, [draft.paragraphs.length]);

  return (
    <div className="screen write-screen">
      <div className="write-topbar">
        <span className="short-date">{fmtShort(draft.createdAt ?? Date.now())}</span>
      </div>
      <input
        className="title-input"
        placeholder="Título (opcional)"
        value={draft.title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="notebook-lines write-lines">
        {draft.paragraphs.map((p, i) => (
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
      <button type="button" className="fab" onClick={onOpenHistory} aria-label="Histórico">
        H
      </button>
    </div>
  );
}
