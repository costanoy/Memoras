import { useState } from 'react';
import { normCode, verifySecret } from '../lib/crypto';
import { go, set, setCfg, startCreatePin, toast, useApp } from '../store';
import { friendly, reopenWithKey, sendReset, setNewPassword, startFresh, verifyAccount } from '../sync';

const CTA = ['Enviar link de redefinição', 'Salvar nova senha', 'Reabrir anotações', 'Ir para o diário'];

export function Forgot() {
  const s = useApp(), step = s.fStep;
  const [email, setEmail] = useState(s.fEmail);
  const [pass, setPass] = useState('');
  const [key, setKey] = useState('');
  const [noKey, setNoKey] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const next = async () => {
    if (busy) return;
    if (step === 1 && !/.+@.+\..+/.test(email)) return setErr('Digite o email da sua conta.');
    if (step === 2 && pass.length < 8) return setErr('A senha precisa ter pelo menos 8 caracteres.');
    if (step === 3 && !noKey && normCode(key).length < 20) return setErr('Chave incompleta. Confira e tente de novo.');
    if (step === 4) return go('history', { fStep: 1 });
    setBusy(true); setErr('');
    try {
      if (step === 1) { await sendReset(email); set({ fEmail: email }); setSent(true); }
      else if (step === 2) { await setNewPassword(pass); setPass(''); set({ fStep: 3 }); }
      else {
        const r = noKey ? await startFresh() : await reopenWithKey(key);
        if (r.recKey) { go('recovery', { shownKey: r.recKey, recReturn: 'settings', fStep: 1 }); toast('Diário novo criado nesta conta'); }
        else set({ fStep: 4 });
      }
    } catch (x) { setErr(friendly(x)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flow">
      <div className="card">
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink4)' }}>{step < 4 ? 'Passo ' + step + ' de 3' : 'Concluído'}</div>
        {step === 1 && <>
          <div className="h1">Esqueci minha senha</div>
          <div className="p col" style={{ gap: 10 }}>
            <span>São duas etapas:</span>
            <span><strong>1. Nova senha:</strong> para voltar a entrar na conta.</span>
            <span><strong>2. Chave de recuperação:</strong> para reabrir suas anotações. A senha nova sozinha não abre o diário.</span>
          </div>
          <input className="field" type="email" autoComplete="email" aria-label="Seu email" placeholder="Seu email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); setSent(false); }} />
          {sent && <div className="small" role="status">Enviamos um link para {s.fEmail}. Abra o link neste aparelho para continuar.</div>}
        </>}
        {step === 2 && <>
          <div className="h1">Crie uma nova senha</div>
          <div className="p">Abrimos o link enviado para {s.fEmail || 'seu email'}.</div>
          <input className="field" type="password" autoComplete="new-password" aria-label="Nova senha" placeholder="Nova senha, mínimo 8 caracteres" value={pass} onChange={e => { setPass(e.target.value); setErr(''); }} />
        </>}
        {step === 3 && <>
          <div className="h1">Agora, reabra suas anotações</div>
          <div style={{ padding: '14px 16px', borderRadius: 18, background: 'rgba(214,242,255,.85)', border: '1px solid #fff', fontSize: 15, lineHeight: 1.45, color: '#0c3a56' }}>
            Sua senha foi trocada. As anotações são criptografadas e só abrem com a <strong>chave de recuperação</strong> que você guardou no cadastro.
          </div>
          <textarea className="field mono" rows={2} aria-label="Chave de recuperação" placeholder="MEMO-XXXX-XXXX-XXXX-XXXX-XXXX" value={key} onChange={e => { setKey(e.target.value); setErr(''); }} />
          <button className="link u" style={{ alignSelf: 'flex-start', padding: 0 }} aria-pressed={noKey} onClick={() => { setNoKey(!noKey); setErr(''); }}>Não tenho a chave</button>
          {noKey && <div className="small">Sem a chave, as anotações antigas não podem ser reabertas, nem por nós. Você pode continuar usando a conta com um diário novo.</div>}
        </>}
        {step === 4 && <>
          <div className="h1">Tudo certo</div>
          <div className="p">Sua senha nova já funciona e suas anotações foram reabertas neste aparelho.</div>
        </>}
        {err && <div className="err" role="alert">{err}</div>}
        <button className={'gel' + (busy ? ' off' : '')} onClick={next}>{step === 3 && noKey ? 'Começar diário novo' : CTA[step - 1]}</button>
        <button className="link" style={{ alignSelf: 'center', padding: 6 }} onClick={() => go('auth', { authMode: 'login', fStep: 1 })}>Voltar para o login</button>
      </div>
    </div>
  );
}

export function ForgotPin() {
  const s = useApp(), acc = s.cfg.account;
  const [email, setEmail] = useState(acc?.email ?? '');
  const [pass, setPass] = useState('');
  const [key, setKey] = useState('');
  const [noKey, setNoKey] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const back = () => go('pin', { pinMode: 'unlock', pin: '' });

  const submit = async () => {
    if (busy) return;
    if (acc && (!/.+@.+\..+/.test(email) || !pass)) return setErr('Digite o email e a senha da conta.');
    setBusy(true); setErr('');
    try {
      const ok = acc ? await verifyAccount(email, pass) : await verifySecret(normCode(key), s.cfg.pinKeySalt, s.cfg.pinKeyHash);
      if (!ok) return setErr(acc ? 'Email ou senha incorretos.' : 'Chave não confere. Confira e tente de novo.');
      setPass('');
      setCfg({ lockUntil: 0, pinFails: 0 });
      set({ unlocked: true, pinError: false, pinMsg: '' });
      setDone(true);
    } catch (x) { setErr(friendly(x)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flow">
      <div className="card">
        {done ? <>
          <div className="h1">Tudo certo, é você</div>
          <div className="p">Crie um PIN novo agora ou desative o PIN neste aparelho.</div>
          <button className="gel" onClick={() => startCreatePin('history')}>Criar novo PIN</button>
          <button className="glassbtn press" style={{ height: 50 }} onClick={() => { setCfg({ pinOn: false }); go('history'); toast('PIN desativado neste aparelho'); }}>Desativar PIN</button>
        </> : acc ? <>
          <div className="h1">Esqueci o PIN</div>
          <div className="p">Entre com o email e a senha da sua conta para criar um PIN novo. Suas anotações continuam aqui.</div>
          <input className="field" type="email" autoComplete="email" aria-label="Email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); setErr(''); }} />
          <input className="field" type="password" autoComplete="current-password" aria-label="Senha" placeholder="Senha" value={pass} onChange={e => { setPass(e.target.value); setErr(''); }} onKeyDown={e => e.key === 'Enter' && submit()} />
          {err && <div className="err" role="alert">{err}</div>}
          <button className={'gel' + (busy ? ' off' : '')} onClick={submit}>Confirmar</button>
          <div className="row" style={{ justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <button className="link" style={{ padding: '6px 0' }} onClick={back}>Voltar</button>
            <button className="link" style={{ padding: '6px 0' }} onClick={() => go('forgot', { fStep: 1, fEmail: email, authReturn: 'settings' })}>Esqueci minha senha</button>
          </div>
        </> : <>
          <div className="h1">Esqueci o PIN</div>
          <div className="p">Digite a chave do PIN que você guardou quando ativou o PIN neste aparelho.</div>
          <textarea className="field mono" rows={1} style={{ fontSize: 18 }} aria-label="Chave do PIN" placeholder="PIN-XXXX-XXXX-XXXX" value={key} onChange={e => { setKey(e.target.value); setErr(''); }} />
          {err && <div className="err" role="alert">{err}</div>}
          <button className={'gel' + (busy ? ' off' : '')} onClick={submit}>Confirmar</button>
          <button className="link u" style={{ alignSelf: 'flex-start', padding: 0 }} aria-pressed={noKey} onClick={() => setNoKey(!noKey)}>Não tenho a chave</button>
          {noKey && (
            <div className="amber col" style={{ gap: 12, background: 'rgba(255,236,190,.85)' }}>
              <div>Sem conta e sem a chave, não há como abrir este diário. A única saída é apagar tudo neste aparelho e começar de novo.</div>
              <button className="soft danger press" style={{ alignSelf: 'flex-start' }} onClick={() => set({ confirm: { reset: true } })}>Apagar diário e recomeçar</button>
            </div>
          )}
          <button className="link" style={{ alignSelf: 'center' }} onClick={back}>Voltar</button>
        </>}
      </div>
    </div>
  );
}
