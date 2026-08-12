import { useRef } from 'react';
import { fmtShort } from '../dateUtils';
import { titleOf, snippetOf, isEditable } from '../entryUtils';
import { MoreIcon } from './Icons';

const LONG_PRESS_MS = 500;

export function EntryCard({ entry, now, isSelected, onOpen, onLongPress, showMenu = false }) {
  const timer = useRef(null);
  const longPressed = useRef(false);

  const start = () => {
    longPressed.current = false;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onLongPress(entry);
    }, LONG_PRESS_MS);
  };
  const cancel = () => clearTimeout(timer.current);

  const handleClick = () => {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    onOpen(entry);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    onLongPress(entry);
  };

  const editable = isEditable(entry, now);

  return (
    <div
      className={`history-card${isSelected ? ' history-card--selected' : ''}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
    >
      <div className="history-card__head">
        <span className="history-card__date">{fmtShort(entry.createdAt)}</span>
        <div className="history-card__head-right">
          {!editable && <span className="history-card__flag">Bloqueada</span>}
          {showMenu && (
            <button
              type="button"
              className="card-menu-button"
              aria-label="Opções da anotação"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onLongPress(entry);
              }}
            >
              <MoreIcon size={18} />
            </button>
          )}
        </div>
      </div>
      <span className="history-card__title">{titleOf(entry)}</span>
      <span className="history-card__snippet">{snippetOf(entry)}</span>
    </div>
  );
}
