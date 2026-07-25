import { useState, useMemo } from 'react';
import { SearchIcon } from '../components/Icons';
import { EntryCard } from '../components/EntryCard';
import { matchesQuery, sortByNewest } from '../entryUtils';

export function SearchScreen({ entries, now, onBack, onOpenEntry }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return sortByNewest(
      entries.filter((e) => e.status !== 'trashed' && matchesQuery(e, query))
    );
  }, [entries, query]);

  return (
    <div className="screen search-screen">
      <div className="history-topbar">
        <button type="button" className="icon-button" onClick={onBack} aria-label="Voltar">
          ‹
        </button>
        <span className="topbar-title">Pesquisar</span>
        <div style={{ width: 30 }} />
      </div>

      <div className="search-field">
        <SearchIcon size={17} />
        <input
          className="search-input"
          placeholder="Pesquisar em todas as anotações"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="history-grid">
        {query.trim() && results.length === 0 && (
          <div className="empty-state">Nada encontrado para “{query.trim()}”.</div>
        )}
        {results.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            now={now}
            onOpen={onOpenEntry}
            onLongPress={() => {}}
          />
        ))}
      </div>
    </div>
  );
}
