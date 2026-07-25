import { LOCK_AFTER_MS } from './constants';

export function newEntry(now = Date.now()) {
  return {
    id: `e${now}`,
    title: '',
    createdAt: now,
    lastActiveAt: now,
    paragraphs: [{ text: '', time: null }],
    status: 'active',
    statusChangedAt: null,
  };
}

export function isEditable(entry, now = Date.now()) {
  if (!entry) return false;
  return entry.status === 'active' && now - entry.createdAt < LOCK_AFTER_MS;
}

export function titleOf(entry) {
  return entry?.title && entry.title.trim() ? entry.title : 'Sem título';
}

export function fullTextOf(entry) {
  return entry.paragraphs.map((p) => p.text).join('\n');
}

export function snippetOf(entry, fallback = 'Toque para continuar escrevendo...') {
  const text = fullTextOf(entry).trim() || fallback;
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function isEmpty(entry) {
  return !entry.title.trim() && !fullTextOf(entry).trim();
}

export function normalize(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

export function matchesQuery(entry, query) {
  const q = normalize(query.trim());
  if (!q) return false;
  return normalize(`${entry.title}\n${fullTextOf(entry)}`).includes(q);
}

export function sortByNewest(entries) {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt);
}
