import { useState, useRef, useEffect, useCallback } from 'react';
import { SAVED_TOAST_MS, TYPING_PANEL_CLOSE_MS } from './constants';
import { useEntries } from './hooks/useEntries';
import { useLock } from './hooks/useLock';
import { useAuth } from './hooks/useAuth';
import { usePrefs } from './hooks/usePrefs';
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

/** O painel lateral só existe ≥900px — abaixo disso é a experiência "celular". */
function isMobile() {
  return typeof window !== 'undefined' && !window.matchMedia('(min-width: 900px)').matches;
}

function App() {
  const authState = useAuth();
  const store = useEntries(authState.user?.uid ?? null);
  const lockState = useLock();
  const prefs = usePrefs();
  // No celular a porta de entrada é o Histórico; no desktop o painel lateral
  // já cumpre esse papel, então continua abrindo direto na escrita de hoje.
  const [screen, setScreen] = useState(() => (isMobile() ? 'history' : 'write'));
  const [detailId, setDetailId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(true);
  const [savedToast, setSavedToast] = useState(false);
  const [slideBack, setSlideBack] = useState(false);
  const toastTimer = useRef(null);
  const panelCloseTimer = useRef(null);

  useEffect(() => () => clearTimeout(toastTimer.current), []);
  useEffect(() => () => clearTimeout(panelCloseTimer.current), []);

  /** Só agenda um fechamento por vez — a primeira tecla começa a contagem
   *  de 5s, teclas seguintes não a reiniciam. */
  const handleStartTyping = useCallback(() => {
    if (!panelOpen || panelCloseTimer.current) return;
    panelCloseTimer.current = setTimeout(() => {
      setPanelOpen(false);
      panelCloseTimer.current = null;
    }, TYPING_PANEL_CLOSE_MS);
  }, [panelOpen]);

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      const next = !open;
      // Reabriu manualmente — cancela o fechamento automático pendente para
      // não fechar de novo sem o usuário ter voltado a digitar.
      if (next) {
        clearTimeout(panelCloseTimer.current);
        panelCloseTimer.current = null;
      }
      return next;
    });
  }, []);

  const { flushSaves, consumeDirty } = store;

  /**
   * Sair de uma tela de digitação grava o pendente e confirma com "Salvo".
   * No celular, entrar numa anotação a partir do Histórico empurra um estado
   * de navegador — assim o botão físico de voltar do Android consome esse
   * estado e retorna ao Histórico, em vez de fechar o app.
   */
  const goTo = useCallback(
    (next) => {
      setScreen((current) => {
        if (current !== next) {
          flushSaves();
          if (consumeDirty()) {
            setSavedToast(true);
            clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setSavedToast(false), SAVED_TOAST_MS);
          }
        }

        const enteringNote = (next === 'write' || next === 'detail') && current === 'history';
        if (enteringNote && isMobile()) {
          window.history.pushState({ memorasBack: true }, '', window.location.href);
        }

        setSlideBack(next === 'history' && (current === 'write' || current === 'detail'));
        return next;
      });
    },
    [flushSaves, consumeDirty]
  );

  useEffect(() => {
    const onPopState = () => goTo('history');
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [goTo]);

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

  // O que está realmente na tela: o rascunho editável (selectedId) enquanto
  // se escreve, ou a anotação bloqueada aberta (detailId) na leitura. Usado
  // para destacar a linha certa no painel e na grade do histórico — sem
  // isso, abrir uma anotação bloqueada deixava a antiga marcada como ativa.
  const viewingId = screen === 'detail' ? detailId : store.selectedId;

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
        setEntryTitle={store.setEntryTitle}
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
        setEntryTitle={store.setEntryTitle}
        setParagraphText={store.setParagraphText}
        startNewBlock={store.startNewBlock}
        onOpenHistory={() => goTo('history')}
        onNewEntry={newEntry}
        onStartTyping={handleStartTyping}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        className={panelOpen ? '' : 'sidebar--closed'}
        entries={store.activeEntries}
        selectedId={viewingId}
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
        diaryName={prefs.diaryName}
        onDiaryNameChange={prefs.setDiaryName}
      />
      <button
        type="button"
        className={`panel-toggle${panelOpen ? '' : ' panel-toggle--closed'}`}
        onClick={togglePanel}
        aria-label={panelOpen ? 'Fechar histórico' : 'Abrir histórico'}
        aria-expanded={panelOpen}
      >
        H
      </button>
      <main className={`app-main${panelOpen ? '' : ' app-main--wide'}${slideBack ? ' app-main--slide-back' : ''}`}>
        {content}
      </main>
      {savedToast && <div className="toast toast--saved">Salvo</div>}
    </div>
  );
}

export default App;
