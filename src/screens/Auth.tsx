import { useRef, useState, type FormEvent } from 'react';
import { go, set, toast, useApp } from '../store';
import { friendly, login, signUp } from '../sync';

export function Auth() {
  const s = useApp(), signup = s.authMode === 'signup';
  const [email, setEmail] = useState(s.fEmail);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [errField, setErrField] = useState<'email' | 'password' | null>(null);
  const [ver, setVer] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null), passRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const showKey = (key: string) => go('recovery', { shownKey: key, recReturn: s.authReturn === 'onboard' ? 'onboardPin' : 'settings' });
  const mode = (m: 'signup' | 'login') => { set({ authMode: m }); setErr(''); setErrField(null); };
  const fail = (msg: string, f: 'email' | 'password') => { setErr(msg); setErrField(f); (f === 'email' ? emailRef : passRef).current?.focus(); };
  const clear = () => { setErr(''); setErrField(null); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setInfo('');
    if (!/.+@.+\..+/.test(email)) return fail('Digite um email válido.', 'email');
    if (signup && password.length < 8) return fail('A senha precisa ter pelo menos 8 caracteres.', 'password');
    if (!signup && !password) return fail('Digite sua senha.', 'password');
    setBusy(true); clear();
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
          <input ref={emailRef} className="field" type="email" autoComplete="email" value={email} placeholder="voce@email.com"
            aria-invalid={errField === 'email' ? 'true' : undefined} aria-describedby={errField === 'email' ? 'auth-err' : undefined}
            onChange={e => { setEmail(e.target.value); clear(); }} />
        </label>
        {err && errField === 'email' && <div className="err" id="auth-err" role="alert">{err}</div>}
        <label className="label">Senha
          <input ref={passRef} className="field" type={ver ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} value={password}
            placeholder={signup ? 'Mínimo 8 caracteres' : 'Sua senha'}
            aria-invalid={errField === 'password' ? 'true' : undefined}
            aria-describedby={[errField === 'password' ? 'auth-err' : '', signup ? 'auth-min' : ''].filter(Boolean).join(' ') || undefined}
            onChange={e => { setPassword(e.target.value); clear(); }} />
        </label>
        <button type="button" className="link" style={{ alignSelf: 'flex-start', padding: '4px 0' }} aria-pressed={ver} onClick={() => setVer(!ver)}>{ver ? 'Esconder senha' : 'Mostrar senha'}</button>
        {signup && <div className="meta" id="auth-min">Mínimo 8 caracteres</div>}
        {err && errField === 'password' && <div className="err" id="auth-err" role="alert">{err}</div>}
        {err && !errField && <div className="err" role="alert">{err}</div>}
        {info && <div className="small" role="status">{info}</div>}
        <button className={'gel' + (busy ? ' off' : '')} type="submit" aria-busy={busy}>{busy ? (signup ? 'Criando conta…' : 'Entrando…') : signup ? 'Criar conta' : 'Entrar'}</button>
        <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" className="link" style={{ padding: '8px 0' }} onClick={() => s.authReturn === 'onboard' ? go('onboard', { onStep: 3 }) : go('settings')}>Voltar</button>
          {!signup && <button type="button" className="link u" style={{ padding: '8px 0' }} onClick={() => go('forgot', { fStep: 1, fEmail: email })}>Esqueci minha senha</button>}
        </div>
      </form>
    </div>
  );
}
