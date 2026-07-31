import { useRef, useState } from 'react';
import { fmtFull, fmtMonthLabel } from '../dateUtils';

/** Um rótulo por mês em que a lista muda — só no primeiro item de cada mês. */
function buildMonthMarks(entries) {
  const marks = [];
  let lastKey = null;
  entries.forEach((entry, index) => {
    const d = new Date(entry.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (key !== lastKey) {
      marks.push({ index, label: fmtMonthLabel(entry.createdAt) });
      lastKey = key;
    }
  });
  return marks;
}

function indexAtFraction(fraction, count) {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))));
}

/**
 * Trilha de datas ao estilo da galeria do Android: arraste para percorrer o
 * tempo, com um balão flutuante mostrando a data exata sob o dedo/cursor.
 */
export function Timeline({ entries, onSelect }) {
  const trackRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);

  if (entries.length === 0) return null;

  const marks = buildMonthMarks(entries);
  const posOf = (index) => `${(index / Math.max(entries.length - 1, 1)) * 100}%`;

  const indexFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const fraction = (e.clientY - rect.top) / rect.height;
    return indexAtFraction(fraction, entries.length);
  };

  const handlePointerDown = (e) => {
    trackRef.current.setPointerCapture(e.pointerId);
    setDragIndex(indexFromEvent(e));
  };

  const handlePointerMove = (e) => {
    if (dragIndex === null) return;
    setDragIndex(indexFromEvent(e));
  };

  const endDrag = () => {
    if (dragIndex !== null) onSelect(entries[dragIndex]);
    setDragIndex(null);
  };

  return (
    <div
      ref={trackRef}
      className="sidebar__timeline"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={() => setDragIndex(null)}
    >
      <span className="sidebar__timeline-track" />
      {marks.map((m) => (
        <span key={m.index} className="sidebar__timeline-label" style={{ top: posOf(m.index) }}>
          {m.label}
        </span>
      ))}
      {dragIndex !== null && (
        <div className="sidebar__timeline-bubble" style={{ top: posOf(dragIndex) }}>
          {fmtFull(entries[dragIndex].createdAt)}
        </div>
      )}
    </div>
  );
}
