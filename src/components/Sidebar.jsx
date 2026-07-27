import { fmtShort } from '../dateUtils';
import { titleOf } from '../entryUtils';
import { LockIcon, NewNoteIcon, SearchIcon, TrashIcon, ArchiveIcon, UserIcon } from '../components/Icons';
import { MemorasLogo, MemorasOutline } from './Logo';

export function Sidebar({
  className = '',
  entries,
  selectedId,
  onSelect,
  onNewEntry,
  onOpenSearch,
  onOpenTrash,
  onOpenArchive,
  onOpenSecurity,
  onOpenAccount,
  accountEmail,
}) {
  return (
    <aside className={`sidebar ${className}`.trim()}>
      <div className="sidebar__head">
        <MemorasLogo height={22} />
        <button type="button" className="icon-button icon-button--round" onClick={onNewEntry} aria-label="Nova anotação">
          <NewNoteIcon size={17} />
        </button>
      </div>

      <div className="sidebar__list">
        {entries.length === 0 && (
          <div className="empty-state empty-state--tight">
            <MemorasOutline height={54} />
            <span>Nenhuma anotação ainda.</span>
          </div>
        )}
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
        <button type="button" className="sidebar__tool" onClick={onOpenAccount}>
          <UserIcon size={16} />
          <span className="sidebar__tool-text">{accountEmail ?? 'Entrar / criar conta'}</span>
        </button>
      </div>
    </aside>
  );
}
