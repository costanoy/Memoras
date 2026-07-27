import { useState, useRef, useEffect } from 'react';
import { fmtFull, fmtTime } from '../dateUtils';
import { WARNING_VISIBLE_MS } from '../constants';

export function DetailScreen({ entry, onBack }) {
  const [warningVisible, setWarningVisible] = useState(false);
  const warnTimer = useRef(null);

  useEffect(() => () => clearTimeout(warnTimer.current), []);

  if (!entry) {
    return (
      <div className="screen detail-screen">
        <div className="detail-topbar">
          <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
            ‹
          </button>
        </div>
      </div>
    );
  }

  const showWarning = () => {
    clearTimeout(warnTimer.current);
    setWarningVisible(true);
    warnTimer.current = setTimeout(() => setWarningVisible(false), WARNING_VISIBLE_MS);
  };

  return (
    <div className="screen detail-screen screen--aged">
      <div className="detail-topbar">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <span className="badge">Bloqueada</span>
      </div>
      <div className="read-head">
        <div className="detail-date">{fmtFull(entry.createdAt)}</div>
        <div className="detail-time">{fmtTime(entry.createdAt)}</div>
        <div className="detail-title">{entry.title && entry.title.trim() ? entry.title : 'Sem título'}</div>
      </div>
      <div className="notebook-lines detail-body">
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
      </div>
      {warningVisible && <div className="toast">Este texto não é mais editável</div>}
    </div>
  );
}
