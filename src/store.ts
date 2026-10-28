import { useSyncExternalStore } from 'react';
import { dbHooks, itemDel, itemPut, itemsRead, kvDel, kvRead, kvSet, noteDel, notePut, notesRead, wipeAll } from './lib/db';
import { hashSecret, normCode, randomCode, verifySecret } from './lib/crypto';
import { blankDayNote, blankDoc, blankTask, isBlankItem, keyTime, nextOrder, todayKey, tombstoneItem, type DayNote, type Doc, type Item, type Task } from './lib/items';
import { blank, isEmpty, nd, tombstone, uid, type Note, type Status } from './lib/notes';
import { playSound, type Sound } from './sounds';
import { applyTheme, THEMES, type ThemeKey } from './themes';
import { startsMini } from './win';

export type Screen = 'loading' | 'pin' | 'forgotPin' | 'pinkey' | 'onboard' | 'auth' | 'recovery' | 'forgot' | 'history' | 'editor' | 'docs' | 'doc' | 'summary' | 'agenda' | 'search' | 'archive' | 'settings';
export type Section = 'diario' | 'cadernos' | 'agenda';
export type Sync = 'synced' | 'syncing' | 'offline' | 'error';
// Menu de opções de um item das listas (botão direito do mouse ou toque longo). touch: aberto com o dedo.
export type MenuKind = 'note' | 'doc' | 'task';
export interface Menu { kind: MenuKind; id: string; x: number; y: number; touch: boolean }

export interface Account { email: string; userId: string; dkId: string; pwSalt: string; pwHash: string }

// Tudo o que fica gravado no aparelho além das anotações.
export interface Cfg {
  onboarded: boolean;
  diaryName: string; theme: ThemeKey; prefsTs: number;
  pinOn: boolean; pinHash: string; pinSalt: string; pinKeyHash: string; pinKeySalt: string;
  pinFails: number; lockUntil: number; pinLocks: number;
  pinTs: number;   // quando o PIN foi criado ou trocado (com conta, vale o mais novo em todos os aparelhos)
  bioOn: boolean;  // abrir com a digital neste aparelho (Android)
  bioAsked: boolean;   // já respondeu à oferta de entrar com a digital, neste aparelho
  lockAfter: number;   // minutos fora do app até pedir o PIN de novo (neste aparelho)
  awayAt: number;      // quando o app saiu da tela destravado (0: está na tela, ou saiu travado)
  invite: boolean;
  sounds: boolean;
  account: Account | null; dk: string | null; lastPull: string | null;
}

export interface State {
  mobile: boolean;
  // Mini-Memoras (só no app de Windows): a janela do tamanho do Cynote, uma coisa por vez na tela.
  mini: boolean; onTop: boolean;
  // De onde a Busca, o Arquivo ou os Ajustes foram abertos (o Voltar e o Esc voltam para lá).
  from: Screen | null;
  screen: Screen;
  unlocked: boolean;
  cfg: Cfg;
  sync: Sync;
  notes: Note[];
  sel: string | null;
  // Cadernos e Agenda
  items: Item[];
  section: Section;
  docSel: string | null; docEdit: boolean;
  agDay: string; agY: number; agM: number; agCal: boolean;
  query: string;
  shelf: 'archive' | 'trash';
  calOpen: boolean; calY: number; calM: number; day: number | null;
  toast: { text: string; undo?: () => void } | null;
  confirm: { id?: string; all?: boolean; reset?: boolean; trash?: boolean } | null;
  menu: Menu | null;
  bioOffer: boolean;
  pinMode: 'unlock' | 'verify' | 'create' | 'confirm'; pinAfter: 'change' | 'off' | 'on'; pin: string; pinTmp: string; pinError: boolean; pinMsg: string; shake: number;
  pinReturn: 'history' | 'settings'; pressedKey: string | null; unlocking: boolean;
  resume: Screen | null;
  onStep: number; storeMode: 'local' | 'account'; obPin: boolean;
  authMode: 'signup' | 'login'; authReturn: 'onboard' | 'settings';
  shownKey: string; recReturn: 'onboardPin' | 'settings'; pkReturn: 'history' | 'settings'; pkMsg: string;
  fStep: number; fEmail: string;
}

const defaultCfg: Cfg = {
  onboarded: false, diaryName: 'Meu diário', theme: 'turquesa', prefsTs: 0,
  pinOn: false, pinHash: '', pinSalt: '', pinKeyHash: '', pinKeySalt: '', pinFails: 0, lockUntil: 0, pinLocks: 0, pinTs: 0, bioOn: false,
  bioAsked: false, lockAfter: 5, awayAt: 0,
  invite: true, sounds: true, account: null, dk: null, lastPull: null,
};

// Versão do app (do package.json), usada para guardar uma cópia dos dados a cada atualização.
const APP_VERSION = __APP_VERSION__;

const mq = window.matchMedia('(max-width: 719.98px)');
const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => rmq.matches;

const now = new Date();
const initial = (): State => ({
  mobile: mq.matches && !startsMini, mini: startsMini, onTop: false, from: null, screen: 'loading', unlocked: false, cfg: { ...defaultCfg }, sync: navigator.onLine ? 'synced' : 'offline',
  notes: [], sel: null, query: '', shelf: 'archive',
  items: [], section: 'diario', docSel: null, docEdit: false,
  agDay: todayKey(), agY: now.getFullYear(), agM: now.getMonth(), agCal: false,
  calOpen: false, calY: now.getFullYear(), calM: now.getMonth(), day: null,
  toast: null, confirm: null, menu: null, bioOffer: false,
  pinMode: 'unlock', pinAfter: 'change', pin: '', pinTmp: '', pinError: false, pinMsg: '', shake: 0, pinReturn: 'history', pressedKey: null, unlocking: false, resume: null,
  onStep: 1, storeMode: 'local', obPin: true,
  authMode: 'signup', authReturn: 'onboard',
  shownKey: '', recReturn: 'onboardPin', pkReturn: 'history', pkMsg: '',
  fStep: 1, fEmail: '',
});

let state = initial();
const subs = new Set<() => void>();
export const get = () => state;
export function set(p: Partial<State> | ((s: State) => Partial<State>)) {
  state = { ...state, ...(typeof p === 'function' ? p(state) : p) };
  subs.forEach(f => f());
}
export const useApp = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, get);
// No Mini-Memoras a janela é estreita, mas o layout é o dele, não o de celular.
mq.addEventListener('change', () => { if (!state.mini) set({ mobile: mq.matches }); });
export const phoneWidth = () => mq.matches;
// Uma coisa por vez na tela: no celular e no Mini-Memoras (a lista ou o item aberto).
export const onePane = (s: State) => s.mobile || s.mini;

// A sincronização se pendura aqui para saber quando algo mudou.
// away: o app saiu da tela (a sincronização envia na hora o que falta).
export const hooks = { changed: () => {}, away: () => {}, recoveryPending: false };

export function setCfg(patch: Partial<Cfg>) {
  set(s => ({ cfg: { ...s.cfg, ...patch } }));
  if ('theme' in patch) applyTheme(state.cfg.theme);
  void kvSet('cfg', state.cfg);
}
export function setPrefs(patch: { diaryName?: string; theme?: ThemeKey }) {
  setCfg({ ...patch, prefsTs: Date.now() });
  hooks.changed();
}

const APP: Screen[] = ['history', 'editor', 'docs', 'doc', 'summary', 'agenda', 'search', 'archive', 'settings'];
export const inApp = (s: Screen) => APP.includes(s);
export const live = (s: State) => s.notes.filter(n => !n.deleted);
export const activeSorted = (s: State) => s.notes.filter(n => !n.deleted && n.status === 'active').sort((a, b) => nd(b) - nd(a));

// Cada parte do app e a sua tela inicial.
// O Resumão (summary) fica em Cadernos: é lido como um caderno, montado com as tarefas da Agenda.
const SECTION: Partial<Record<Screen, Section>> = { history: 'diario', editor: 'diario', docs: 'cadernos', doc: 'cadernos', summary: 'cadernos', agenda: 'agenda' };
export const HOME: Record<Section, Screen> = { diario: 'history', cadernos: 'docs', agenda: 'agenda' };
export const lastEdit = (d: Doc) => Math.max(d.created, d.titleTs, d.bodyTs);
// Os fixados primeiro; em cada grupo, o editado por último no alto.
export const docsOf = (s: State) => s.items.filter((i): i is Doc => i.kind === 'doc' && !i.deleted && i.status === 'active').sort((a, b) => Number(b.pinned) - Number(a.pinned) || lastEdit(b) - lastEdit(a));
export const trashedDocs = (s: State) => s.items.filter((i): i is Doc => i.kind === 'doc' && !i.deleted && i.status === 'trashed');
export const archivedDocs = (s: State) => s.items.filter((i): i is Doc => i.kind === 'doc' && !i.deleted && i.status === 'archived').sort((a, b) => lastEdit(b) - lastEdit(a));
// Empate na ordem (tarefas de aparelhos diferentes) se desfaz pelo id, igual em todos os aparelhos.
export const tasksOn = (s: State, date: string) => s.items.filter((i): i is Task => i.kind === 'task' && !i.deleted && i.date === date).sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
export const dayNotesOn = (s: State, date: string) => s.items.filter((i): i is DayNote => i.kind === 'daynote' && !i.deleted && i.date === date).sort((a, b) => a.created - b.created);
export const plannedDays = (s: State) => new Set(s.items.filter(i => (i.kind === 'task' || i.kind === 'daynote') && !i.deleted && !isBlankItem(i)).map(i => (i as Task | DayNote).date));
const realTasks = (s: State) => s.items.filter((i): i is Task => i.kind === 'task' && !i.deleted && !!i.text.trim());
// Dias em que todas as tarefas estão feitas (o calendário da Agenda marca com ✓).
export function doneDays(s: State) {
  const all = new Map<string, boolean>();
  for (const t of realTasks(s)) all.set(t.date, (all.get(t.date) ?? true) && t.done);
  return new Set([...all].filter(([, done]) => done).map(([k]) => k));
}
// As tarefas de hoje em diante, dia a dia (o Resumão).
export function upcoming(s: State) {
  const today = todayKey();
  return [...new Set(realTasks(s).filter(t => t.date >= today).map(t => t.date))].sort().map(k => ({ k, tasks: tasksOn(s, k).filter(t => t.text.trim()) }));
}

// Anotação vazia abandonada some sem passar pela lixeira.
function cleaned(notes: Note[], keep: string | null) {
  const out: Note[] = [];
  for (const n of notes) {
    if (n.deleted || n.id === keep || n.status !== 'active' || !isEmpty(n)) { out.push(n); continue; }
    if (n.pushed) { const t = tombstone(n); out.push(t); void notePut(t); hooks.changed(); }
    else void noteDel(n.id);
  }
  return out;
}

// Com PIN ligado e ainda não digitado, o app está travado.
export const isLocked = () => state.cfg.pinOn && !state.unlocked;
// Telas que abrem com o app travado: o PIN e o "Esqueci o PIN", que pode passar pela recuperação
// da senha da própria conta. Login e cadastro, nunca: entrar em outra conta mandaria o diário
// deste aparelho para ela (sync.ts também recusa).
const WHILE_LOCKED: Screen[] = ['loading', 'pin', 'forgotPin', 'forgot', 'recovery'];

export function go(target: Screen, extra: Partial<State> = {}) {
  let screen = target;
  if (isLocked() && (screen === 'pin' || !WHILE_LOCKED.includes(screen))) {
    // Depois do PIN, segue para onde ia.
    if (screen !== 'pin') extra = { ...extra, resume: screen };
    screen = 'pin';
    extra = { ...extra, pinMode: 'unlock', pin: '', pinMsg: '', pinError: false };
  }
  // Quem chega ao diário por outro caminho (login, link de senha) não revê o primeiro uso.
  if (inApp(screen) && !state.cfg.onboarded) setCfg({ onboarded: true });
  const sel = extra.sel !== undefined ? extra.sel : state.sel;
  const keep = target === 'editor' || (target === 'history' && !onePane(state)) ? sel : null;
  const docSel = extra.docSel !== undefined ? extra.docSel : state.docSel;
  const keepDoc = target === 'doc' || (target === 'docs' && !onePane(state)) ? docSel : null;
  const section = SECTION[screen];
  set({ screen, confirm: null, menu: null, ...(section ? { section } : {}), ...extra, notes: cleaned(state.notes, keep), items: cleanItems(state.items, keepDoc) });
}

// Busca, Arquivo e Ajustes abrem por cima da parte em que a pessoa está. O Voltar (e o Esc fora dos
// campos) volta para a tela de onde vieram, com a mesma anotação, caderno ou dia abertos.
const TOOLS: Screen[] = ['search', 'archive', 'settings'];
export const isTool = (s: Screen) => TOOLS.includes(s);
export function openTool(k: 'search' | 'archive' | 'settings', extra: Partial<State> = {}) {
  go(k, { from: isTool(state.screen) ? state.from : state.screen, ...extra });
}
export const openNoteOf = (s: State) => s.notes.find(n => n.id === s.sel && !n.deleted && n.status !== 'trashed');
export const openDocOf = (s: State) => s.items.find((i): i is Doc => i.kind === 'doc' && i.id === s.docSel && !i.deleted && i.status !== 'trashed');
export function goBack() {
  const s = state;
  if (isTool(s.screen)) {
    const f = s.from;
    if (f === 'editor' && !openNoteOf(s)) return go('history', { from: null });
    if (f === 'doc' && !openDocOf(s)) return go('docs', { from: null });
    return go(f && inApp(f) && !isTool(f) ? f : HOME[s.section], { from: null });
  }
  switch (s.screen) {
    case 'editor': return go('history', s.mini ? { sel: null } : {});
    case 'doc': return go('docs', { docSel: s.mini ? null : s.docSel, docEdit: false });
    case 'summary': return go('docs');
    case 'history': return s.calOpen ? set({ calOpen: false }) : s.day ? set({ day: null }) : undefined;
    case 'agenda': return s.agCal ? set({ agCal: false }) : undefined;
  }
}
// As três partes do app. No Mini-Memoras cada uma lembra o que estava aberto (como as abas do
// Cynote); tocar na parte que já está na tela volta ao começo dela.
export function goSection(k: Section) {
  const s = state;
  if (s.mini) {
    if (k !== s.section || isTool(s.screen)) {
      if (k === 'diario') return go(openNoteOf(s) ? 'editor' : 'history');
      if (k === 'cadernos') return go(openDocOf(s) ? 'doc' : 'docs', { docEdit: false });
      return go('agenda');
    }
    if (k === 'diario') return go('history', { sel: null, day: null, calOpen: false });
    if (k === 'cadernos') return go('docs', { docSel: null, docEdit: false });
    return openDay(todayKey());
  }
  // Entrar em Cadernos volta ao caderno que estava aberto; se nenhum estava, nada abre sozinho.
  if (k === 'cadernos') return go('docs', { docSel: docsOf(s).some(d => d.id === s.docSel) ? s.docSel : null, docEdit: false });
  go(HOME[k]);
}

export const openMenu = (kind: MenuKind, id: string, x: number, y: number, touch = false) => set({ menu: { kind, id, x, y, touch } });
export const closeMenu = () => { if (state.menu) set({ menu: null }); };

// Com PIN, o app volta a pedir o PIN depois de um tempo fora da tela: em outro app, com o celular ou
// o computador bloqueado, com a janela minimizada ou com o app fechado. O tempo se escolhe nos Ajustes
// (até a 1.1.3 era sempre 1 minuto). Ao digitar, volta para onde estava.
export const LOCK_AFTER = [1, 5, 15, 30, 60];
const relockMs = (c: Cfg) => (LOCK_AFTER.includes(c.lockAfter) ? c.lockAfter : 5) * 60_000;
let awaySince = 0;
export function appAway() {
  if (!awaySince) {
    awaySince = Date.now();
    // Fica gravado: se o sistema fechar o app enquanto ele está fora (ou a pessoa fechar), ao abrir vale o mesmo tempo.
    if (state.screen !== 'loading' && state.cfg.pinOn && state.unlocked) setCfg({ awayAt: awaySince });
  }
  hooks.away();
}
export function appBack() {
  const away = awaySince ? Date.now() - awaySince : 0;
  awaySince = 0;
  // Relógio que voltou atrás enquanto o app estava fora: na dúvida, trava.
  if (away >= relockMs(state.cfg) || away < 0) relock();
  if (state.screen !== 'loading' && state.cfg.awayAt) setCfg({ awayAt: 0 });
}
// Grava as configurações e espera terminar (o app de Windows usa antes de fechar a janela).
export const saveCfg = () => kvSet('cfg', state.cfg);
export function relock() {
  const s = state;
  if (!s.cfg.pinOn || !s.unlocked || s.screen === 'loading' || s.screen === 'forgotPin' || (s.screen === 'pin' && s.pinMode === 'unlock')) return;
  // Trocando o PIN nos ajustes: depois de desbloquear, volta aos ajustes.
  const resume = s.screen === 'pin' ? s.pinReturn : s.screen;
  set({ unlocked: false, screen: 'pin', resume, pinMode: 'unlock', pin: '', pinTmp: '', pinMsg: '', pinError: false, confirm: null, toast: null, menu: null, bioOffer: false });
}
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' ? appAway() : appBack());

// Caderno novo deixado vazio também some sem passar pela lixeira.
function cleanItems(items: Item[], keep: string | null) {
  const out: Item[] = [];
  for (const i of items) {
    if (i.kind !== 'doc' || i.deleted || i.id === keep || !isBlankItem(i)) { out.push(i); continue; }
    if (i.pushed) { const t = tombstoneItem(i); out.push(t); void itemPut(t); hooks.changed(); }
    else void itemDel(i.id);
  }
  return out;
}

let toastTimer = 0;
export function toast(text: string, undo?: () => void) {
  clearTimeout(toastTimer);
  set({ toast: { text, undo } });
  toastTimer = window.setTimeout(() => set({ toast: null }), 5000);
}
let lastWriteWarn = 0;
dbHooks.writeFailed = () => {
  if (Date.now() - lastWriteWarn < 15000) return;
  lastWriteWarn = Date.now();
  toast('Não deu para salvar neste aparelho. Verifique o espaço livre e tente de novo.');
};
export function toastUndo() {
  const u = state.toast?.undo;
  clearTimeout(toastTimer);
  set({ toast: null });
  u?.();
}

// Anotações
export function upd(id: string, fn: (n: Note) => void) {
  let changed: Note | undefined;
  set(s => ({ notes: s.notes.map(n => { if (n.id !== id) return n; const c = { ...n }; fn(c); c.rev = n.rev + 1; changed = c; return c; }) }));
  if (changed) { void notePut(changed); hooks.changed(); }
}
export const sfx = (name: Sound) => { if (state.cfg.sounds) void playSound(name); };

export function newNote() { sfx('new-note'); openNew(); }
// Abre a anotação nova sem som: o + do celular toca o som no toque, antes da animação.
export function openNew() {
  const n = blank(uid());
  set({ notes: [n, ...cleaned(state.notes, null)], sel: n.id, day: null, screen: 'editor', section: 'diario', confirm: null });
}
export const openNote = (id: string) => go('editor', { sel: id });
export function editSeg(id: string, segId: string, text: string) {
  const t = Date.now();
  upd(id, n => {
    if (n.segs[n.segs.length - 1]?.id === segId) n.last = t;
    n.segs = n.segs.map(s => s.id === segId ? { ...s, text, ts: t } : s);
  });
}
export function typeNew(id: string, segId: string, text: string) {
  const t = Date.now();
  upd(id, n => { n.segs = [...n.segs, { id: segId, t, text, ts: t }]; n.last = t; });
}
export const setTitle = (id: string, title: string) => upd(id, n => { n.title = title; n.titleTs = Date.now(); });
export const setStatus = (id: string, status: Status) => upd(id, n => { n.status = status; n.statusTs = Date.now(); });
export const setNoteColor = (id: string, color: string) => upd(id, n => { n.color = color; n.colorTs = Date.now(); });

// Desfazer volta para a anotação que estava aberta (no Mini-Memoras, de volta no editor).
const reopenNote = (id: string) => state.mini ? go('editor', { sel: id }) : set({ sel: id });
// A anotação aberta é a escolhida no diário (no celular, a do editor).
const isOpenNote = (id: string) => state.sel === id && (state.screen === 'editor' || state.screen === 'history');
// Saiu da lista a anotação aberta: abre a próxima. Tirada pelo menu da lista, o que está aberto continua.
function afterRemove(id: string, open: boolean) {
  if (!open) return;
  // No Mini-Memoras volta para a lista sem nada aberto (uma coisa por vez na tela).
  const next = state.mini ? undefined : activeSorted(state).find(n => n.id !== id);
  set({ sel: next ? next.id : null, screen: 'history', section: 'diario' });
}
function drop(ids: string[]) {
  const gone = new Set(ids);
  set(s => ({
    notes: s.notes.flatMap(n => {
      if (!gone.has(n.id)) return [n];
      if (!n.pushed) { void noteDel(n.id); return []; }
      const t = tombstone(n); void notePut(t); return [t];
    }),
  }));
  hooks.changed();
}
export function archive(id: string) {
  const n = state.notes.find(x => x.id === id); if (!n) return;
  if (n.status === 'archived') { setStatus(id, 'active'); toast('Anotação desarquivada'); return; }
  const open = isOpenNote(id);
  setStatus(id, 'archived'); afterRemove(id, open); sfx('archive');
  toast('Anotação arquivada', () => { setStatus(id, 'active'); if (open) reopenNote(id); });
}
export function trash(id: string) {
  const n = state.notes.find(x => x.id === id); if (!n) return;
  const prev = n.status, open = isOpenNote(id);
  if (isEmpty(n)) { drop([id]); afterRemove(id, open); return; }
  setStatus(id, 'trashed'); afterRemove(id, open); sfx('trash');
  toast('Movida para a lixeira', () => { setStatus(id, prev); if (open) reopenNote(id); });
}
// Mandar para a lixeira pergunta antes (o "Desfazer" continua depois). Anotação ou caderno vazio some direto.
export function askTrash(id: string) {
  const n = state.notes.find(x => x.id === id), d = state.items.find(i => i.id === id && i.kind === 'doc');
  if (n && isEmpty(n)) return trash(id);
  if (d && isBlankItem(d)) return trashDoc(id);
  set({ confirm: { id, trash: true } });
}
export function confirmDo() {
  const c = state.confirm; if (!c) return;
  if (c.reset) { void resetDiary(); return; }
  if (c.trash && c.id) { set({ confirm: null }); if (state.items.some(i => i.id === c.id)) trashDoc(c.id); else trash(c.id); return; }
  const isDoc = !c.all && state.items.some(i => i.id === c.id);
  if (c.all || !isDoc) drop(c.all ? live(state).filter(n => n.status === 'trashed').map(n => n.id) : [c.id!]);
  (c.all ? trashedDocs(state).map(d => d.id) : isDoc ? [c.id!] : []).forEach(dropItem);
  set({ confirm: null });
  toast(c.all ? 'Lixeira esvaziada' : isDoc ? 'Caderno apagado para sempre' : 'Apagada para sempre');
}

// Cadernos e Agenda
export function updItem<T extends Item>(id: string, fn: (i: T) => void) {
  let changed: Item | undefined;
  set(s => ({ items: s.items.map(i => { if (i.id !== id) return i; const c = { ...i } as T; fn(c); c.rev = i.rev + 1; changed = c; return c; }) }));
  if (changed) { void itemPut(changed); hooks.changed(); }
}
function addItem(i: Item) {
  set(s => ({ items: [...s.items, i] }));
  void itemPut(i); hooks.changed();
}
// Nunca enviado: some de vez. Já enviado: vira registro de apagado, para os outros aparelhos saberem.
function dropItem(id: string) {
  set(s => ({
    items: s.items.flatMap(i => {
      if (i.id !== id) return [i];
      if (!i.pushed) { void itemDel(i.id); return []; }
      const t = tombstoneItem(i); void itemPut(t); return [t];
    }),
  }));
  hooks.changed();
}

// quiet: o + do celular já tocou o som no toque.
export function newDoc(quiet = false) {
  const d = blankDoc(uid());
  if (!quiet) sfx('new-note');
  set(s => ({ items: [d, ...cleanItems(s.items, null)], docSel: d.id, docEdit: true, screen: 'doc', section: 'cadernos', confirm: null }));
}
export const openDoc = (id: string) => go('doc', { docSel: id, docEdit: false });
// Sai da edição; caderno que ficou vazio some.
export function finishDoc() {
  const d = state.items.find(i => i.id === state.docSel);
  if (!d || isBlankItem(d)) go('docs', { docSel: null, docEdit: false });
  else set({ docEdit: false });
}
export const setDocTitle = (id: string, title: string) => updItem<Doc>(id, d => { d.title = title; d.titleTs = Date.now(); });
export const setDocBody = (id: string, body: string) => updItem<Doc>(id, d => { d.body = body; d.bodyTs = Date.now(); });
const setDocStatus = (id: string, status: Doc['status']) => updItem<Doc>(id, d => { d.status = status; d.statusTs = Date.now(); });
export const setDocColor = (id: string, color: string) => updItem<Doc>(id, d => { d.color = color; d.colorTs = Date.now(); });
// Fixado fica no alto da lista de Cadernos, em todos os aparelhos.
export function setDocPinned(id: string, pinned: boolean) {
  updItem<Doc>(id, d => { d.pinned = pinned; d.pinnedTs = Date.now(); });
  toast(pinned ? 'Caderno fixado no alto' : 'Caderno desafixado');
}
// Tirar da lista o caderno aberto volta para a lista (no computador, abre o próximo). Pelo menu da
// lista, o que está aberto continua aberto.
const isOpenDoc = (id: string) => state.docSel === id && (state.screen === 'doc' || state.screen === 'docs');
export function trashDoc(id: string) {
  const d = state.items.find(i => i.id === id); if (!d || d.kind !== 'doc') return;
  const next = docsOf(state).find(x => x.id !== id), open = isOpenDoc(id);
  if (isBlankItem(d)) dropItem(id);
  else {
    setDocStatus(id, 'trashed'); sfx('trash');
    toast('Caderno movido para a lixeira', () => { setDocStatus(id, 'active'); if (open) go('doc', { docSel: id, docEdit: false }); });
  }
  if (open) go('docs', { docSel: next && !onePane(state) ? next.id : null, docEdit: false });
}
export function restoreDoc(id: string) { setDocStatus(id, 'active'); toast('Caderno restaurado'); }
// Arquivar tira o caderno da lista sem apagar: ele fica no Arquivo e continua aparecendo na busca.
export function archiveDoc(id: string) {
  const d = state.items.find(i => i.id === id); if (!d || d.kind !== 'doc') return;
  if (d.status === 'archived') { setDocStatus(id, 'active'); toast('Caderno desarquivado'); return; }
  const next = docsOf(state).find(x => x.id !== id), open = isOpenDoc(id);
  if (isBlankItem(d)) dropItem(id);
  else {
    setDocStatus(id, 'archived'); sfx('archive');
    toast('Caderno arquivado', () => { setDocStatus(id, 'active'); if (open) go('doc', { docSel: id, docEdit: false }); });
  }
  if (open) go('docs', { docSel: next && !onePane(state) ? next.id : null, docEdit: false });
}

export function openDay(date: string) {
  const d = new Date(keyTime(date));
  go('agenda', { agDay: date, agY: d.getFullYear(), agM: d.getMonth() });
}
export function addTask(date: string, text: string) {
  if (text.trim()) addItem(blankTask(uid(), date, text.trim()));
}
// Arrastar uma tarefa para a posição "to" do dia: a ordem nova fica entre as vizinhas. Se as
// vizinhas estiverem coladas demais (de tanto arrastar entre as mesmas duas), o dia é renumerado.
export function reorderTask(id: string, to: number) {
  const t = state.items.find(i => i.id === id);
  if (!t || t.kind !== 'task') return;
  const rest = tasksOn(state, t.date).filter(x => x.id !== id), prev = rest[to - 1], next = rest[to];
  const setOrder = (tid: string, order: number) => updItem<Task>(tid, x => { x.order = order; x.orderTs = Date.now(); });
  if (prev && next && next.order - prev.order < 1e-3) return [...rest.slice(0, to), t, ...rest.slice(to)].forEach(x => setOrder(x.id, nextOrder()));
  setOrder(id, prev && next ? (prev.order + next.order) / 2 : prev ? prev.order + 1 : next ? next.order - 1 : t.order);
}
// Enter numa tarefa abre uma linha nova logo abaixo, já com a caixinha. Vazia, ela some ao sair dela.
export function insertTaskAfter(id: string) {
  const t = state.items.find(i => i.id === id);
  if (!t || t.kind !== 'task') return null;
  const list = tasksOn(state, t.date), next = list[list.findIndex(x => x.id === id) + 1];
  const n = blankTask(uid(), t.date, '');
  if (next) n.order = (t.order + next.order) / 2;
  addItem(n);
  return n.id;
}
export const setTaskText = (id: string, text: string) => updItem<Task>(id, t => { t.text = text; t.textTs = Date.now(); });
export const toggleTask = (id: string) => updItem<Task>(id, t => { t.done = !t.done; t.doneTs = Date.now(); });
const placeTask = (id: string, date: string, order: number) => updItem<Task>(id, t => { const n = Date.now(); t.date = date; t.dateTs = n; t.order = order; t.orderTs = n; });
export function moveTask(id: string, date: string) {
  const t = state.items.find(i => i.id === id); if (!t || t.kind !== 'task') return;
  const prev = { date: t.date, order: t.order };
  placeTask(id, date, nextOrder());
  toast('Tarefa passada para amanhã', () => placeTask(id, prev.date, prev.order));
}
export function deleteTask(id: string) {
  const t = state.items.find(i => i.id === id); if (!t || t.kind !== 'task') return;
  dropItem(id);
  // Desfazer cria a tarefa de novo: um registro de apagado não volta atrás nos outros aparelhos.
  if (t.text.trim()) toast('Tarefa apagada', () => addItem({ ...t, id: uid(), rev: 0, syncedRev: -1, pushed: false }));
}
// A observação nasce com o id que a tela já usa, para o cursor não sair do lugar.
export function setDayNote(date: string, id: string, text: string) {
  if (state.items.some(i => i.id === id)) return updItem<DayNote>(id, n => { n.text = text; n.textTs = Date.now(); });
  if (text) addItem({ ...blankDayNote(id, date), text, textTs: Date.now(), rev: 1 });
}
async function resetDiary() {
  await wipeAll();
  state = { ...initial(), mini: state.mini, mobile: state.mobile, onTop: state.onTop, screen: 'onboard', unlocked: true };
  applyTheme(state.cfg.theme);
  subs.forEach(f => f());
  toast('Diário apagado neste aparelho');
}

// PIN
let flashTimer = 0;
export function flashKey(k: string) {
  clearTimeout(flashTimer);
  set({ pressedKey: k });
  flashTimer = window.setTimeout(() => set({ pressedKey: null }), 130);
}
// Pausa depois de 5 erros seguidos: 30 s na primeira vez e cada vez mais longa, até 15 min,
// enquanto ninguém acertar o PIN. Nunca apaga nada.
const LOCK_S = [30, 60, 120, 300, 900];
const MAX_LOCK = LOCK_S[LOCK_S.length - 1] * 1000;
// Quanto falta da pausa. Se o relógio do aparelho voltou atrás, nunca passa da pausa mais longa.
export const lockLeft = () => Math.min(Math.max(0, state.cfg.lockUntil - Date.now()), MAX_LOCK);
export function fixLockClock() { if (state.cfg.lockUntil - Date.now() > MAX_LOCK) setCfg({ lockUntil: Date.now() + MAX_LOCK }); }

export function pressKey(d: string) {
  const s = state;
  fixLockClock();
  if (s.unlocking || lockLeft() > 0) return;
  if (d === 'del') { if (s.pin) sfx('pin-key'); set({ pin: s.pin.slice(0, -1) }); return; }
  if (s.pin.length >= 4) return;
  sfx('pin-key');
  const pin = s.pin + d;
  set({ pin, pinError: false, pinMsg: '' });
  if (pin.length === 4) setTimeout(() => void submitPin(pin), 140);
}
function pinFail(msg: string, extra: Partial<State> = {}) {
  sfx('pin-error');
  set(s => ({ pinError: true, pinMsg: msg, shake: s.shake + 1, ...extra }));
  setTimeout(() => set({ pin: '' }), 420);
}

// Sem conta, o PIN novo só vale depois que a pessoa confirma que guardou a chave.
let pendingPin: Partial<Cfg> | null = null;
export function commitPendingPin() { if (pendingPin) setCfg(pendingPin); pendingPin = null; }

async function submitPin(pin: string) {
  const s = state, c = s.cfg;
  if (s.screen !== 'pin') return;
  if (s.pinMode === 'unlock' || s.pinMode === 'verify') {
    if (await verifySecret(pin, c.pinSalt, c.pinHash)) {
      setCfg({ pinFails: 0, pinLocks: 0 });
      // PIN conferido: segue para trocar, desligar ou ligar neste aparelho (com o PIN que a conta já tem).
      if (s.pinMode === 'verify') {
        if (s.pinAfter === 'off') { setCfg({ pinOn: false }); set({ pin: '', pinMode: 'unlock' }); go('settings'); toast('PIN desativado neste aparelho'); }
        else if (s.pinAfter === 'on') { setCfg({ pinOn: true }); set({ pin: '', pinMode: 'unlock' }); go(s.pinReturn); toast('PIN ativado neste aparelho'); }
        else set({ pin: '', pinMode: 'create' });
        return;
      }
      unlockApp(true);
      return;
    }
    // Errar o PIN atual conta igual a errar no desbloqueio, com a mesma pausa.
    const fails = c.pinFails + 1;
    if (fails >= 5) {
      const locks = c.pinLocks + 1;
      setCfg({ pinFails: 0, pinLocks: locks, lockUntil: Date.now() + LOCK_S[Math.min(locks, LOCK_S.length) - 1] * 1000 });
      pinFail('');
    }
    else {
      setCfg({ pinFails: fails });
      pinFail(fails >= 3 ? 'PIN incorreto. ' + (5 - fails) + (5 - fails === 1 ? ' tentativa' : ' tentativas') + ' antes de uma pausa.' : 'PIN incorreto. Tente de novo.');
    }
  } else if (s.pinMode === 'create') {
    set({ pinMode: 'confirm', pinTmp: pin, pin: '' });
  } else if (pin === s.pinTmp) {
    const h = await hashSecret(pin);
    const changing = c.pinOn && s.pinReturn === 'settings';
    // Com conta, o PIN é um só para todos os aparelhos: pinTs diz qual é o mais novo.
    const next: Partial<Cfg> = { pinOn: true, pinHash: h.hash, pinSalt: h.salt, pinTs: Date.now(), pinFails: 0, lockUntil: 0, pinLocks: 0 };
    set({ pin: '', pinTmp: '', pinMode: 'unlock' });
    if (!c.account) {
      const key = randomCode('PIN', 3), kh = await hashSecret(normCode(key));
      pendingPin = { ...next, pinKeyHash: kh.hash, pinKeySalt: kh.salt };
      go('pinkey', { shownKey: key, pkReturn: s.pinReturn, pkMsg: changing ? 'PIN alterado' : 'PIN ativado' });
      return;
    }
    setCfg(next);
    hooks.changed();
    go(s.pinReturn);
    toast(changing ? 'PIN alterado em todos os seus aparelhos' : 'PIN ativado');
  } else pinFail('Os PINs não coincidem. Crie de novo.', { pinMode: 'create', pinTmp: '' });
}

// PIN certo ou digital reconhecida: abre o app e volta para onde a pessoa estava. Quem digitou o PIN
// e ainda não respondeu recebe a oferta de entrar com a digital (BioOffer, só no celular que tem uma).
function unlockApp(byPin = false) {
  const s = state, rm = reducedMotion(), r = s.resume;
  const to = r && r !== 'pin' && r !== 'forgotPin' && r !== 'loading' ? r : 'history';
  setCfg({ pinFails: 0, pinLocks: 0, lockUntil: 0 });
  set({ unlocking: true, unlocked: true, pin: '', resume: null, bioOffer: byPin && !s.cfg.bioOn && !s.cfg.bioAsked });
  sfx('unlock');
  setTimeout(() => go(to), rm ? 0 : 60);
  setTimeout(() => set({ unlocking: false }), rm ? 240 : 720);
}
// A digital (Android) foi reconhecida na tela do PIN.
export function bioUnlocked() { if (state.screen === 'pin' && state.pinMode === 'unlock' && !state.unlocked && !state.unlocking) unlockApp(); }

// O PIN da conta (vem cifrado com o nome e a cor do diário). force: quem acabou de entrar na conta
// passa a usar o PIN dela, mesmo que o daqui seja mais novo.
export function takeAccountPin(pin: { hash: string; salt: string; ts: number }, force = false) {
  const c = state.cfg;
  if (!force && pin.ts <= c.pinTs) return;
  if (pin.hash === c.pinHash && pin.salt === c.pinSalt) { if (pin.ts !== c.pinTs) setCfg({ pinTs: pin.ts }); return; }
  setCfg({ pinHash: pin.hash, pinSalt: pin.salt, pinTs: pin.ts, pinFails: 0, lockUntil: 0, pinLocks: 0 });
  if (c.pinOn && c.pinHash) toast(force ? 'Este aparelho agora usa o PIN da sua conta.' : 'O PIN da sua conta foi trocado em outro aparelho.');
}

export const startCreatePin = (ret: 'history' | 'settings') => go('pin', { pinMode: 'create', pin: '', pinMsg: '', pinError: false, pinReturn: ret });
// Trocar ou desligar o PIN nos ajustes pede o PIN atual antes.
export const startChangePin = (after: 'change' | 'off') => go('pin', { pinMode: 'verify', pinAfter: after, pin: '', pinMsg: '', pinError: false, pinReturn: 'settings' });
// Ligar o PIN num aparelho cuja conta já tem PIN: digita o PIN da conta uma vez, em vez de criar outro.
export const startUsePin = (ret: 'history' | 'settings') => go('pin', { pinMode: 'verify', pinAfter: 'on', pin: '', pinMsg: '', pinError: false, pinReturn: ret });

// Se o banco não abrir, o app não segue em frente: começar "vazio" levaria ao primeiro uso
// e a pessoa poderia gravar por cima das configurações. Tenta de novo algumas vezes.
async function readAll() {
  for (let i = 0; ; i++) {
    try { return { saved: await kvRead<Partial<Cfg>>('cfg'), stored: await notesRead(), storedItems: await itemsRead(), lastVersion: await kvRead<string>('appVersion') }; }
    catch (e) {
      if (i >= 4) throw e;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
}

// Na primeira abertura de cada versão nova, guarda uma cópia das anotações, dos cadernos,
// da agenda e das configurações como estavam. Se uma versão tiver algum defeito, os dados
// anteriores continuam no aparelho. Ficam as 3 cópias mais recentes.
async function snapshotOnUpgrade(lastVersion: string | undefined, saved: Partial<Cfg> | undefined, stored: Note[], items: Item[]) {
  if (lastVersion === APP_VERSION) return;
  if (lastVersion && (saved || stored.length || items.length)) {
    const list = (await kvRead<string[]>('backups')) ?? [];
    const key = 'backup:' + lastVersion;
    await kvSet(key, { version: lastVersion, at: Date.now(), cfg: saved, notes: stored, items });
    const keep = [key, ...list.filter(k => k !== key)];
    for (const old of keep.slice(3)) await kvDel(old);
    await kvSet('backups', keep.slice(0, 3));
  }
  await kvSet('appVersion', APP_VERSION);
}

export async function init() {
  let data;
  try { data = await readAll(); }
  catch (e) {
    console.error('Memoras: não foi possível abrir o banco', e);
    toast('Não foi possível abrir suas anotações. Feche e abra o app de novo.');
    return;
  }
  const { saved, stored, storedItems, lastVersion } = data;
  await snapshotOnUpgrade(lastVersion, saved, stored, storedItems);
  const cfg: Cfg = { ...defaultCfg, ...saved };
  if (!THEMES[cfg.theme]) cfg.theme = 'turquesa';
  // Fechado (pela pessoa ou pelo sistema) há menos tempo do que o escolhido nos Ajustes: abre sem pedir o PIN.
  const away = Date.now() - cfg.awayAt, grace = cfg.pinOn && cfg.awayAt > 0 && away >= 0 && away < relockMs(cfg);
  cfg.awayAt = 0;
  // Anotações e cadernos gravados antes da cor por item chegam sem ela: "sem cor".
  const notes = stored.filter(n => {
    if (n.deleted || !isEmpty(n) || n.status !== 'active' || n.pushed) return true;
    void noteDel(n.id); return false;
  }).map(n => ({ ...n, color: n.color ?? '', colorTs: n.colorTs ?? 0 }));
  const items = storedItems.filter(i => {
    if (i.deleted || i.kind === 'daynote' || !isBlankItem(i) || i.pushed) return true;
    void itemDel(i.id); return false;
  }).map(i => i.kind === 'doc' ? { ...i, color: i.color ?? '', colorTs: i.colorTs ?? 0, pinned: i.pinned ?? false, pinnedTs: i.pinnedTs ?? 0 } : i);
  applyTheme(cfg.theme);
  set({ cfg, notes, items });
  if (saved?.awayAt) void kvSet('cfg', cfg);
  const unlocked = !cfg.pinOn || grace;
  // Abre sem nenhuma anotação aberta: nada do diário aparece sem a pessoa escolher.
  if (hooks.recoveryPending) set({ unlocked, screen: 'forgot', fStep: 2 });
  else set({ unlocked, screen: !cfg.onboarded ? 'onboard' : !unlocked ? 'pin' : 'history', sel: null, docSel: null });
}
