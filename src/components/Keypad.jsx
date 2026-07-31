import { useEffect, useRef, useState } from 'react';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
const BACKSPACE = '⌫';
const FLASH_MS = 130;

export function Keypad({ value, onDigit, onBackspace }) {
  const [flashed, setFlashed] = useState(null);
  const flashTimer = useRef(null);

  // Mantém os callbacks atuais sem reassinar o listener a cada render.
  const handlers = useRef({ onDigit, onBackspace });
  handlers.current = { onDigit, onBackspace };

  useEffect(() => {
    const flash = (key) => {
      setFlashed(key);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashed(null), FLASH_MS);
    };

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const el = e.target;
      const typingElsewhere =
        el instanceof HTMLElement &&
        (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
      if (typingElsewhere) return;

      // e.key cobre a fileira de números; e.code cobre o numpad mesmo sem Num Lock.
      let digit = null;
      if (/^\d$/.test(e.key)) digit = e.key;
      else if (/^Numpad\d$/.test(e.code)) digit = e.code.slice(-1);

      if (digit !== null) {
        e.preventDefault();
        flash(digit);
        handlers.current.onDigit(digit);
        return;
      }

      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        flash(BACKSPACE);
        handlers.current.onBackspace();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      clearTimeout(flashTimer.current);
    };
  }, []);

  return (
    <>
      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot${i < value.length ? ' pin-dot--filled' : ''}`} />
        ))}
      </div>
      <div className="keypad-grid">
        {DIGITS.map((d, i) =>
          d === '' ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className={`keypad-key${flashed === d ? ' keypad-key--flash' : ''}`}
              onClick={() => (d === BACKSPACE ? onBackspace() : onDigit(d))}
            >
              {d}
            </button>
          )
        )}
      </div>
    </>
  );
}
