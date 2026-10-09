import { useEffect, useLayoutEffect, useRef } from 'react';
import { monthYear, same } from './lib/notes';
import { setPrefs, useApp } from './store';
import { THEME_META } from './themes';
export { Icon } from './icons';

// Campo de texto que cresce com o conteúdo (trechos do diário, cadernos, observações).
export function AutoArea({ value, placeholder, onChange, className = 'segtext', label }: { value: string; placeholder: string; onChange: (v: string) => void; className?: string; label?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } };
  useLayoutEffect(fit, [value]);
  useEffect(() => { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }, []);
  return <textarea ref={ref} className={className} rows={1} value={value} placeholder={placeholder} aria-label={label} onChange={e => onChange(e.target.value)} />;
}

// Calendário do mês. "all": qualquer dia pode ser escolhido (agenda); sem ele, só os marcados (diário).
const DOW = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export function MonthCal({ y, m, onMove, has, isSel, onPick, all }: {
  y: number; m: number; onMove: (y: number, m: number) => void; has: (t: number) => boolean; isSel: (t: number) => boolean; onPick: (t: number) => void; all?: boolean;
}) {
  const first = new Date(y, m, 1), dim = new Date(y, m + 1, 0).getDate();
  const move = (d: number) => { const x = new Date(y, m + d, 1); onMove(x.getFullYear(), x.getMonth()); };
  return (
    <div className="cal">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
        <button className="arrow press" aria-label="Mês anterior" onClick={() => move(-1)}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{monthYear(y, m)}</span>
        <button className="arrow press" aria-label="Próximo mês" onClick={() => move(1)}>›</button>
      </div>
      <div className="calgrid">
        {DOW.map((w, i) => <span key={i}>{w}</span>)}
        {Array.from({ length: first.getDay() }, (_, i) => <i key={'e' + i} />)}
        {Array.from({ length: dim }, (_, i) => {
          const t = new Date(y, m, i + 1).getTime(), h = has(t), sel = isSel(t), can = all || h;
          return (
            <button key={i} className={'day' + (h ? ' has' : '') + (can ? ' press pick' : '') + (same(t, Date.now()) ? ' today' : '') + (sel ? ' sel' : '')} tabIndex={can ? 0 : -1} aria-pressed={sel}
              onClick={() => can && onPick(t)}>
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
