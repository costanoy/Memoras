import { go, set, setCfg, startCreatePin, useApp } from '../store';
import { ThemeGrid, Toggle } from '../ui';

const STORE = [
  { k: 'local', title: 'Só neste aparelho', text: 'Sem conta e sem internet. Você pode criar uma conta depois.' },
  { k: 'account', title: 'Criar conta', text: 'Sincroniza entre seus aparelhos, com criptografia de ponta a ponta.' },
] as const;

export function Onboard() {
  const s = useApp(), step = s.onStep;

  const next = () => {
    if (step === 1 && !s.cfg.diaryName.trim()) setCfg({ diaryName: 'Meu diário' });
    if (step < 3) set({ onStep: step + 1 });
    else if (s.storeMode === 'account' && !s.cfg.account) go('auth', { authMode: 'signup', authReturn: 'onboard' });
    else set({ onStep: 4 });
  };
  const finish = () => {
    setCfg({ onboarded: true, invite: true });
    set({ unlocked: true });
    void navigator.storage?.persist?.();
    if (s.obPin) startCreatePin('history'); else go('history');
  };
  const nav = (
    <div className="row" style={{ gap: 10 }}>
      <button className="glassbtn press" onClick={() => set({ onStep: step - 1 })}>Voltar</button>
      <button className="gel" style={{ flex: 1 }} onClick={next}>Continuar</button>
    </div>
  );

  return (
    <div className="flow">
      <div className="card" style={{ gap: 22, padding: '34px 30px 30px' }}>
        <div className="row" style={{ gap: 6 }}>
          {[1, 2, 3, 4].map(i => <div key={i} style={{ height: 6, flex: 1, borderRadius: 3, background: i <= step ? 'var(--gel)' : 'rgba(12,60,90,.12)' }} />)}
        </div>

        {step === 1 && <>
          <div className="col" style={{ gap: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink4)' }}>Boas-vindas ao Memoras</div>
            <div className="h0">Como vai se chamar seu diário?</div>
            <div className="p">Aparece no topo do app. Dá para mudar depois nas configurações.</div>
          </div>
          <input className="field" style={{ height: 54, borderRadius: 18, padding: '0 18px', fontSize: 18 }} value={s.cfg.diaryName} placeholder="Meu diário"
            aria-label="Nome do diário" onChange={e => setCfg({ diaryName: e.target.value })} onKeyDown={e => e.key === 'Enter' && next()} />
          <button className="gel" onClick={next}>Continuar</button>
        </>}

        {step === 2 && <>
          <div className="col" style={{ gap: 8 }}>
            <div className="h0">Escolha sua cor</div>
            <div className="p">Muda o fundo, os botões e os destaques. Dá para trocar depois nas configurações.</div>
          </div>
          <ThemeGrid />
          {nav}
        </>}

        {step === 3 && <>
          <div className="col" style={{ gap: 8 }}>
            <div className="h0">Onde guardar suas anotações?</div>
            <div className="p">O Memoras funciona sem internet nos dois casos.</div>
          </div>
          <div className="col" style={{ gap: 12 }}>
            {STORE.map(o => (
              <button key={o.k} className={'radio press' + (s.storeMode === o.k ? ' on' : '')} aria-pressed={s.storeMode === o.k} onClick={() => set({ storeMode: o.k })}>
                <i />
                <span className="col" style={{ gap: 3 }}>
                  <span style={{ fontSize: 18, fontWeight: 700 }}>{o.title}</span>
                  <span className="small">{o.text}</span>
                </span>
              </button>
            ))}
          </div>
          {nav}
        </>}

        {step === 4 && <>
          <div className="col" style={{ gap: 8 }}>
            <div className="h0">Proteger com um PIN?</div>
            <div className="p">O PIN pede um código de 4 dígitos ao abrir o app neste aparelho. É independente da senha da conta. Opcional.</div>
            <div className="small">{s.cfg.account ? 'Se esquecer, é só entrar com sua conta para criar outro.' : 'Sem conta, você vai receber uma chave para usar caso esqueça o PIN.'}</div>
          </div>
          <button className="press row" aria-pressed={s.obPin} onClick={() => set({ obPin: !s.obPin })}
            style={{ gap: 14, padding: '16px 18px', borderRadius: 22, textAlign: 'left', color: 'var(--ink)', background: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.95)' }}>
            <span style={{ flex: 1, fontSize: 17, fontWeight: 600 }}>Ativar PIN</span>
            <Toggle on={s.obPin} />
          </button>
          <button className="gel" onClick={finish}>{s.obPin ? 'Criar PIN' : 'Começar a escrever'}</button>
        </>}
      </div>
    </div>
  );
}
