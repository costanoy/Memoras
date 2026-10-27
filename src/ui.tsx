import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from 'react';
import { monthYear, same } from './lib/notes';
import { setPrefs, useApp } from './store';
import { PAPERS, THEME_META } from './themes';
export { Icon } from './icons';

// Botão direito do mouse ou toque longo (celular) abrem o menu de opções de um item; pelo teclado, a
// tecla de menu ou Shift+F10. O toque longo que abriu o menu não vale como toque no item.
// allow: onde o menu pode abrir (no texto que se está editando ficam o copiar e o colar do sistema).
let press: { x: number; y: number; timer: number } | null = null, touchOpened = 0, eatUntil = 0;
const stopPress = () => { if (press) { clearTimeout(press.timer); press = null; } };
export function menuOn(open: (x: number, y: number, touch: boolean) => void, allow: (el: Element, touch: boolean) => boolean = () => true) {
  const fire = (x: number, y: number, touch: boolean) => { if (touch) { touchOpened = Date.now(); eatUntil = touchOpened + 700; } open(x, y, touch); };
  return {
    onContextMenu(e: MouseEvent) {
      const touch = !!press || (e.nativeEvent as globalThis.PointerEvent).pointerType === 'touch';
      if (!allow(e.target as Element, touch)) return;
      e.preventDefault();
      stopPress();
      // No Android o mesmo toque longo também chega aqui: se o menu acabou de abrir pelo tempo, não abre de novo.
      if (Date.now() - touchOpened > 800) fire(e.clientX, e.clientY, touch);
    },
    onPointerDown(e: PointerEvent) {
      if (e.pointerType === 'mouse' || !allow(e.target as Element, true)) return;
      stopPress();
      const x = e.clientX, y = e.clientY;
      press = { x, y, timer: window.setTimeout(() => { press = null; fire(x, y, true); }, 550) };
    },
    onPointerMove(e: PointerEvent) { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) stopPress(); },
    onPointerUp: stopPress,
    onPointerCancel: stopPress,
    onClickCapture(e: MouseEvent) { if (Date.now() < eatUntil) { e.preventDefault(); e.stopPropagation(); } },
    onKeyDown(e: KeyboardEvent) {
      if ((e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) || !allow(e.target as Element, false)) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      fire(r.left + 24, r.top + Math.min(r.height, 44), false);
    },
  };
}
// O campo que está sendo editado (nele, o toque longo e o botão direito são do sistema).
export const editing = (el: Element) => el === document.activeElement && el.matches('input, textarea');

// Botão "Cor" da anotação ou do caderno: mostra a cor atual e abre as amostras.
export function ColorPick({ value, onPick, mobile, label }: { value: string; onPick: (c: string) => void; mobile: boolean; label: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: Event) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', out); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', out); document.removeEventListener('keydown', esc); };
  }, [open]);
  const cur = PAPERS.find(p => p[0] === value) ?? PAPERS[0];
  return (
    <div ref={ref} className="colorpick">
      <button className="pill press" aria-label={label} aria-expanded={open} title={label} onClick={() => setOpen(!open)}>
        <span className="cdot" style={{ background: cur[0] ? cur[3] : '#fff' }} />{!mobile && 'Cor'}
      </button>
      {open && (
        <div className="colorpop" role="group" aria-label={label}>
          {PAPERS.map(([k, name, , sw]) => (
            <button key={k || 'sem'} className={'cswatch press' + (k === value ? ' on' : '')} aria-label={name} aria-pressed={k === value} title={name}
              style={{ background: sw }} onClick={() => { onPick(k); setOpen(false); }} />
          ))}
        </div>
      )}
    </div>
  );
}

// Campo de texto que cresce com o conteúdo (trechos do diário, cadernos, observações).
// Onde o navegador sabe crescer sozinho (field-sizing), ele cuida disso. Nos outros, o campo é
// medido a cada letra: para medir, ele encolhe por um instante e a tela perdia a rolagem (voltava
// ao topo e corria atrás do cursor). Por isso a rolagem de quem contém o campo é guardada e devolvida.
const NATIVE_GROW = typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content');
export function scrollerOf(el: HTMLElement | null) {
  for (let p = el?.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if (o === 'auto' || o === 'scroll') return p; }
  return null;
}
export function fitArea(el: HTMLTextAreaElement) {
  const sc = scrollerOf(el), top = sc?.scrollTop ?? 0;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
  if (sc && sc.scrollTop !== top) sc.scrollTop = top;
}
export function AutoArea({ value, placeholder, onChange, className = 'segtext', label, areaRef }: {
  value: string; placeholder: string; onChange: (v: string) => void; className?: string; label?: string; areaRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const own = useRef<HTMLTextAreaElement>(null), ref = areaRef ?? own;
  const fit = () => { if (!NATIVE_GROW && ref.current) fitArea(ref.current); };
  useLayoutEffect(fit, [value]);
  useEffect(() => { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, []);
  return <textarea ref={ref} className={className + (NATIVE_GROW ? ' grow' : '')} rows={1} value={value} placeholder={placeholder} aria-label={label} onChange={e => onChange(e.target.value)} />;
}

// Calendário do mês. "all": qualquer dia pode ser escolhido (agenda); sem ele, só os marcados (diário).
// done: dias com todas as tarefas feitas (agenda), marcados com ✓.
const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export function MonthCal({ y, m, onMove, has, isSel, onPick, all, done }: {
  y: number; m: number; onMove: (y: number, m: number) => void; has: (t: number) => boolean; isSel: (t: number) => boolean; onPick: (t: number) => void; all?: boolean; done?: (t: number) => boolean;
}) {
  const first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate();
  const move = (d: number) => { const x = new Date(y, m + d, 1); onMove(x.getFullYear(), x.getMonth()); };
  // Ao abrir numa janela muito baixa (em que a coluna rola), leva a coluna até o calendário inteiro.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollIntoView({ block: 'nearest' }); }, []);
  return (
    <div className="cal" ref={ref}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <button className="arrow press" aria-label="Mês anterior" onClick={() => move(-1)}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{monthYear(y, m)}</span>
        <button className="arrow press" aria-label="Próximo mês" onClick={() => move(1)}>›</button>
      </div>
      <div className="calgrid">
        {DOW.map((w, i) => <span key={i}>{w}</span>)}
        {Array.from({ length: first.getDay() }, (_, i) => <i key={'e' + i} />)}
        {Array.from({ length: dim }, (_, i) => {
          const t = new Date(y, m, i + 1).getTime(), h = has(t), sel = isSel(t), can = all || h, ok = h && !!done?.(t);
          return (
            <button key={i} className={'day' + (h ? ' has' : '') + (ok ? ' alldone' : '') + (can ? ' press pick' : '') + (same(t, Date.now()) ? ' today' : '') + (sel ? ' sel' : '')} tabIndex={can ? 0 : -1} aria-pressed={sel}
              aria-label={ok ? (i + 1) + ', tudo feito' : undefined} title={ok ? 'Tudo feito' : undefined} onClick={() => can && onPick(t)}>
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ThemeGrid() {
  const cur = useApp().cfg.theme;
  return (
    <div className="themes">
      {THEME_META.map(([k, label, sw]) => (
        <button key={k} className={'press' + (cur === k ? ' on' : '')} aria-label={label} aria-pressed={cur === k} onClick={() => setPrefs({ theme: k })}>
          <span className="sw" style={{ background: sw }} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}

export function SyncDot() {
  const s = useApp();
  if (s.cfg.account && s.sync === 'syncing') return <span className="spin" />;
  const c = !s.cfg.account ? '#6b8595' : { synced: '#2fae4f', offline: '#6b8595', error: '#d08a00', syncing: '' }[s.sync];
  return <span className="sdot" style={{ background: c, boxShadow: '0 0 0 3px ' + c + '33' }} />;
}
export const syncLabel = (hasAccount: boolean, sync: string) => !hasAccount ? 'Só neste aparelho'
  : ({ synced: 'Sincronizado', syncing: 'Sincronizando…', offline: 'Offline · salvo no aparelho', error: 'Não sincronizou · tentar de novo' } as Record<string, string>)[sync];

export function Toggle({ on }: { on: boolean }) {
  return <span className={'toggle' + (on ? ' on' : '')}><i /></span>;
}
