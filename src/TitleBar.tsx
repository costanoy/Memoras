import { useEffect, useLayoutEffect, useState, type MouseEvent } from 'react';
import { Icon } from './icons';
import { appAway, get, openDocOf, openNoteOf, phoneWidth, saveCfg, set, toast, useApp } from './store';
import { flushSync } from './sync';
import { installUpdate, useUpdate } from './updates';
import { startsMini, winApi as api } from './win';

// Ponte do app de Windows (electron/preload.cjs). Fora dele, não existe e não há barra de título.
export const hasTitleBar = !!api;
if (api) {
  document.documentElement.classList.add('electron');
  // Aberto já no Mini-Memoras: o primeiro desenho sai no tamanho certo.
  if (startsMini) document.documentElement.setAttribute('data-mini', '');
}

// Os botões da barra não tiram o foco (nem o cursor) do texto que está sendo escrito.
const keep = (e: MouseEvent) => e.preventDefault();

// Fechar: antes, manda para a conta o que ainda não foi e anota a hora da saída (para o tempo até
// pedir o PIN de novo valer com o app fechado). Espera no máximo 3 s.
export function closeApp() {
  appAway();
  void Promise.race([Promise.all([flushSync(), saveCfg()]), new Promise(r => setTimeout(r, 3000))]).then(() => api?.close());
}

let say: (t: string) => void = () => {};
const frames = () => new Promise<void>(r => { requestAnimationFrame(() => requestAnimationFrame(() => r())); setTimeout(r, 100); });
const resized = (w0: number) => new Promise<void>(r => {
  if (innerWidth !== w0) return r();
  const done = () => { clearTimeout(t); removeEventListener('resize', done); r(); };
  const t = setTimeout(done, 250);
  addEventListener('resize', done);
});
const leaveMini = () => set({ mini: false, mobile: phoneWidth(), onTop: false, calOpen: false, agCal: false, menu: null });

// Mini-Memoras: a janela do tamanho do Cynote (643 × 523), com um layout próprio, uma coisa por vez.
// A página muda antes de a janela encolher (o layout do mini serve em qualquer tamanho) e depois de
// ela crescer de volta, para nunca aparecer o layout errado espremido.
let busy = false;
export async function toggleMini(fromClick = false) {
  if (busy || !api?.setMode) return;
  busy = true;
  const hadToggle = !!document.activeElement?.closest('[data-win=toggle]');
  try {
    const s = get();
    if (!s.mini) {
      // O que estava no painel da direita continua na tela.
      const screen = s.screen === 'history' && openNoteOf(s) ? 'editor' : s.screen === 'docs' && openDocOf(s) ? 'doc' : s.screen;
      set({ mini: true, mobile: false, screen, calOpen: false, agCal: false, menu: null });
      await frames();
      // Entrando pelo clique, o botão de voltar aparece bem embaixo do ponteiro.
      const b = document.querySelector('.titlebar [data-win=toggle]')?.getBoundingClientRect();
      const anchor = fromClick && b ? { dx: innerWidth - (b.left + b.width / 2), dy: b.top + b.height / 2 } : null;
      const r = await api.setMode('mini', anchor);
      if (r?.mode !== 'mini') { leaveMini(); return; }
      set({ onTop: r.top });
      if (r.first) toast('Este é o Mini-Memoras. Para voltar ao Memoras completo, use o botão no alto ou Ctrl+Shift+M.');
      say('Mini-Memoras');
    } else {
      const w0 = innerWidth;
      const r = await api.setMode('full');
      if (r?.mode !== 'full') return;
      await resized(w0);
      leaveMini();
      say('Memoras completo');
    }
    // Quem usava o botão pelo teclado continua nele (a barra é outra depois da troca).
    if (hadToggle) requestAnimationFrame(() => document.querySelector<HTMLElement>('.titlebar [data-win=toggle]')?.focus());
  } finally { busy = false; }
}
// "Manter por cima das outras janelas" (o "Fixar janela" do Cynote): só no mini, só enquanto o app está aberto.
export async function toggleOnTop() {
  if (!api?.setOnTop) return;
  const on = await api.setOnTop(!get().onTop);
  set({ onTop: on });
  toast(on ? 'O Memoras fica por cima das outras janelas' : 'O Memoras não fica mais por cima das outras janelas');
}
// Se o Windows maximizar a janela pequena mesmo assim, ela vira o Memoras completo (electron/main.cjs).
api?.onMode?.(m => { if (m.mode === 'full' && get().mini) { leaveMini(); say('Memoras completo'); } });

const PIP = <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="1.25" y="1.75" width="9.5" height="8.5" rx="1.5" /><rect x="5.5" y="5.5" width="3.75" height="3.25" rx=".7" fill="currentColor" stroke="none" /></svg>;
const EXPAND = <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="1.25" y="1.75" width="9.5" height="8.5" rx="1.5" /><path d="M4.25 7.75 8 4M5.5 4H8v2.5" /></svg>;
const MIN = <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><line x1="2" y1="9" x2="10" y2="9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
const MAX = <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="2" width="8" height="8" rx="1.5" /></svg>;
const RESTORE = <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="1.75" y="3.75" width="6.5" height="6.5" rx="1.2" /><path d="M4 3.5V2.6c0-.5.4-.85.85-.85h4.55c.45 0 .85.4.85.85v4.55c0 .45-.4.85-.85.85H8.5" /></svg>;
const CLOSE = <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;

// Barra de título do app de Windows: vidro, com o título brilhando e botões em gel, no lugar da
// moldura padrão. Arrastar move a janela; clique duplo maximiza (no Mini-Memoras, não).
export function TitleBar() {
  const s = useApp(), u = useUpdate();
  const [max, setMax] = useState(false), [live, setLive] = useState('');
  useEffect(() => { api?.onMaximized(setMax); say = setLive; }, []);
  useLayoutEffect(() => { document.documentElement.toggleAttribute('data-mini', s.mini); }, [s.mini]);
  if (!api) return null;
  const ready = u?.state === 'ready';
  const toggle = (
    <button className="tbtn" data-win="toggle" aria-label={s.mini ? 'Voltar ao Memoras completo' : 'Mudar para o Mini-Memoras'} aria-keyshortcuts="Control+Shift+M"
      title={s.mini ? 'Voltar ao Memoras completo (Ctrl+Shift+M)' : 'Mini-Memoras: janela pequena (Ctrl+Shift+M)'} onMouseDown={keep} onClick={() => void toggleMini(true)}>
      {s.mini ? EXPAND : PIP}
    </button>
  );
  return <>
    <div className={'titlebar' + (s.mini ? ' tbmini' : '')}>
      <img src="/icon-512.png" alt="" width={s.mini ? 18 : 20} height={s.mini ? 18 : 20} />
      <span className="tbtitle">Memoras</span>
      {/* Versão nova baixada: um clique fecha, instala e abre o app de novo. */}
      {ready && <button className="tbupd" title={'Reiniciar e instalar a versão ' + u.version} onMouseDown={keep} onClick={installUpdate}>{s.mini ? 'Atualizar' : 'Atualizar para ' + u.version}</button>}
      <div className="tbtns">
        {s.mini && (
          <button className={'tbtn' + (s.onTop ? ' on' : '')} aria-pressed={s.onTop} aria-label="Manter por cima das outras janelas" title="Manter por cima das outras janelas"
            onMouseDown={keep} onClick={() => void toggleOnTop()}>
            <Icon name="ontop" size={14} sw={2.3} />
          </button>
        )}
        {toggle}
        <span className="tbsep" aria-hidden="true" />
        <button className="tbtn" aria-label="Minimizar" title="Minimizar" onMouseDown={keep} onClick={() => api?.minimize()}>{MIN}</button>
        {!s.mini && <button className="tbtn" aria-label={max ? 'Restaurar' : 'Maximizar'} title={max ? 'Restaurar' : 'Maximizar'} onMouseDown={keep} onClick={() => api?.toggleMaximize()}>{max ? RESTORE : MAX}</button>}
        <button className="tbtn close" aria-label="Fechar" title="Fechar" onClick={closeApp}>{CLOSE}</button>
      </div>
    </div>
    {/* Avisa o leitor de tela da troca de tamanho. */}
    <div className="sr-only" role="status" aria-live="polite">{live}</div>
  </>;
}
