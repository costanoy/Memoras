import { useEffect } from 'react';
import { confirmDo, inApp, set, toastUndo, useApp } from './store';
import { Auth } from './screens/Auth';
import { Forgot, ForgotPin } from './screens/Forgot';
import { PinKey, Recovery } from './screens/Keys';
import { Onboard } from './screens/Onboard';
import { Pin } from './screens/Pin';
import { Shell } from './screens/Shell';
import { TitleBar } from './TitleBar';

export function App() {
  const s = useApp(), scr = s.screen, c = s.confirm;
  // Esc fecha a confirmação de apagar, como o Cancelar.
  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ confirm: null }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c]);
  return <>
    <div className="stage">
      <div className="deco haze" /><div className="deco b1" /><div className="deco b2" /><div className="deco b3" /><div className="deco b4" />
      <TitleBar />

      {scr === 'pin' && <Pin />}
      {scr === 'onboard' && <Onboard />}
      {scr === 'auth' && <Auth />}
      {scr === 'recovery' && <Recovery />}
      {scr === 'forgot' && <Forgot />}
      {scr === 'forgotPin' && <ForgotPin />}
      {scr === 'pinkey' && <PinKey />}
      {inApp(scr) && <Shell />}

      {s.toast && (
        <div className={'toast' + (s.mobile && inApp(scr) && scr !== 'editor' && scr !== 'doc' ? ' up' : '') + (s.toast.undo ? ' undo' : '')} role="status">
          <span>{s.toast.text}</span>
          {s.toast.undo && <button className="gel" onClick={toastUndo}>Desfazer</button>}
        </div>
      )}

      {c && (
        <div className="modal" role="dialog" aria-modal="true">
          <div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{c.reset ? 'Apagar todo o diário deste aparelho?' : c.all ? 'Esvaziar a lixeira?' : 'Apagar para sempre?'}</div>
            <div className="p" style={{ color: 'var(--ink3)' }}>{c.reset ? 'Isso não pode ser desfeito.' : 'Isso não pode ser desfeito, nem em outros aparelhos.'}</div>
            <div className="row" style={{ gap: 10, marginTop: 6 }}>
              <button className="soft press" style={{ flex: 1, height: 48, fontSize: 16 }} autoFocus onClick={() => set({ confirm: null })}>Cancelar</button>
              <button className="gel red" style={{ flex: 1, height: 48, fontSize: 16, padding: 0 }} onClick={confirmDo}>Apagar</button>
            </div>
          </div>
        </div>
      )}

      {s.unlocking && (
        <div className="unlock">
          <div className="lock">
            <div className="shackle" />
            <div className="body"><div className="gloss" /><div className="hole" /><div className="keybar" /><div className="sheen" /></div>
          </div>
        </div>
      )}
    </div>

    {(scr === 'recovery' || scr === 'pinkey') && (
      <div className="print">
        {scr === 'recovery' ? 'Chave de recuperação do Memoras' : 'Chave do PIN do Memoras'}
        <b>{s.shownKey}</b>
        Guarde este papel em um lugar seguro. Quem tiver esta chave pode abrir o diário.
      </div>
    )}
  </>;
}
