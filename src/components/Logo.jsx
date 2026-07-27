/*
 * Marca do Memoras: caderno com folha aparecendo, lombada, alça
 * atravessando a capa e botão de pressão. Traçado igual ao logo original.
 */
export function MemorasMark({ height = 24, muted = false }) {
  const cover = muted ? 'rgba(212, 90, 12, 0.18)' : '#F97316';
  const detail = muted ? 'rgba(212, 90, 12, 0.32)' : '#D45A0C';
  const page = muted ? 'rgba(212, 90, 12, 0.08)' : '#FCE3C8';
  const snap = muted ? 'rgba(255, 253, 249, 0.9)' : '#FFF3E4';

  return (
    <svg
      width={(height * 100) / 116}
      height={height}
      viewBox="0 0 100 116"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="10" y="10" width="82" height="104" rx="10" fill={page} />
      <rect x="2" y="4" width="82" height="104" rx="10" fill={cover} />
      <rect x="17" y="10" width="2.5" height="92" rx="1.2" fill={detail} />
      <rect x="48" y="46" width="48" height="22" rx="5" fill={detail} />
      <circle cx="58" cy="57" r="7" fill={snap} />
      <circle cx="58" cy="57" r="2.6" fill={detail} />
    </svg>
  );
}

export function MemorasLogo({ height = 22 }) {
  return (
    <span className="brand">
      <MemorasMark height={height} />
      <span className="brand__name">Memoras</span>
    </span>
  );
}

/** Versão em traço leve, para telas vazias. */
export function MemorasOutline({ height = 72 }) {
  return (
    <svg
      width={(height * 100) / 116}
      height={height}
      viewBox="0 0 100 116"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="10" y="10" width="82" height="104" rx="10" stroke="rgba(212,90,12,0.22)" strokeWidth="2.5" />
      <rect x="2" y="4" width="82" height="104" rx="10" fill="rgba(252,227,200,0.55)" stroke="rgba(212,90,12,0.38)" strokeWidth="2.5" />
      <rect x="17" y="10" width="2.5" height="92" rx="1.2" fill="rgba(212,90,12,0.3)" />
      <rect x="48" y="46" width="48" height="22" rx="5" stroke="rgba(212,90,12,0.38)" strokeWidth="2.5" />
      <circle cx="58" cy="57" r="7" stroke="rgba(212,90,12,0.38)" strokeWidth="2.5" />
    </svg>
  );
}
