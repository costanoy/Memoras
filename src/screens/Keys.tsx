import { useState } from 'react';
import { commitPendingPin, go, toast, useApp } from '../store';

function KeyActions({ value, heading, file }: { value: string; heading: string; file: string }) {
  const [done, setDone] = useState({ copied: false, saved: false, printed: false });
  const copy = async () => { try { await navigator.clipboard.writeText(value); setDone(d => ({ ...d, copied: true })); } catch { toast('Não deu para copiar. Selecione a chave e copie.'); } };
  const save = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([heading + '\n\n' + value + '\n'], { type: 'text/plain' }));
    a.download = file;
    a.click();
    URL.revokeObjectURL(a.href);
    setDone(d => ({ ...d, saved: true }));
  };
  const print = () => { window.print(); setDone(d => ({ ...d, printed: true })); };
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
      <button className={'keyact press' + (done.copied ? ' done' : '')} onClick={copy}>{done.copied ? 'Copiada' : 'Copiar'}</button>
      <button className={'keyact press' + (done.saved ? ' done' : '')} onClick={save}>{done.saved ? 'Arquivo salvo' : 'Salvar arquivo'}</button>
      <button className={'keyact press' + (done.printed ? ' done' : '')} onClick={print}>{done.printed ? 'Impressa' : 'Imprimir'}</button>
    </div>
  );
}

function Kept({ on, toggle }: { on: boolean; toggle: () => void }) {
  return <button className={'check press' + (on ? ' on' : '')} aria-pressed={on} onClick={toggle}><i>{on ? '✓' : ''}</i>Guardei minha chave</button>;
}

export function Recovery() {
  const s = useApp(), key = s.shownKey;
  const [emailed, setEmailed] = useState(false);
  const [kept, setKept] = useState(false);
  const mail = () => {
    setEmailed(true);
    location.href = 'mailto:' + encodeURIComponent(s.cfg.account?.email ?? '') + '?subject=' + encodeURIComponent('Chave de recuperação do Memoras')
      + '&body=' + encodeURIComponent('Minha chave de recuperação do Memoras:\n\n' + key + '\n\nGuarde este email. Quem tiver esta chave pode reabrir o diário.');
  };
  const done = () => {
    if (!kept) return;
    if (s.recReturn === 'onboardPin') go('onboard', { onStep: 4, shownKey: '' });
    else { go('settings', { shownKey: '' }); toast('Nova chave guardada'); }
  };
  return (
    <div className="flow">
      <div className="card" style={{ maxWidth: 500, padding: '30px 26px' }}>
        <div className="col" style={{ gap: 6 }}>
          <div className="h1">Sua chave de recuperação</div>
          <div className="p">Ela reabre suas anotações se você esquecer a senha. <strong>Esta chave aparece só agora.</strong> Guarde antes de continuar.</div>
        </div>
        <div className="keybox mono" style={{ fontSize: 19, letterSpacing: '.04em' }}>{key}</div>
        <button className="gel lime row" style={{ justifyContent: 'center', gap: 10, height: 54, padding: '0 20px' }} onClick={mail}>
          {emailed ? 'Email aberto' : 'Enviar para meu email'}
          <span style={{ fontSize: 12, letterSpacing: '.04em', padding: '3px 8px', borderRadius: 999, background: 'rgba(255,255,255,.75)', color: '#2d5a0c' }}>RECOMENDADO</span>
        </button>
        <KeyActions value={key} heading="Chave de recuperação do Memoras" file="memoras-chave-de-recuperacao.txt" />
        <div className="amber col" style={{ gap: 4 }}>
          <strong>Quem acessar seu email poderá abrir seu diário.</strong>
          <span>Se enviar a chave por email, ative a verificação em duas etapas na sua conta de email.</span>
        </div>
        <Kept on={kept} toggle={() => setKept(!kept)} />
        <button className={'gel' + (kept ? '' : ' off')} aria-disabled={!kept} onClick={done}>Continuar</button>
      </div>
    </div>
  );
}

export function PinKey() {
  const s = useApp();
  const [kept, setKept] = useState(false);
  const done = () => {
    if (!kept) return;
    commitPendingPin();
    go(s.pkReturn, { shownKey: '' });
    toast(s.pkMsg || 'PIN ativado');
  };
  return (
    <div className="flow">
      <div className="card">
        <div className="col" style={{ gap: 6 }}>
          <div className="h1">Chave do PIN</div>
          <div className="p">Sem conta, esta chave é a única forma de abrir o diário se você esquecer o PIN. <strong>Ela aparece só agora.</strong></div>
        </div>
        <div className="keybox mono" style={{ fontSize: 21, letterSpacing: '.05em' }}>{s.shownKey}</div>
        <KeyActions value={s.shownKey} heading="Chave do PIN do Memoras" file="memoras-chave-do-pin.txt" />
        <div className="small">Guarde fora deste aparelho: num gerenciador de senhas, impressa ou anotada em papel.</div>
        <Kept on={kept} toggle={() => setKept(!kept)} />
        <button className={'gel' + (kept ? '' : ' off')} aria-disabled={!kept} onClick={done}>Continuar</button>
      </div>
    </div>
  );
}
