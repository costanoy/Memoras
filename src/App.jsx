import { useState } from 'react';
import { useDraft } from './hooks/useDraft';
import { useLock } from './hooks/useLock';
import { WriteScreen } from './screens/WriteScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { DetailScreen } from './screens/DetailScreen';
import { SecurityScreen } from './screens/SecurityScreen';
import { LockScreen } from './screens/LockScreen';

function App() {
  const draftState = useDraft();
  const lockState = useLock();
  const [screen, setScreen] = useState('write');
  const [detailId, setDetailId] = useState(null);

  if (lockState.loading || draftState.loading) {
    return <div className="app-shell app-shell--loading" />;
  }

  if (lockState.locked) {
    return (
      <div className="app-shell">
        <LockScreen verifyPin={lockState.verifyPin} />
      </div>
    );
  }

  const openEntry = (id) => {
    setDetailId(id);
    setScreen('detail');
  };

  let content;
  if (screen === 'history') {
    content = (
      <HistoryScreen
        draft={draftState.draft}
        entries={draftState.entries}
        onOpenCurrent={() => setScreen('write')}
        onOpenEntry={openEntry}
        onOpenSecurity={() => setScreen('security')}
      />
    );
  } else if (screen === 'detail') {
    content = (
      <DetailScreen
        entry={draftState.entries.find((e) => e.id === detailId)}
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
  } else {
    content = (
      <WriteScreen
        draft={draftState.draft}
        setTitle={draftState.setTitle}
        setParagraphText={draftState.setParagraphText}
        handleParagraphKeyDown={draftState.handleParagraphKeyDown}
        onOpenHistory={() => setScreen('history')}
      />
    );
  }

  return <div className="app-shell">{content}</div>;
}

export default App;
