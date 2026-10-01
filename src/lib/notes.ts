export const DAY = 864e5, H = 36e5, MIN = 6e4;

export type Status = 'active' | 'archived' | 'trashed';
export interface Seg { id: string; t: number; text: string; ts: number }

// O que é cifrado e sincronizado. Cada campo carrega o horário da última
// mudança para que edições em dois aparelhos se juntem sozinhas.
export interface NoteContent {
  created: number;
  title: string; titleTs: number;
  status: Status; statusTs: number;
  last: number;
  segs: Seg[];
  deleted: boolean;
}
export interface Note extends NoteContent {
  id: string;
  rev: number;        // sobe a cada mudança local
  syncedRev: number;  // rev que já está no servidor
  pushed: boolean;    // já foi enviada alguma vez
}

export const uid = () => crypto.randomUUID();

export const blank = (id: string): Note => ({
  id, created: Date.now(), title: '', titleTs: 0, status: 'active', statusTs: 0, last: 0, segs: [], deleted: false,
  rev: 0, syncedRev: -1, pushed: false,
});

export const content = (n: NoteContent): NoteContent => ({
  created: n.created, title: n.title, titleTs: n.titleTs, status: n.status, statusTs: n.statusTs, last: n.last,
  segs: n.segs.map(s => ({ id: s.id, t: s.t, text: s.text, ts: s.ts })), deleted: n.deleted,
});

export const tombstone = (n: Note): Note => ({ ...n, title: '', segs: [], deleted: true, status: 'trashed', statusTs: Date.now(), rev: n.rev + 1 });

export function merge(a: NoteContent, b: NoteContent): NoteContent {
  const created = Math.min(a.created, b.created);
  if (a.deleted || b.deleted) return { created, title: '', titleTs: Math.max(a.titleTs, b.titleTs), status: 'trashed', statusTs: Math.max(a.statusTs, b.statusTs), last: Math.max(a.last, b.last), segs: [], deleted: true };
  const segs = new Map<string, Seg>();
  for (const s of [...a.segs, ...b.segs]) { const o = segs.get(s.id); if (!o || s.ts > o.ts || (s.ts === o.ts && s.text > o.text)) segs.set(s.id, s); }
  const t = a.titleTs > b.titleTs || (a.titleTs === b.titleTs && a.title >= b.title) ? a : b;
  const st = a.statusTs > b.statusTs || (a.statusTs === b.statusTs && a.status >= b.status) ? a : b;
  return {
    created, title: t.title, titleTs: t.titleTs, status: st.status, statusTs: st.statusTs, last: Math.max(a.last, b.last),
    segs: [...segs.values()].sort((x, y) => x.t - y.t || (x.id < y.id ? -1 : 1)), deleted: false,
  };
}

export const sameContent = (a: NoteContent, b: NoteContent) => JSON.stringify(content(a)) === JSON.stringify(content(b));

export const nd = (n: NoteContent) => { const s = n.segs.find(g => g.text !== ''); return s ? s.t : n.created; };
export const fullText = (n: NoteContent) => n.segs.map(s => s.text).filter(Boolean).join(' ');
export const isEmpty = (n: NoteContent) => !n.title && n.segs.every(s => !s.text);
export const dispTitle = (n: NoteContent) => {
  const words = fullText(n).trim().split(/\s+/).filter(Boolean);
  if (n.title) return n.title;
  if (!words.length) return 'Nova anotação';
  // Reticências só quando o texto continua depois das 6 primeiras palavras.
  return words.length > 6 ? words.slice(0, 6).join(' ').replace(/[.,;:!?…]+$/, '') + '…' : words.join(' ');
};
export const preview = (n: NoteContent) => fullText(n).trim().slice(0, 160) || 'Sem texto ainda';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtT = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const same = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
export const dayMonth = (t: number) => new Date(t).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
export const monthYear = (y: number, m: number) => cap(new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
export const dayLabel = (t: number) => {
  const n = Date.now();
  if (same(t, n)) return 'Hoje';
  if (same(t, n - DAY)) return 'Ontem';
  const d = new Date(t), o: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
  if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return cap(d.toLocaleDateString('pt-BR', o).replace('-feira', ''));
};

// Texto sem acentos e em minúsculas, com o mapa de volta para o original.
export function normMap(s: string) {
  let out = ''; const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i].normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    for (let j = 0; j < c.length; j++) { out += c[j]; map.push(i); }
  }
  return { out, map };
}
