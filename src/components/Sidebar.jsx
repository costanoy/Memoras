import { fmtShort } from '../dateUtils';
import { titleOf } from '../entryUtils';
import { LockIcon, NewNoteIcon, SearchIcon, TrashIcon, ArchiveIcon } from '../components/Icons';

export function Sidebar({
  entries,
  selectedId,
  onSelect,
  onNewEntry,
  onOpenSearch,
  onOpenTrash,
  onOpenArchive,
  onOpenSecurity,
}) {
  return (
    <aside className="sidebar">
      <div className="sidebar__head">
        <span className="sidebar__title">Meu diário</span>
        <button type="button" className="icon-button icon-button--round" onClick={onNewEntry} aria-label="Nova anotação">
          <NewNoteIcon size={17} />
        </button>
      </div>

      <div className="sidebar__list">
        {entries.length === 0 && <div className="empty-state empty-state--tight">Nenhuma anotação.</div>}
        {entries.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className={`sidebar__row${entry.id === selectedId ? ' sidebar__row--active' : ''}`}
            onClick={() => onSelect(entry)}
          >
            <span className="sidebar__row-date">{fmtShort(entry.createdAt)}</span>
            <span className="sidebar__row-title">{titleOf(entry)}</span>
          </button>
        ))}
      </div>

      <div className="sidebar__foot">
        <button type="button" className="sidebar__tool" onClick={onOpenSearch}>
          <SearchIcon size={16} />
          <span>Pesquisar</span>
        </button>
        <button type="button" className="sidebar__tool" onClick={onOpenTrash}>
          <TrashIcon size={16} />
          <span>Lixeira</span>
        </button>
        <button type="button" className="sidebar__tool" onClick={onOpenArchive}>
          <ArchiveIcon size={16} />
          <span>Arquivadas</span>
        </button>
        <button type="button" className="sidebar__tool" onClick={onOpenSecurity}>
          <LockIcon size={16} />
          <span>Segurança</span>
        </button>
      </div>
    </aside>
  );
}
