import { useState } from 'react';
import { Keypad } from '../components/Keypad';

export function SecurityScreen({ passwordEnabled, hasPin, setPasswordEnabled, setPin, clearPin, onBack }) {
  const [pinInput, setPinInput] = useState('');

  const handleDigit = (d) => {
    const next = (pinInput + d).slice(0, 4);
    setPinInput(next);
    if (next.length === 4) {
      setPin(next);
      setTimeout(() => setPinInput(''), 150);
    }
  };
  const handleBackspace = () => setPinInput((v) => v.slice(0, -1));
  const handleAlterar = () => {
    clearPin();
    setPinInput('');
  };
  const handleToggle = () => {
    setPasswordEnabled(!passwordEnabled);
    setPinInput('');
  };

  const showConfirmed = passwordEnabled && hasPin && pinInput.length === 0;
  const showKeypad = passwordEnabled && !showConfirmed;

  return (
    <div className="screen security-screen">
      <div className="security-topbar">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <span className="topbar-title">Segurança</span>
      </div>
      <div className="security-body">
        <div className="security-row">
          <div>
            <div className="security-row__label">Senha de acesso</div>
            <div className="security-row__hint">Trava local do dispositivo</div>
          </div>
          <button
            type="button"
            className={`switch${passwordEnabled ? ' switch--on' : ''}`}
            onClick={handleToggle}
            aria-pressed={passwordEnabled}
            aria-label="Ativar senha"
          >
            <span className="switch__knob" />
          </button>
        </div>
        {passwordEnabled && (
          <div className="security-pin">
            {showKeypad && <Keypad value={pinInput} onDigit={handleDigit} onBackspace={handleBackspace} />}
            {showConfirmed && (
              <div className="security-confirmed">
                <div className="security-confirmed__label">Senha definida ✓</div>
                <button type="button" className="link-button" onClick={handleAlterar}>
                  Alterar senha
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
