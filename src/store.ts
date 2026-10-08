import { useSyncExternalStore } from 'react';
import { dbHooks, kvDel, kvRead, kvSet, noteDel, notePut, notesRead, wipeAll } from './lib/db';
import { hashSecret, normCode, randomCode, verifySecret } from './lib/crypto';
import { blank, isEmpty, nd, tombstone, uid, type Note, type Status } from './lib/notes';
import { playSound, type Sound } from './sounds';
import { applyTheme, THEMES, type ThemeKey } from './themes';

export type Screen = 'loading' | 'pin' | 'forgotPin' | 'pinkey' | 'onboard' | 'auth' | 'recovery' | 'forgot' | 'history' | 'editor' | 'search' | 'archive' | 'settings';
export type Sync = 'synced' | 'syncing' | 'offline' | 'error';

export interface Account { email: string; userId: string; dkId: string; pwSalt: string; pwHash: string }

// Tudo o que fica gravado no aparelho além das anotações.
export interface Cfg {
  onboarded: boolean;
  diaryName: string; theme: ThemeKey; prefsTs: number;
  pinOn: boolean; pinHash: string; pinSalt: string; pinKeyHash: string; pinKeySalt: string;
  pinFails: number; lockUntil: number;
  invite: boolean;
  sounds: boolean;
  account: Account | null; dk: string | null; lastPull: string | null;
}

export interface State {
  mobile: boolean;
  screen: Screen;
  unlocked: boolean;
  cfg: Cfg;
  sync: Sync;
  notes: Note[];
  sel: string | null;
  query: string;
  shelf: 'archive' | 'trash';
  calOpen: boolean; calY: number; calM: number; day: number | null;
  toast: { text: string; undo?: () => void } | null;
  confirm: { id?: string; all?: boolean; reset?: boolean } | null;
  pinMode: 'unlock' | 'create' | 'confirm'; pin: string; pinTmp: string; pinError: boolean; pinMsg: string; shake: number;
  pinReturn: 'history' | 'settings'; pressedKey: string | null; unlocking: boolean;
  onStep: number; storeMode: 'local' | 'account'; obPin: boolean;
  authMode: 'signup' | 'login'; authReturn: 'onboard' | 'settings';
  shownKey: string; recReturn: 'onboardPin' | 'settings'; pkReturn: 'history' | 'settings'; pkMsg: string;
  fStep: number; fEmail: string;
}

const defaultCfg: Cfg = {
  onboarded: false, diaryName: 'Meu diário', theme: 'turquesa', prefsTs: 0,
  pinOn: false, pinHash: '', pinSalt: '', pinKeyHash: '', pinKeySalt: '', pinFails: 0, lockUntil: 0,
  invite: true, sounds: true, account: null, dk: null, lastPull: null,
};

// Versão do app (do package.json), usada para guardar uma cópia dos dados a cada atualização.
const APP_VERSION = __APP_VERSION__;

const mq = window.matchMedia('(max-width: 719.98px)');
const rmq = window.matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => rmq.matches;

const now = new Date();
const initial = (): State => ({
  mobile: mq.matches, screen: 'loading', unlocked: false, cfg: { ...defaultCfg }, sync: navigator.onLine ? 'synced' : 'offline',
  notes: [], sel: null, query: '', shelf: 'archive',
  calOpen: false, calY: now.getFullYear(), calM: now.getMonth(), day: null,
  toast: null, confirm: null,
  pinMode: 'unlock', pin: '', pinTmp: '', pinError: false, pinMsg: '', shake: 0, pinReturn: 'history', pressedKey: null, unlocking: false,
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
mq.addEventListener('change', () => set({ mobile: mq.matches }));

// A sincronização se pendura aqui para saber quando algo mudou.
export const hooks = { changed: () => {}, recoveryPending: false };

export function setCfg(patch: Partial<Cfg>) {
  set(s => ({ cfg: { ...s.cfg, ...patch } }));
  if ('theme' in patch) applyTheme(state.cfg.theme);
  void kvSet('cfg', state.cfg);
}
export function setPrefs(patch: { diaryName?: string; theme?: ThemeKey }) {
  setCfg({ ...patch, prefsTs: Date.now() });
  hooks.changed();
}

const APP: Screen[] = ['history', 'editor', 'search', 'archive', 'settings'];
export const inApp = (s: Screen) => APP.includes(s);
export const live = (s: State) => s.notes.filter(n => !n.deleted);
export const activeSorted = (s: State) => s.notes.filter(n => !n.deleted && n.status === 'active').sort((a, b) => nd(b) - nd(a));

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

export function go(screen: Screen, extra: Partial<State> = {}) {
  if (inApp(screen) && state.cfg.pinOn && !state.unlocked) {
    screen = 'pin';
    extra = { ...extra, pinMode: 'unlock', pin: '', pinMsg: '', pinError: false };
  }
  // Quem chega ao diário por outro caminho (login, link de senha) não revê o primeiro uso.
  if (inApp(screen) && !state.cfg.onboarded) setCfg({ onboarded: true });
  const sel = extra.sel !== undefined ? extra.sel : state.sel;
  const keep = screen === 'editor' || (screen === 'history' && !state.mobile) ? sel : null;
  set({ screen, confirm: null, ...extra, notes: cleaned(state.notes, keep) });
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
  set({ notes: [n, ...cleaned(state.notes, null)], sel: n.id, day: null, screen: 'editor', confirm: null });
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

function afterRemove(id: string) {
  const next = activeSorted(state).find(n => n.id !== id);
  set({ sel: next ? next.id : null, screen: 'history' });
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
  setStatus(id, 'archived'); afterRemove(id); sfx('archive');
  toast('Anotação arquivada', () => { setStatus(id, 'active'); set({ sel: id }); });
}
export function trash(id: string) {
  const n = state.notes.find(x => x.id === id); if (!n) return;
  const prev = n.status;
  if (isEmpty(n)) { drop([id]); afterRemove(id); return; }
  setStatus(id, 'trashed'); afterRemove(id); sfx('trash');
  toast('Movida para a lixeira', () => { setStatus(id, prev); set({ sel: id }); });
}
export function confirmDo() {
  const c = state.confirm; if (!c) return;
  if (c.reset) { void resetDiary(); return; }
  drop(c.all ? live(state).filter(n => n.status === 'trashed').map(n => n.id) : [c.id!]);
  set({ confirm: null });
  toast(c.all ? 'Lixeira esvaziada' : 'Apagada para sempre');
}
async function resetDiary() {
  await wipeAll();
  state = { ...initial(), screen: 'onboard', unlocked: true };
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
export function pressKey(d: string) {
  const s = state;
  if (s.unlocking || s.cfg.lockUntil > Date.now()) return;
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
  if (s.pinMode === 'unlock') {
    if (await verifySecret(pin, c.pinSalt, c.pinHash)) {
      const rm = reducedMotion();
      setCfg({ pinFails: 0 });
      set({ unlocking: true, unlocked: true, pin: '' });
      sfx('unlock');
      setTimeout(() => go('history'), rm ? 0 : 60);
      setTimeout(() => set({ unlocking: false }), rm ? 240 : 720);
      return;
    }
    const fails = c.pinFails + 1;
    if (fails >= 5) { setCfg({ pinFails: 0, lockUntil: Date.now() + 30000 }); pinFail(''); }
    else {
      setCfg({ pinFails: fails });
      pinFail(fails >= 3 ? 'PIN incorreto. ' + (5 - fails) + (5 - fails === 1 ? ' tentativa' : ' tentativas') + ' antes de uma pausa.' : 'PIN incorreto. Tente de novo.');
    }
  } else if (s.pinMode === 'create') {
    set({ pinMode: 'confirm', pinTmp: pin, pin: '' });
  } else if (pin === s.pinTmp) {
    const h = await hashSecret(pin);
    const msg = c.pinOn && s.pinReturn === 'settings' ? 'PIN alterado' : 'PIN ativado';
    const next: Partial<Cfg> = { pinOn: true, pinHash: h.hash, pinSalt: h.salt, pinFails: 0, lockUntil: 0 };
    set({ pin: '', pinTmp: '', pinMode: 'unlock' });
    if (!c.account) {
      const key = randomCode('PIN', 3), kh = await hashSecret(normCode(key));
      pendingPin = { ...next, pinKeyHash: kh.hash, pinKeySalt: kh.salt };
      go('pinkey', { shownKey: key, pkReturn: s.pinReturn, pkMsg: msg });
      return;
    }
    setCfg(next);
    go(s.pinReturn);
    toast(msg);
  } else pinFail('Os PINs não coincidem. Crie de novo.', { pinMode: 'create', pinTmp: '' });
}
export const startCreatePin = (ret: 'history' | 'settings') => go('pin', { pinMode: 'create', pin: '', pinMsg: '', pinError: false, pinReturn: ret });

// Se o banco não abrir, o app não segue em frente: começar "vazio" levaria ao primeiro uso
// e a pessoa poderia gravar por cima das configurações. Tenta de novo algumas vezes.
async function readAll() {
  for (let i = 0; ; i++) {
    try { return { saved: await kvRead<Partial<Cfg>>('cfg'), stored: await notesRead(), lastVersion: await kvRead<string>('appVersion') }; }
    catch (e) {
      if (i >= 4) throw e;
      await new Promise(r => setTimeout(r, 400 * (i + 1)));
    }
  }
}

// Na primeira abertura de cada versão nova, guarda uma cópia das anotações e das
// configurações como estavam. Se uma versão tiver algum defeito, os dados anteriores
// continuam no aparelho. Ficam as 3 cópias mais recentes.
async function snapshotOnUpgrade(lastVersion: string | undefined, saved: Partial<Cfg> | undefined, stored: Note[]) {
  if (lastVersion === APP_VERSION) return;
  if (lastVersion && (saved || stored.length)) {
    const list = (await kvRead<string[]>('backups')) ?? [];
    const key = 'backup:' + lastVersion;
    await kvSet(key, { version: lastVersion, at: Date.now(), cfg: saved, notes: stored });
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
  const { saved, stored, lastVersion } = data;
  await snapshotOnUpgrade(lastVersion, saved, stored);
  const cfg: Cfg = { ...defaultCfg, ...saved };
  if (!THEMES[cfg.theme]) cfg.theme = 'turquesa';
  const notes = stored.filter(n => {
    if (n.deleted || !isEmpty(n) || n.status !== 'active' || n.pushed) return true;
    void noteDel(n.id); return false;
  });
  applyTheme(cfg.theme);
  set({ cfg, notes });
  const first = activeSorted(state)[0];
  const unlocked = !cfg.pinOn;
  if (hooks.recoveryPending) set({ unlocked, screen: 'forgot', fStep: 2 });
  else set({ unlocked, screen: !cfg.onboarded ? 'onboard' : cfg.pinOn ? 'pin' : 'history', sel: !state.mobile && first ? first.id : null });
}
