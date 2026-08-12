import { useState, useEffect } from 'react';
import { EntryCard } from '../components/EntryCard';
import { ActionSheet } from '../components/ActionSheet';
import { LockIcon, SearchIcon, TrashIcon, ArchiveIcon, MoreIcon } from '../components/Icons';
import { MemorasOutline } from '../components/Logo';

export function HistoryScreen({
  entries,
  now,
  selectedId,
  onBack,
  onOpenEntry,
  onNewEntry,
  onOpenSecurity,
  onOpenSearch,
  onOpenTrash,
  onOpenArchive,
  onArchive,
  onTrash,
}) {
  const [sheetEntry, setSheetEntry] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  return (
    <div className="screen history-screen">
      <div className="history-topbar">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <span className="topbar-title">Histórico</span>
        <div className="history-topbar__actions">
          <button type="button" className="icon-button icon-button--round" onClick={onOpenSecurity} aria-label="Segurança">
            <LockIcon size={18} />
          </button>
          <div className="history-menu">
            <button
              type="button"
              className="icon-button icon-button--round"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
              aria-label="Mais opções"
              aria-expanded={menuOpen}
            >
              <MoreIcon size={20} />
            </button>
            {menuOpen && (
              <div className="mini-menu mini-menu--history">
                <button type="button" className="mini-menu__item" onClick={() => { setMenuOpen(false); onOpenSearch(); }}>
                  <SearchIcon size={17} />
                  <span>Pesquisar</span>
                </button>
                <button type="button" className="mini-menu__item" onClick={() => { setMenuOpen(false); onOpenTrash(); }}>
                  <TrashIcon size={17} />
                  <span>Lixeira</span>
                </button>
                <button type="button" className="mini-menu__item" onClick={() => { setMenuOpen(false); onOpenArchive(); }}>
                  <ArchiveIcon size={17} />
                  <span>Arquivadas</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="history-grid">
        {entries.length === 0 && (
          <div className="empty-state">
            <MemorasOutline height={78} />
            <span>Nenhuma anotação por aqui ainda.</span>
          </div>
        )}
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            now={now}
            isSelected={entry.id === selectedId}
            onOpen={onOpenEntry}
            onLongPress={setSheetEntry}
            showMenu
          />
        ))}
      </div>

      <button type="button" className="fab" onClick={onNewEntry} aria-label="Nova anotação">
        +
      </button>

      <ActionSheet
        entry={sheetEntry}
        onClose={() => setSheetEntry(null)}
        actions={[
          { label: 'Arquivar', icon: <ArchiveIcon size={17} />, onSelect: (e) => onArchive(e.id) },
          { label: 'Mover para lixeira', icon: <TrashIcon size={17} />, onSelect: (e) => onTrash(e.id), danger: true },
        ]}
      />
    </div>
  );
}
