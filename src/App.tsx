import { useEffect, useRef } from 'react';
import { confirmDo, get, goBack, goSection, inApp, isLocked, isTool, openTool, set, toastUndo, useApp, type Section } from './store';
import { Auth } from './screens/Auth';
import { BioOffer } from './screens/BioOffer';
import { Forgot, ForgotPin } from './screens/Forgot';
import { PinKey, Recovery } from './screens/Keys';
import { ItemMenu } from './screens/Menu';
import { Onboard } from './screens/Onboard';
import { Pin } from './screens/Pin';
import { addNew, Shell } from './screens/Shell';
import { UpdateCard } from './screens/UpdateCard';
import { hasTitleBar, TitleBar, toggleMini } from './TitleBar';

const SECTIONS: Section[] = ['diario', 'cadernos', 'agenda'];
const inField = (t: EventTarget | null) => t instanceof Element && !!t.closest('input, textarea, [contenteditable="true"]');

// Atalhos do app de Windows (no navegador, Ctrl+N e Ctrl+F continuam sendo do navegador):
// Ctrl+Shift+M liga e desliga o Mini-Memoras (em qualquer tela); Ctrl+N cria um item na parte aberta;
// Ctrl+F abre a Busca; Ctrl+1, 2 e 3 vão para Diário, Cadernos e Agenda; Ctrl+Z desfaz o último aviso
// com "Desfazer". Esc (fora dos campos) e Alt+← voltam: das ferramentas sempre e, no Mini-Memoras,
// também dos itens (como o botão Voltar). Com o app travado, só o Mini-Memoras responde.
function useShortcuts() {
  useEffect(() => {
    if (!hasTitleBar) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.isComposing || e.metaKey) return;
      const ctrl = e.ctrlKey && !e.altKey;
      if (ctrl && e.shiftKey && e.code === 'KeyM') { e.preventDefault(); if (!e.repeat) void toggleMini(false); return; }
      const s = get();
      if (isLocked() || !inApp(s.screen) || s.unlocking || s.confirm || s.menu) return;
      if (ctrl && !e.shiftKey) {
        if (e.code === 'KeyN') { e.preventDefault(); if (!e.repeat) addNew(s); return; }
        if (e.code === 'KeyF') {
          e.preventDefault();
          if (s.screen !== 'search') openTool('search');
          requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.searchbox input')?.select());
          return;
        }
        const d = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
        if (d >= 0) { e.preventDefault(); goSection(SECTIONS[d]); return; }
        if (e.code === 'KeyZ' && s.toast?.undo && !inField(e.target)) { e.preventDefault(); toastUndo(); return; }
      }
      const back = (e.key === 'Escape' && !e.altKey && !e.ctrlKey && !e.shiftKey && !e.defaultPrevented && !inField(e.target)) || (e.altKey && !e.ctrlKey && e.key === 'ArrowLeft');
      if (back && (isTool(s.screen) || s.mini)) { e.preventDefault(); goBack(); }
    };
    // Botão de voltar do mouse, no Mini-Memoras.
    const onMouse = (e: MouseEvent) => {
      const s = get();
      if (e.button === 3 && s.mini && inApp(s.screen) && !isLocked() && !s.confirm && !s.menu) { e.preventDefault(); goBack(); }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mouseup', onMouse);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('mouseup', onMouse); };
  }, []);
}

export function App() {
  const s = useApp(), scr = s.screen, c = s.confirm, isDoc = !!c?.id && s.items.some(i => i.id === c.id);
  useShortcuts();
  // Esc fecha a confirmação de apagar, como o Cancelar. Ao fechar, o foco volta para quem abriu.
  const before = useRef<HTMLElement | null>(null), lastFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (c) return;
    // Sem confirmação aberta, guarda o último elemento focado no app (origem de verdade, mesmo se o foco cair no body).
    const on = (e: FocusEvent) => { const t = e.target as HTMLElement | null; if (t && t !== document.body && t.closest('.contents')) lastFocus.current = t; };
    document.addEventListener('focusin', on);
    return () => document.removeEventListener('focusin', on);
  }, [c]);
  useEffect(() => {
    if (!c) {
      const b = before.current;
      before.current = null;
      if (!document.activeElement || document.activeElement === document.body) {
        if (b?.isConnected) b.focus({ preventScroll: true });
        else if (b) {
          // A origem sumiu (o item foi para a lixeira): o foco vai para o primeiro botão disponível, nunca fica no body.
          const nx = [...document.querySelectorAll<HTMLElement>('.contents button')].find(x => !(x as HTMLButtonElement).disabled && x.getClientRects().length > 0);
          nx?.focus({ preventScroll: true });
        }
      }
      return;
    }
    const act = document.activeElement as HTMLElement | null;
    // O diálogo pode já ter pego o foco (autofoco do filho): aí vale o último foco de dentro do app.
    before.current ??= act && act.closest('.contents') ? act : lastFocus.current;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') set({ confirm: null }); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c]);
  const title = c ? (c.trash ? (isDoc ? 'Mover o caderno para a lixeira?' : 'Mover a anotação para a lixeira?') : c.reset ? 'Apagar todo o diário deste aparelho?' : c.all ? 'Esvaziar a lixeira?' : 'Apagar para sempre?') : '';
  const text = c ? (c.trash ? (isDoc ? 'Ele fica na Lixeira e pode ser restaurado.' : 'Ela fica na Lixeira e pode ser restaurada.') : c.reset ? 'Isso não pode ser desfeito.' : 'Isso não pode ser desfeito, nem em outros aparelhos.') : '';
  return <>
    <div className="stage">
      <div className="deco haze" /><div className="deco b1" /><div className="deco b2" /><div className="deco b3" /><div className="deco b4" />
      {/* Com a confirmação aberta, o resto do app fica fora de alcance (Tab não escapa para trás dela). */}
      <TitleBar />
      <div className="contents" inert={!!c}>
        {scr === 'pin' && <Pin />}
        {scr === 'onboard' && <Onboard />}
        {scr === 'auth' && <Auth />}
        {scr === 'recovery' && <Recovery />}
        {scr === 'forgot' && <Forgot />}
        {scr === 'forgotPin' && <ForgotPin />}
        {scr === 'pinkey' && <PinKey />}
        {inApp(scr) && <Shell />}
        {inApp(scr) && <UpdateCard />}
        {inApp(scr) && <BioOffer />}
        {inApp(scr) && <ItemMenu />}

        {s.toast && (
          <div className={'toast' + (s.mobile && inApp(scr) && scr !== 'editor' && scr !== 'doc' ? ' up' : '') + (s.toast.undo ? ' undo' : '')}>
            <span>{s.toast.text}</span>
            {s.toast.undo && <button className="gel" title={hasTitleBar ? 'Desfazer (Ctrl+Z)' : undefined} onClick={toastUndo}>Desfazer</button>}
          </div>
        )}
      </div>
      {/* Uma região sempre na tela para o leitor de tela anunciar os avisos (criada vazia, ela é lida). */}
      <div className="sr-only" role="status" aria-live="polite">{s.toast?.text ?? ''}</div>

      {c && (
        <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="mtitle" aria-describedby="mtext">
          <div>
            <div id="mtitle" className="mtitle">{title}</div>
            <div id="mtext" className="p" style={{ color: 'var(--ink3)' }}>{text}</div>
            <div className="row" style={{ gap: 10, marginTop: 6 }}>
              <button className="soft press" style={{ flex: 1, height: 48, fontSize: 16 }} autoFocus onClick={() => set({ confirm: null })}>Cancelar</button>
              <button className="gel red" style={{ flex: 1, height: 48, fontSize: 16, padding: 0 }} onClick={confirmDo}>{c.trash ? 'Mover' : 'Apagar'}</button>
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
