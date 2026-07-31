import { useState, useEffect } from 'react';
import { fmtShort } from '../dateUtils';
import { titleOf } from '../entryUtils';
import { LockIcon, NewNoteIcon, SearchIcon, TrashIcon, ArchiveIcon, UserIcon, MoreIcon } from '../components/Icons';
import { MemorasMark, MemorasOutline } from './Logo';
import { Timeline } from './Timeline';

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
  onArchive,
  onTrash,
}) {
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    if (!openMenuId) return undefined;
    const close = () => setOpenMenuId(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [openMenuId]);

  return (
    <aside className={`sidebar ${className}`.trim()}>
      <div className="sidebar__head">
        <MemorasMark height={30} />
        <button type="button" className="icon-button icon-button--round" onClick={onNewEntry} aria-label="Nova anotação">
          <NewNoteIcon size={17} />
        </button>
      </div>

      <div className="sidebar__body">
        <div className="sidebar__list">
          {entries.length === 0 && (
            <div className="empty-state empty-state--tight">
              <MemorasOutline height={54} />
              <span>Nenhuma anotação ainda.</span>
            </div>
          )}
          {entries.map((entry) => (
            <div key={entry.id} className="sidebar__row-wrap">
              <button
                type="button"
                className={`sidebar__row${entry.id === selectedId ? ' sidebar__row--active' : ''}`}
                onClick={() => onSelect(entry)}
              >
                <span className="sidebar__row-date">{fmtShort(entry.createdAt)}</span>
                <span className="sidebar__row-title">{titleOf(entry)}</span>
              </button>
              <button
                type="button"
                className="card-menu-button"
                aria-label="Opções da anotação"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuId((id) => (id === entry.id ? null : entry.id));
                }}
              >
                <MoreIcon size={15} />
              </button>
              {openMenuId === entry.id && (
                <div className="mini-menu">
                  <button
                    type="button"
                    className="mini-menu__item"
                    onClick={() => { onArchive(entry.id); setOpenMenuId(null); }}
                  >
                    Arquivar
                  </button>
                  <button
                    type="button"
                    className="mini-menu__item mini-menu__item--danger"
                    onClick={() => { onTrash(entry.id); setOpenMenuId(null); }}
                  >
                    Mover para lixeira
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        <Timeline entries={entries} onSelect={onSelect} />
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
