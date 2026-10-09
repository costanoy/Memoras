import { useEffect, useState } from 'react';
import { flashKey, get, go, pressKey, set, setCfg, useApp } from '../store';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function Pin() {
  const s = useApp();
  const [, tick] = useState(0);
  const locked = s.cfg.lockUntil > Date.now();

  useEffect(() => {
    if (!locked) return;
    const iv = setInterval(() => {
      if (get().cfg.lockUntil <= Date.now()) { setCfg({ lockUntil: 0 }); set({ pinError: false, pinMsg: '' }); }
      tick(x => x + 1);
    }, 500);
    return () => clearInterval(iv);
  }, [locked]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); flashKey(e.key); pressKey(e.key); }
      else if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); flashKey('del'); pressKey('del'); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const title = s.pinMode === 'unlock' ? 'Digite seu PIN' : s.pinMode === 'verify' ? 'Digite o PIN atual' : s.pinMode === 'create' ? 'Crie um PIN de 4 dígitos' : 'Digite o PIN de novo';
  const msg = locked ? 'Muitas tentativas. Tente de novo em ' + Math.ceil((s.cfg.lockUntil - Date.now()) / 1000) + ' s.' : s.pinMsg;

  return (
    <div className="flow">
      <div className="card" style={{ maxWidth: 360, alignItems: 'center', gap: 22, padding: '34px 24px 28px' }}>
        <div className="col" style={{ alignItems: 'center', gap: 4, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink4)', letterSpacing: '.04em' }}>{s.cfg.diaryName}</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{title}</div>
        </div>
        <div key={s.shake} className={'dots' + (s.shake ? ' shake' : '') + (s.pinError ? ' bad' : '')}>
          {[0, 1, 2, 3].map(i => <i key={i} className={i < s.pin.length ? 'f' : ''} />)}
        </div>
        <div className="err" role="status" style={{ minHeight: 22, textAlign: 'center' }}>{msg}</div>
        <div className={'keys' + (locked ? ' locked' : '')}>
          {KEYS.map((k, i) => (
            <button key={i} className={'key press' + (s.pressedKey === k && k ? ' hit' : '')} aria-label={k === 'del' ? 'Apagar' : k}
              style={{ visibility: k ? 'visible' : 'hidden', fontSize: k === 'del' ? 22 : 28 }} onClick={() => k && pressKey(k)}>
              {k === 'del' ? '⌫' : k}
            </button>
          ))}
        </div>
        {s.pinMode === 'unlock'
          ? <button className="link" onClick={() => go('forgotPin')}>Esqueci o PIN</button>
          : <button className="link" onClick={() => { set({ pinMode: 'unlock', pin: '', pinMsg: '', pinError: false }); go(s.pinReturn); }}>Cancelar</button>}
      </div>
    </div>
  );
}
