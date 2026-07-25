import { useState } from 'react';
import { useEntries } from './hooks/useEntries';
import { useLock } from './hooks/useLock';
import { Sidebar } from './components/Sidebar';
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
  const store = useEntries();
  const lockState = useLock();
  const [screen, setScreen] = useState('write');
  const [detailId, setDetailId] = useState(null);

  if (lockState.loading || store.loading) {
    return <div className="app-shell app-shell--loading" />;
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
      setScreen('write');
    } else {
      setDetailId(entry.id);
      setScreen('detail');
    }
  };

  const newEntry = () => {
    store.createEntry();
    setScreen('write');
  };

  let content;
  if (screen === 'history') {
    content = (
      <HistoryScreen
        entries={store.activeEntries}
        now={store.now}
        selectedId={store.selectedId}
        onBack={() => setScreen('write')}
        onOpenEntry={openEntry}
        onNewEntry={newEntry}
        onOpenSecurity={() => setScreen('security')}
        onOpenSearch={() => setScreen('search')}
        onOpenTrash={() => setScreen('trash')}
        onOpenArchive={() => setScreen('archive')}
        onArchive={store.archiveEntry}
        onTrash={store.trashEntry}
      />
    );
  } else if (screen === 'detail') {
    content = (
      <DetailScreen
        entry={store.getEntry(detailId)}
        onBack={() => setScreen('history')}
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
        onBack={() => setScreen('write')}
      />
    );
  } else if (screen === 'search') {
    content = (
      <SearchScreen
        entries={store.entries}
        now={store.now}
        onBack={() => setScreen('history')}
        onOpenEntry={openEntry}
      />
    );
  } else if (screen === 'trash') {
    content = (
      <EntryListScreen
        title="Lixeira"
        entries={store.trashedEntries}
        emptyLabel="A lixeira está vazia."
        onBack={() => setScreen('history')}
        onOpenEntry={(entry) => {
          setDetailId(entry.id);
          setScreen('detail');
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
        onBack={() => setScreen('history')}
        onOpenEntry={(entry) => {
          setDetailId(entry.id);
          setScreen('detail');
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
        handleParagraphKeyDown={store.handleParagraphKeyDown}
        onOpenHistory={() => setScreen('history')}
        onNewEntry={newEntry}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        entries={store.activeEntries}
        selectedId={store.selectedId}
        onSelect={openEntry}
        onNewEntry={newEntry}
        onOpenSearch={() => setScreen('search')}
        onOpenTrash={() => setScreen('trash')}
        onOpenArchive={() => setScreen('archive')}
        onOpenSecurity={() => setScreen('security')}
      />
      <main className="app-main">{content}</main>
    </div>
  );
}

export default App;
