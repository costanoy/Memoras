import { useState, useRef, useEffect, useCallback } from 'react';
import { SAVED_TOAST_MS } from './constants';
import { useEntries } from './hooks/useEntries';
import { useLock } from './hooks/useLock';
import { useAuth } from './hooks/useAuth';
import { AccountScreen } from './screens/AccountScreen';
import { Sidebar } from './components/Sidebar';
import { MemorasMark } from './components/Logo';
import { RestoreIcon, TrashIcon, ArchiveIcon } from './components/Icons';
import { WriteScreen } from './screens/WriteScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { DetailScreen } from './screens/DetailScreen';
import { SecurityScreen } from './screens/SecurityScreen';
import { SearchScreen } from './screens/SearchScreen';
import { EntryListScreen } from './screens/EntryListScreen';
import { LockScreen } from './screens/LockScreen';
import { isEditable } from './entryUtils';

function App() {
  const authState = useAuth();
  const store = useEntries(authState.user?.uid ?? null);
  const lockState = useLock();
  const [screen, setScreen] = useState('write');
  const [detailId, setDetailId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [savedToast, setSavedToast] = useState(false);
  const toastTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const { flushSaves, consumeDirty } = store;

  /** Sair da tela de digitação grava o pendente e confirma com "Salvo". */
  const goTo = useCallback(
    (next) => {
      setScreen((current) => {
        if (current === 'write' && next !== 'write') {
          flushSaves();
          if (consumeDirty()) {
            setSavedToast(true);
            clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setSavedToast(false), SAVED_TOAST_MS);
          }
        }
        return next;
      });
    },
    [flushSaves, consumeDirty]
  );

  if (authState.loading || lockState.loading || store.loading) {
    return (
      <div className="app-shell app-shell--loading">
        <div className="splash">
          <MemorasMark height={64} />
          <span className="splash__name">Memoras</span>
        </div>
      </div>
    );
  }

  if (lockState.locked) {
    return (
      <div className="app-shell app-shell--plain">
        <LockScreen verifyPin={lockState.verifyPin} />
      </div>
    );
  }

  const openEntry = (entry) => {
    if (isEditable(entry, store.now)) {
      store.selectEntry(entry.id);
      goTo('write');
    } else {
      setDetailId(entry.id);
      goTo('detail');
    }
  };

  const newEntry = () => {
    store.createEntry();
    goTo('write');
  };

  let content;
  if (screen === 'history') {
    content = (
      <HistoryScreen
        entries={store.activeEntries}
        now={store.now}
        selectedId={store.selectedId}
        onBack={() => goTo('write')}
        onOpenEntry={openEntry}
        onNewEntry={newEntry}
        onOpenSecurity={() => goTo('security')}
        onOpenSearch={() => goTo('search')}
        onOpenTrash={() => goTo('trash')}
        onOpenArchive={() => goTo('archive')}
        onArchive={store.archiveEntry}
        onTrash={store.trashEntry}
      />
    );
  } else if (screen === 'detail') {
    content = (
      <DetailScreen
        entry={store.getEntry(detailId)}
        onBack={() => goTo('history')}
      />
    );
  } else if (screen === 'security') {
    content = (
      <SecurityScreen
        passwordEnabled={lockState.passwordEnabled}
        hasPin={lockState.hasPin}
        setPasswordEnabled={lockState.setPasswordEnabled}
        setPin={lockState.setPin}
        clearPin={lockState.clearPin}
        onBack={() => goTo('write')}
        onOpenAccount={() => goTo('account')}
        accountEmail={authState.user?.email ?? null}
      />
    );
  } else if (screen === 'account') {
    content = <AccountScreen authState={authState} onBack={() => goTo('write')} />;
  } else if (screen === 'search') {
    content = (
      <SearchScreen
        entries={store.entries}
        now={store.now}
        onBack={() => goTo('history')}
        onOpenEntry={openEntry}
      />
    );
  } else if (screen === 'trash') {
    content = (
      <EntryListScreen
        title="Lixeira"
        entries={store.trashedEntries}
        emptyLabel="A lixeira está vazia."
        onBack={() => goTo('history')}
        onOpenEntry={(entry) => {
          setDetailId(entry.id);
          goTo('detail');
        }}
        actions={[
          { label: 'Restaurar', icon: <RestoreIcon size={16} />, onSelect: (e) => store.restoreEntry(e.id) },
          {
            label: 'Apagar para sempre',
            confirmLabel: 'Confirmar exclusão',
            confirm: true,
            danger: true,
            icon: <TrashIcon size={16} />,
            onSelect: (e) => store.deleteForever(e.id),
          },
        ]}
      />
    );
  } else if (screen === 'archive') {
    content = (
      <EntryListScreen
        title="Arquivadas"
        entries={store.archivedEntries}
        emptyLabel="Nenhuma anotação arquivada."
        onBack={() => goTo('history')}
        onOpenEntry={(entry) => {
          setDetailId(entry.id);
          goTo('detail');
        }}
        actions={[
          { label: 'Restaurar', icon: <RestoreIcon size={16} />, onSelect: (e) => store.restoreEntry(e.id) },
          { label: 'Mover para lixeira', icon: <ArchiveIcon size={16} />, danger: true, onSelect: (e) => store.trashEntry(e.id) },
        ]}
      />
    );
  } else {
    content = (
      <WriteScreen
        entry={store.selectedEntry}
        now={store.now}
        setTitle={store.setTitle}
        setParagraphText={store.setParagraphText}
        resetParagraphs={store.resetParagraphs}
        handleParagraphKeyDown={store.handleParagraphKeyDown}
        onOpenHistory={() => goTo('history')}
        onNewEntry={newEntry}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        className={panelOpen ? '' : 'sidebar--closed'}
        entries={store.activeEntries}
        selectedId={store.selectedId}
        onSelect={openEntry}
        onNewEntry={newEntry}
        onOpenSearch={() => goTo('search')}
        onOpenTrash={() => goTo('trash')}
        onOpenArchive={() => goTo('archive')}
        onOpenSecurity={() => goTo('security')}
        onOpenAccount={() => goTo('account')}
        accountEmail={authState.user?.email ?? null}
        onArchive={store.archiveEntry}
        onTrash={store.trashEntry}
      />
      <button
        type="button"
        className={`panel-toggle${panelOpen ? '' : ' panel-toggle--closed'}`}
        onClick={() => setPanelOpen((o) => !o)}
        aria-label={panelOpen ? 'Fechar histórico' : 'Abrir histórico'}
        aria-expanded={panelOpen}
      >
        H
      </button>
      <main className={`app-main${panelOpen ? '' : ' app-main--wide'}`}>{content}</main>
      {savedToast && <div className="toast toast--saved">Salvo</div>}
    </div>
  );
}

export default App;
