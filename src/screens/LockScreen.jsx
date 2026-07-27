import { useState } from 'react';
import { Keypad } from '../components/Keypad';
import { MemorasMark } from '../components/Logo';

export function LockScreen({ verifyPin }) {
  const [pinInput, setPinInput] = useState('');
  const [shake, setShake] = useState(false);

  const handleDigit = async (d) => {
    const next = (pinInput + d).slice(0, 4);
    setPinInput(next);
    if (next.length === 4) {
      const ok = await verifyPin(next);
      if (!ok) {
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setPinInput('');
        }, 350);
      }
    }
  };
  const handleBackspace = () => setPinInput((v) => v.slice(0, -1));

  return (
    <div className="screen lock-screen">
      <MemorasMark height={72} />
      <div className="lock-title">Memoras</div>
      <div className="lock-subtitle">Digite sua senha</div>
      <div className={shake ? 'pin-shake' : ''}>
        <Keypad value={pinInput} onDigit={handleDigit} onBackspace={handleBackspace} />
      </div>
    </div>
  );
}
