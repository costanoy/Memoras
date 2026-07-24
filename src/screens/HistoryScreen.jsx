import { fmtShort } from '../dateUtils';

function snippetOf(paragraphs) {
  const text = (paragraphs[0] && paragraphs[0].text.trim()) || 'Toque para continuar escrevendo...';
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function HistoryScreen({ draft, entries, onOpenCurrent, onOpenEntry, onOpenSecurity }) {
  const currentCard = {
    key: 'current',
    dateLabel: 'Hoje',
    title: draft.title.trim() ? draft.title : 'Sem título',
    snippet: snippetOf(draft.paragraphs),
    onOpen: onOpenCurrent,
  };
  const entryCards = entries.map((e) => ({
    key: e.id,
    dateLabel: fmtShort(e.createdAt),
    title: e.title && e.title.trim() ? e.title : 'Sem título',
    snippet: snippetOf(e.paragraphs),
    onOpen: () => onOpenEntry(e.id),
  }));
  const cards = [currentCard, ...entryCards];

  return (
    <div className="screen history-screen">
      <div className="history-topbar">
        <button type="button" className="icon-button" onClick={onOpenCurrent} aria-label="Voltar">
          ‹
        </button>
        <span className="topbar-title">Histórico</span>
        <div className="history-topbar__actions">
          <button type="button" className="icon-button icon-button--settings" onClick={onOpenSecurity} aria-label="Segurança">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2.5" stroke="#6b4a2f" strokeWidth="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#6b4a2f" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="16" r="1.4" fill="#6b4a2f" />
            </svg>
          </button>
          <button type="button" className="fab fab--inline" onClick={onOpenCurrent} aria-label="Nova anotação">
            +
          </button>
        </div>
      </div>
      <div className="history-grid">
        {cards.map((c) => (
          <div key={c.key} className="history-card" onClick={c.onOpen}>
            <span className="history-card__date">{c.dateLabel}</span>
            <span className="history-card__title">{c.title}</span>
            <span className="history-card__snippet">{c.snippet}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
