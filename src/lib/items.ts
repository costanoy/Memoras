// Cadernos (documentos para reler) e Agenda (tarefas e observações de cada dia).
// No aparelho ficam na store "items"; com conta, vão para o servidor cifrados na mesma
// tabela das anotações, com o tipo dentro do texto cifrado. Nunca têm o campo "segs":
// assim as versões antigas do app, que só conhecem anotações, não os leem e os ignoram.

interface Local { id: string; rev: number; syncedRev: number; pushed: boolean }

export interface DocContent {
  kind: 'doc'; created: number; deleted: boolean;
  title: string; titleTs: number; body: string; bodyTs: number;
  status: 'active' | 'trashed'; statusTs: number;
}
export interface TaskContent {
  kind: 'task'; created: number; deleted: boolean;
  date: string; dateTs: number; text: string; textTs: number;
  done: boolean; doneTs: number; order: number; orderTs: number;
}
export interface DayNoteContent {
  kind: 'daynote'; created: number; deleted: boolean;
  date: string; text: string; textTs: number;
}
export type ItemContent = DocContent | TaskContent | DayNoteContent;

// base: o texto que está no servidor desde a última sincronização. Serve para saber,
// ao juntar, se o texto mudou só aqui, só no outro aparelho ou nos dois.
export type Doc = DocContent & Local & { base: string | null };
export type Task = TaskContent & Local;
export type DayNote = DayNoteContent & Local & { base: string | null };
export type Item = Doc | Task | DayNote;

const fresh = { rev: 0, syncedRev: -1, pushed: false };
// Ordem das tarefas: sempre crescente, mesmo para duas criadas no mesmo milissegundo.
let lastOrder = 0;
export const nextOrder = () => (lastOrder = Math.max(Date.now(), lastOrder + 1));
export const blankDoc = (id: string): Doc => ({
  id, kind: 'doc', created: Date.now(), deleted: false, title: '', titleTs: 0, body: '', bodyTs: 0, status: 'active', statusTs: 0, base: null, ...fresh,
});
export const blankTask = (id: string, date: string, text: string): Task => {
  const t = Date.now();
  return { id, kind: 'task', created: t, deleted: false, date, dateTs: t, text, textTs: t, done: false, doneTs: 0, order: nextOrder(), orderTs: t, ...fresh };
};
export const blankDayNote = (id: string, date: string): DayNote => ({
  id, kind: 'daynote', created: Date.now(), deleted: false, date, text: '', textTs: 0, base: null, ...fresh,
});

export function itemContent(i: ItemContent): ItemContent {
  if (i.kind === 'doc') return { kind: 'doc', created: i.created, deleted: i.deleted, title: i.title, titleTs: i.titleTs, body: i.body, bodyTs: i.bodyTs, status: i.status, statusTs: i.statusTs };
  if (i.kind === 'task') return { kind: 'task', created: i.created, deleted: i.deleted, date: i.date, dateTs: i.dateTs, text: i.text, textTs: i.textTs, done: i.done, doneTs: i.doneTs, order: i.order, orderTs: i.orderTs };
  return { kind: 'daynote', created: i.created, deleted: i.deleted, date: i.date, text: i.text, textTs: i.textTs };
}
export const sameItem = (a: ItemContent, b: ItemContent) => JSON.stringify(itemContent(a)) === JSON.stringify(itemContent(b));
// O texto que conta para a "base" de cada tipo.
export const baseText = (i: ItemContent) => i.kind === 'doc' ? i.body : i.kind === 'daynote' ? i.text : null;

// Confere o que veio do servidor. Tipo desconhecido (de uma versão futura) volta null e é ignorado.
const isStr = (v: unknown) => typeof v === 'string', isNum = (v: unknown) => typeof v === 'number', isBool = (v: unknown) => typeof v === 'boolean';
export function parseItem(o: unknown): ItemContent | null {
  if (!o || typeof o !== 'object') return null;
  const x = o as Record<string, unknown>;
  if (!isNum(x.created) || !isBool(x.deleted)) return null;
  if (x.kind === 'doc' && isStr(x.title) && isNum(x.titleTs) && isStr(x.body) && isNum(x.bodyTs) && (x.status === 'active' || x.status === 'trashed') && isNum(x.statusTs)) return itemContent(x as unknown as DocContent);
  if (x.kind === 'task' && isStr(x.date) && isNum(x.dateTs) && isStr(x.text) && isNum(x.textTs) && isBool(x.done) && isNum(x.doneTs) && isNum(x.order) && isNum(x.orderTs)) return itemContent(x as unknown as TaskContent);
  if (x.kind === 'daynote' && isStr(x.date) && isStr(x.text) && isNum(x.textTs)) return itemContent(x as unknown as DayNoteContent);
  return null;
}

export function tombstoneItem<T extends Item>(i: T): T {
  const t = Date.now();
  if (i.kind === 'doc') return { ...i, deleted: true, title: '', body: '', status: 'trashed', statusTs: t, rev: i.rev + 1 };
  return { ...i, deleted: true, text: '', rev: i.rev + 1 };
}

// Junta a versão deste aparelho com a do servidor. Nada se perde: se um texto mudou nos dois
// aparelhos desde a última sincronização, o daqui fica e o de lá vira uma cópia (copy).
export function mergeItem(l: Item, r: ItemContent): { merged: ItemContent; copy?: ItemContent } {
  const created = Math.min(l.created, r.created);
  const pick = <K extends string>(lv: K, lt: number, rv: K, rt: number): [K, number] => lt > rt || (lt === rt && lv >= rv) ? [lv, lt] : [rv, rt];
  if (l.kind !== r.kind) return { merged: itemContent(l) };
  if (l.deleted || r.deleted) return { merged: { ...itemContent(tombstoneItem(l)), created } };
  if (l.kind === 'task' && r.kind === 'task') {
    const [date, dateTs] = pick(l.date, l.dateTs, r.date, r.dateTs);
    const [text, textTs] = pick(l.text, l.textTs, r.text, r.textTs);
    const done = l.doneTs > r.doneTs || (l.doneTs === r.doneTs && l.done) ? l.done : r.done;
    const [order, orderTs] = l.orderTs >= r.orderTs ? [l.order, l.orderTs] : [r.order, r.orderTs];
    return { merged: { kind: 'task', created, deleted: false, date, dateTs, text, textTs, done, doneTs: Math.max(l.doneTs, r.doneTs), order, orderTs } };
  }
  const lt = baseText(l)!, rt = baseText(r)!, base = (l as Doc | DayNote).base, ts = (i: ItemContent) => i.kind === 'doc' ? i.bodyTs : (i as DayNoteContent).textTs;
  let text = lt, textTs = ts(l), copy: ItemContent | undefined;
  if (lt !== rt) {
    if (base !== null && lt === base) { text = rt; textTs = ts(r); }
    else if (rt !== base) copy = r.kind === 'doc' ? { ...r, title: (r.title || 'Sem título') + ' (outra versão)', titleTs: Date.now() } : r;
  }
  if (l.kind === 'doc' && r.kind === 'doc') {
    const [title, titleTs] = pick(l.title, l.titleTs, r.title, r.titleTs);
    const [status, statusTs] = pick(l.status, l.statusTs, r.status, r.statusTs);
    return { merged: { kind: 'doc', created, deleted: false, title, titleTs, body: text, bodyTs: textTs, status, statusTs }, copy };
  }
  return { merged: { kind: 'daynote', created, deleted: false, date: (l as DayNote).date, text, textTs }, copy };
}

// Datas da agenda: "AAAA-MM-DD" no fuso do aparelho.
const pad = (n: number) => String(n).padStart(2, '0');
export const dayKey = (t: number) => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
export const keyTime = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
export const addDays = (k: string, n: number) => { const [y, m, d] = k.split('-').map(Number); return dayKey(new Date(y, m - 1, d + n).getTime()); };
export const todayKey = () => dayKey(Date.now());

// Documento com títulos (#) e listas (- ou 1.). O resto é parágrafo.
export type Block = { t: 'h1' | 'h2' | 'p' | 'ul' | 'ol'; lines: string[] };
export function parseDoc(body: string): Block[] {
  const out: Block[] = [];
  let cur: Block | null = null;
  for (const raw of body.split('\n')) {
    const line = raw.trimEnd();
    let m: RegExpExecArray | null;
    if (!line.trim()) { cur = null; continue; }
    if ((m = /^\s*(#{1,3})\s+(.*)$/.exec(line))) { out.push({ t: m[1].length === 1 ? 'h1' : 'h2', lines: [m[2]] }); cur = null; continue; }
    const li = /^\s*[-*•]\s+(.*)$/.exec(line), ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const t = li ? 'ul' : ol ? 'ol' : 'p', text = li ? li[1] : ol ? ol[1] : line.trim();
    if (!cur || cur.t !== t) out.push(cur = { t, lines: [] });
    cur.lines.push(text);
  }
  return out;
}
export const docPreview = (body: string) => parseDoc(body).filter(b => b.t !== 'h1' && b.t !== 'h2').map(b => b.lines.join(b.t === 'p' ? ' ' : ' · ')).join(' · ').slice(0, 160);
export const docTitle = (d: { title: string; body: string }) => d.title.trim() || parseDoc(d.body).find(b => b.t === 'h1' || b.t === 'h2')?.lines[0] || 'Sem título';
export const isBlankItem = (i: Item) => i.kind === 'doc' ? !i.title.trim() && !i.body.trim() : !i.text.trim();
