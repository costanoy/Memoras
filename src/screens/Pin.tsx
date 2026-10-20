import { useEffect, useState } from 'react';
import { bioVerify, isNative } from '../native';
import { bioUnlocked, fixLockClock, flashKey, go, lockLeft, pressKey, set, setCfg, useApp } from '../store';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

export function Pin() {
  const s = useApp();
  const [, tick] = useState(0);
  const left = lockLeft(), locked = left > 0;
  // Com a digital ligada neste aparelho, o leitor abre sozinho; cancelando, fica o teclado do PIN.
  const bio = isNative && s.cfg.bioOn && s.pinMode === 'unlock';
  const askBio = () => void bioVerify().then(ok => { if (ok) bioUnlocked(); });
  useEffect(() => { if (bio) askBio(); }, [bio]);

  useEffect(() => {
    fixLockClock();
    if (!locked) return;
    const iv = setInterval(() => {
      fixLockClock();
      if (lockLeft() <= 0) { setCfg({ lockUntil: 0 }); set({ pinError: false, pinMsg: '' }); }
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

  const title = s.pinMode === 'unlock' ? 'Digite seu PIN' : s.pinMode === 'verify' ? (s.pinAfter === 'on' ? 'Digite o PIN da sua conta' : 'Digite o PIN atual') : s.pinMode === 'create' ? 'Crie um PIN de 4 dígitos' : 'Digite o PIN de novo';
  const cancel = () => { set({ pinMode: 'unlock', pin: '', pinMsg: '', pinError: false }); go(s.pinReturn); };
  const wait = left > 60000 ? Math.ceil(left / 60000) + ' min' : Math.ceil(left / 1000) + ' s';
  const msg = locked ? 'Muitas tentativas. Tente de novo em ' + wait + '.' : s.pinMsg;

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
        <div className="row" style={{ gap: 22, justifyContent: 'center', flexWrap: 'wrap' }}>
          {s.pinMode !== 'unlock' && <button className="link" onClick={cancel}>Cancelar</button>}
          {bio && <button className="link" onClick={askBio}>Usar a digital</button>}
          {(s.pinMode === 'unlock' || s.pinMode === 'verify') && <button className="link" onClick={() => go('forgotPin')}>Esqueci o PIN</button>}
        </div>
      </div>
    </div>
  );
}
