import { useState } from 'react';

const MODES = {
  signIn: { title: 'Entrar', submit: 'Entrar' },
  signUp: { title: 'Criar conta', submit: 'Criar conta' },
  reset: { title: 'Redefinir senha', submit: 'Enviar link de redefinição' },
};

export function AccountScreen({ authState, onBack }) {
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);

  const { user, available, signIn, signUp, resetPassword, signOut } = authState;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    const result =
      mode === 'signUp'
        ? await signUp(email, password)
        : mode === 'reset'
          ? await resetPassword(email)
          : await signIn(email, password);
    setBusy(false);

    if (!result.ok) {
      setFeedback({ type: 'error', text: result.message });
      return;
    }
    if (mode === 'reset') {
      setFeedback({ type: 'ok', text: 'Enviamos um link para o seu e-mail. Verifique também o spam.' });
      return;
    }
    setPassword('');
  };

  const header = (
    <div className="security-topbar">
      <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
        ‹
      </button>
      <span className="topbar-title">Conta</span>
    </div>
  );

  if (!available) {
    return (
      <div className="screen security-screen">
        {header}
        <div className="security-body">
          <div className="notice">
            A sincronização na nuvem ainda não está configurada nesta versão. Suas anotações estão
            salvas apenas neste aparelho.
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return (
      <div className="screen security-screen">
        {header}
        <div className="security-body">
          <div className="account-card">
            <div className="account-card__label">Conectado como</div>
            <div className="account-card__email">{user.email}</div>
            <div className="account-card__hint">
              Suas anotações estão sendo salvas na nuvem e aparecem no celular e no computador.
            </div>
          </div>
          <button type="button" className="ghost-button" onClick={signOut}>
            Sair da conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen security-screen">
      {header}
      <div className="security-body">
        <form className="auth-form" onSubmit={submit}>
          <div className="auth-form__title">{MODES[mode].title}</div>

          <label className="field">
            <span className="field__label">E-mail</span>
            <input
              className="field__input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {mode !== 'reset' && (
            <label className="field">
              <span className="field__label">Senha</span>
              <input
                className="field__input"
                type="password"
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </label>
          )}

          {feedback && (
            <div className={`feedback feedback--${feedback.type}`}>{feedback.text}</div>
          )}

          <button type="submit" className="primary-button" disabled={busy}>
            {busy ? 'Aguarde…' : MODES[mode].submit}
          </button>
        </form>

        <div className="auth-switch">
          {mode !== 'signUp' && (
            <button type="button" className="link-button" onClick={() => { setMode('signUp'); setFeedback(null); }}>
              Não tenho conta — criar agora
            </button>
          )}
          {mode !== 'signIn' && (
            <button type="button" className="link-button" onClick={() => { setMode('signIn'); setFeedback(null); }}>
              Já tenho conta — entrar
            </button>
          )}
          {mode !== 'reset' && (
            <button type="button" className="link-button" onClick={() => { setMode('reset'); setFeedback(null); }}>
              Esqueci minha senha
            </button>
          )}
        </div>

        <div className="notice notice--soft">
          Enquanto você não entrar, tudo fica salvo só neste aparelho. Ao criar a conta, suas
          anotações atuais são enviadas para a nuvem automaticamente.
        </div>
      </div>
    </div>
  );
}
