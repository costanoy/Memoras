import { useState } from 'react';
import { fmtFull, fmtTime } from '../dateUtils';
import { titleOf, snippetOf } from '../entryUtils';
import { MemorasOutline } from '../components/Logo';

export function EntryListScreen({ title, entries, emptyLabel, onBack, onOpenEntry, actions }) {
  const [confirmingId, setConfirmingId] = useState(null);

  return (
    <div className="screen list-screen">
      <div className="history-topbar">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <span className="topbar-title">{title}</span>
        <div />
      </div>

      <div className="list-body">
        {entries.length === 0 && (
          <div className="empty-state">
            <MemorasOutline height={78} />
            <span>{emptyLabel}</span>
          </div>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="list-row">
            <div className="list-row__main" onClick={() => onOpenEntry(entry)}>
              <span className="list-row__date">
                {fmtFull(entry.createdAt)} · {fmtTime(entry.createdAt)}
              </span>
              <span className="list-row__title">{titleOf(entry)}</span>
              <span className="list-row__snippet">{snippetOf(entry, 'Sem texto')}</span>
            </div>
            <div className="list-row__actions">
              {actions.map((a) => {
                const needsConfirm = a.confirm && confirmingId !== entry.id;
                return (
                  <button
                    key={a.label}
                    type="button"
                    className={`row-button${a.danger ? ' row-button--danger' : ''}`}
                    onClick={() => {
                      if (needsConfirm) {
                        setConfirmingId(entry.id);
                        return;
                      }
                      setConfirmingId(null);
                      a.onSelect(entry);
                    }}
                  >
                    {a.icon}
                    <span>{needsConfirm ? a.label : a.confirmLabel ?? a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
