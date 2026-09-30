import { setPrefs, useApp } from './store';
import { THEME_META } from './themes';
export { Icon } from './icons';

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
