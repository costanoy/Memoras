import { titleOf } from '../entryUtils';

export function ActionSheet({ entry, actions, onClose }) {
  if (!entry) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__title">{titleOf(entry)}</div>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            className={`sheet__action${a.danger ? ' sheet__action--danger' : ''}`}
            onClick={() => {
              a.onSelect(entry);
              onClose();
            }}
          >
            {a.icon}
            <span>{a.label}</span>
          </button>
        ))}
        <button type="button" className="sheet__cancel" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
