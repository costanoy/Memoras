import { useState, type FormEvent } from 'react';
import { go, set, toast, useApp } from '../store';
import { friendly, login, signUp } from '../sync';

export function Auth() {
  const s = useApp(), signup = s.authMode === 'signup';
  const [email, setEmail] = useState(s.fEmail);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const showKey = (key: string) => go('recovery', { shownKey: key, recReturn: s.authReturn === 'onboard' ? 'onboardPin' : 'settings' });
  const mode = (m: 'signup' | 'login') => { set({ authMode: m }); setErr(''); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setInfo('');
    if (!/.+@.+\..+/.test(email)) return setErr('Digite um email válido.');
    if (signup && password.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.');
    if (!signup && !password) return setErr('Digite sua senha.');
    setBusy(true); setErr('');
    try {
      if (signup) {
        const r = await signUp(email, password);
        if (r.recKey) showKey(r.recKey);
        else { setPassword(''); set({ authMode: 'login' }); setInfo('Enviamos um email de confirmação. Abra o link e depois entre aqui.'); }
      } else {
        const r = await login(email, password);
        if (r.needKey) go('forgot', { fStep: 3, fEmail: email });
        else if (r.recKey) showKey(r.recKey);
        else if (s.authReturn === 'onboard') go('onboard', { onStep: 4 });
        else { go('history'); toast('Conta conectada. Sincronizando…'); }
      }
    } catch (x) { setErr(friendly(x)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flow">
      <form className="card" style={{ maxWidth: 420 }} onSubmit={submit} noValidate>
        <div className="seg2">
          <button type="button" className={'press' + (signup ? ' on' : '')} aria-pressed={signup} onClick={() => mode('signup')}>Criar conta</button>
          <button type="button" className={'press' + (!signup ? ' on' : '')} aria-pressed={!signup} onClick={() => mode('login')}>Entrar</button>
        </div>
        <div className="col" style={{ gap: 6 }}>
          <div className="h1">{signup ? 'Criar conta' : 'Entrar'}</div>
          <div className="small" style={{ display: 'grid' }}>
            <span style={{ gridArea: '1/1', visibility: signup ? 'visible' : 'hidden' }}>Para sincronizar entre aparelhos. Suas anotações são criptografadas antes de sair do aparelho.</span>
            <span style={{ gridArea: '1/1', visibility: signup ? 'hidden' : 'visible' }}>Entre para sincronizar este aparelho com os outros.</span>
          </div>
        </div>
        <label className="label">Email
          <input className="field" type="email" autoComplete="email" value={email} placeholder="voce@email.com" onChange={e => { setEmail(e.target.value); setErr(''); }} />
        </label>
        <label className="label">Senha
          <input className="field" type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password}
            placeholder={signup ? 'Mínimo 8 caracteres' : 'Sua senha'} onChange={e => { setPassword(e.target.value); setErr(''); }} />
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div className="small" role="status">{info}</div>}
        <button className={'gel' + (busy ? ' off' : '')} type="submit">{signup ? 'Criar conta' : 'Entrar'}</button>
        <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="link" style={{ padding: '8px 0' }} onClick={() => s.authReturn === 'onboard' ? go('onboard', { onStep: 3 }) : go('settings')}>Voltar</button>
          <button type="button" className="link u" style={{ padding: '8px 0' }} onClick={() => go('forgot', { fStep: 1, fEmail: email })}>Esqueci minha senha</button>
        </div>
      </form>
    </div>
  );
}
