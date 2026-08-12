import { useRef, useState } from 'react';
import { fmtFull } from '../dateUtils';

function indexAtFraction(fraction, count) {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(fraction * (count - 1))));
}

/**
 * A própria barra de rolagem da lista, ao estilo da galeria do Android:
 * arraste para percorrer o tempo, com um balão flutuante mostrando a data
 * exata sob o dedo/cursor. A lista por trás não tem barra nativa — esta
 * trilha é a única forma de rolar e navegar por data ao mesmo tempo.
 */
export function Timeline({ entries, scrollTop, scrollHeight, clientHeight, onScrollTo }) {
  const trackRef = useRef(null);
  const [dragIndex, setDragIndex] = useState(null);
  const draggingRef = useRef(false);

  if (entries.length === 0) return null;

  const posOf = (index) => `${(index / Math.max(entries.length - 1, 1)) * 100}%`;

  const canScroll = scrollHeight > clientHeight + 1;
  const maxScroll = Math.max(1, scrollHeight - clientHeight);
  const scrollFraction = canScroll ? Math.min(1, scrollTop / maxScroll) : 0;
  const thumbHeightFraction = canScroll ? Math.min(1, Math.max(0.06, clientHeight / scrollHeight)) : 1;
  const thumbTopFraction = scrollFraction * (1 - thumbHeightFraction);

  const fractionFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    return Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
  };

  const scrollToFraction = (fraction) => {
    onScrollTo(fraction);
    setDragIndex(indexAtFraction(fraction, entries.length));
  };

  const handlePointerDown = (e) => {
    trackRef.current.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    scrollToFraction(fractionFromEvent(e));
  };

  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    scrollToFraction(fractionFromEvent(e));
  };

  const endDrag = () => {
    draggingRef.current = false;
    setDragIndex(null);
  };

  return (
    <div
      ref={trackRef}
      className="sidebar__timeline"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <span className="sidebar__timeline-track" />
      {canScroll && (
        <span
          className="sidebar__timeline-thumb"
          style={{ top: `${thumbTopFraction * 100}%`, height: `${thumbHeightFraction * 100}%` }}
        />
      )}
      {dragIndex !== null && (
        <div className="sidebar__timeline-bubble" style={{ top: posOf(dragIndex) }}>
          {fmtFull(entries[dragIndex].createdAt)}
        </div>
      )}
    </div>
  );
}
