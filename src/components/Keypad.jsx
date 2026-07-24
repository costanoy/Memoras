const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export function Keypad({ value, onDigit, onBackspace }) {
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
              className="keypad-key"
              onClick={() => (d === '⌫' ? onBackspace() : onDigit(d))}
            >
              {d}
            </button>
          )
        )}
      </div>
    </>
  );
}
