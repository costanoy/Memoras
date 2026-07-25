import { useState } from 'react';
import { EntryCard } from '../components/EntryCard';
import { ActionSheet } from '../components/ActionSheet';
import { LockIcon, NewNoteIcon, SearchIcon, TrashIcon, ArchiveIcon } from '../components/Icons';

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
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <div className="screen history-screen">
      <div className="history-topbar">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <span className="topbar-title">Histórico</span>
        <div className="history-topbar__actions">
          <button type="button" className="icon-button icon-button--round" onClick={onOpenSecurity} aria-label="Segurança">
            <LockIcon />
          </button>
          <button type="button" className="icon-button icon-button--round" onClick={onNewEntry} aria-label="Nova anotação">
            <NewNoteIcon size={17} />
          </button>
        </div>
      </div>

      <div className="history-grid">
        {entries.length === 0 && <div className="empty-state">Nenhuma anotação por aqui ainda.</div>}
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            now={now}
            isSelected={entry.id === selectedId}
            onOpen={onOpenEntry}
            onLongPress={setSheetEntry}
          />
        ))}
      </div>

      {fabOpen && <div className="fab-scrim" onClick={() => setFabOpen(false)} />}
      <div className="fab-stack">
        {fabOpen && (
          <div className="fab-menu">
            <button
              type="button"
              className="fab-menu__item"
              onClick={() => { setFabOpen(false); onOpenSearch(); }}
            >
              <SearchIcon size={17} />
              <span>Pesquisar</span>
            </button>
            <button
              type="button"
              className="fab-menu__item"
              onClick={() => { setFabOpen(false); onOpenTrash(); }}
            >
              <TrashIcon size={17} />
              <span>Lixeira</span>
            </button>
            <button
              type="button"
              className="fab-menu__item"
              onClick={() => { setFabOpen(false); onOpenArchive(); }}
            >
              <ArchiveIcon size={17} />
              <span>Arquivadas</span>
            </button>
          </div>
        )}
        <button
          type="button"
          className={`fab${fabOpen ? ' fab--open' : ''}`}
          onClick={() => setFabOpen((o) => !o)}
          aria-label="Mais opções"
          aria-expanded={fabOpen}
        >
          +
        </button>
      </div>

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
