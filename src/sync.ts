import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { createClient, isAuthApiError } from '@supabase/supabase-js';
import { aesKey, b64, derive, hashSecret, kekFromCode, open, openText, randomBytes, randomCode, seal, sealText, unb64, verifySecret } from './lib/crypto';
import { notePut } from './lib/db';
import { content, isEmpty, merge, sameContent, uid, type Note, type NoteContent } from './lib/notes';
import { get, hooks, set, setCfg, toast } from './store';
import { THEMES, type ThemeKey } from './themes';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
// PKCE: o link de "Esqueci minha senha" volta com um código que só o aparelho que pediu consegue usar.
export const supabase = url && anon ? createClient(url, anon, { auth: { flowType: 'pkce' } }) : null;

// Nos apps instalados o link do email abre o próprio app (registrado em electron/main.cjs e no AndroidManifest).
const APP_LINK = 'memoras://senha';
const installed = Capacitor.isNativePlatform() || 'memorasWin' in window;

class AppError extends Error {}
function need() {
  if (!supabase) throw new AppError('A sincronização ainda não foi configurada neste app.');
  return supabase;
}
export function friendly(e: unknown) {
  if (e instanceof AppError) return e.message;
  const m = String((e as { message?: string })?.message ?? e).toLowerCase();
  if (!navigator.onLine || m.includes('fetch') || m.includes('network')) return 'Sem conexão. Tente de novo quando a internet voltar.';
  if (m.includes('invalid login')) return 'Email ou senha incorretos.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Este email já tem conta. Use a aba Entrar.';
  if (m.includes('not confirmed')) return 'Confirme seu email pelo link que enviamos e tente de novo.';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  if (m.includes('sending') || m.includes('not authorized')) return 'Não deu para enviar o email agora. Tente mais tarde.';
  if (m.includes('signup') && (m.includes('disabled') || m.includes('not allowed'))) return 'A criação de contas está desligada no momento.';
  if (m.includes('email') && (m.includes('invalid') || m.includes('validate'))) return 'Este email não é aceito. Confira e tente de novo.';
  return 'Não deu certo agora. Tente de novo.';
}

// Entre trocar a senha e reabrir as anotações, a chave derivada da senha nova fica só na memória.
let pending: { kek: CryptoKey; auth: string } | null = null;

let dkCache: { raw: string; key: CryptoKey } | null = null;
async function dkKey() {
  const raw = get().cfg.dk;
  if (!raw) throw new AppError('Entre de novo para sincronizar.');
  if (dkCache?.raw !== raw) dkCache = { raw, key: await aesKey(unb64(raw)) };
  return dkCache.key;
}

async function adopt(userId: string, email: string, dk: Uint8Array, dkId: string, auth: string) {
  const pw = await hashSecret(auth);
  setCfg({ account: { email, userId, dkId, pwSalt: pw.salt, pwHash: pw.hash }, dk: b64(dk), lastPull: null });
  set(s => ({ notes: s.notes.map(n => ({ ...n, syncedRev: -1 })), sync: 'syncing' }));
  get().notes.forEach(n => void notePut(n));
  void syncNow();
}

async function createVault(userId: string, kek: CryptoKey) {
  const dk = randomBytes(32), dkId = uid(), recKey = randomCode('MEMO', 5);
  const { error } = await need().from('vaults').upsert({
    user_id: userId, dk_id: dkId, prefs: null,
    wrapped_pw: await seal(kek, dk), wrapped_rk: await seal(await kekFromCode(recKey), dk),
  });
  if (error) throw error;
  return { dk, dkId, recKey };
}

export async function signUp(email: string, password: string): Promise<{ recKey?: string; confirm?: boolean }> {
  const sb = need();
  email = email.trim();
  const { auth, kek } = await derive(email, password);
  const { data, error } = await sb.auth.signUp({ email, password: auth });
  if (error) throw error;
  if (!data.session || !data.user) return { confirm: true };
  const v = await createVault(data.user.id, kek);
  await adopt(data.user.id, email, v.dk, v.dkId, auth);
  return { recKey: v.recKey };
}

export async function login(email: string, password: string): Promise<{ recKey?: string; needKey?: boolean }> {
  const sb = need();
  email = email.trim();
  const { auth, kek } = await derive(email, password);
  const { data, error } = await sb.auth.signInWithPassword({ email, password: auth });
  if (error) throw error;
  const userId = data.user.id;
  const { data: vault, error: e2 } = await sb.from('vaults').select('dk_id,wrapped_pw').eq('user_id', userId).maybeSingle();
  if (e2) throw e2;
  if (!vault) {
    const v = await createVault(userId, kek);
    await adopt(userId, email, v.dk, v.dkId, auth);
    return { recKey: v.recKey };
  }
  let dk: Uint8Array;
  try { dk = await open(kek, vault.wrapped_pw); }
  catch { pending = { kek, auth }; return { needKey: true }; }
  // Quem entra numa conta durante o primeiro uso recebe o nome e a cor da conta,
  // em vez de espalhar para os outros aparelhos o que escolheu agora.
  if (!get().cfg.onboarded) setCfg({ prefsTs: 0 });
  await adopt(userId, email, dk, vault.dk_id, auth);
  return {};
}

export async function logout() {
  try { await supabase?.auth.signOut(); } catch { /* sair localmente basta */ }
  dkCache = null;
  setCfg({ account: null, dk: null, lastPull: null, invite: true });
}

export async function sendReset(email: string) {
  const { error } = await need().auth.resetPasswordForEmail(email.trim(), { redirectTo: installed ? APP_LINK : location.origin + location.pathname });
  if (error) throw error;
}

// O link do email chega aqui no Windows e no Android. Trocar o código pela sessão dispara o
// PASSWORD_RECOVERY lá embaixo, que leva ao passo 2 do "Esqueci minha senha".
const usedLinks = new Set<string>();
async function openAppLink(link: string) {
  if (!supabase || !link.startsWith(APP_LINK) || usedLinks.has(link)) return;
  usedLinks.add(link);
  const p = new URL(link).searchParams, code = p.get('code'), flowId = p.get('sb_flow_id');
  const { error } = code ? await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined) : { error: true };
  if (error) toast('Este link não vale mais. Peça um novo neste aparelho.');
}

async function sessionUser() {
  const { data } = await need().auth.getSession();
  if (!data.session?.user.email) throw new AppError('O link expirou. Peça um novo.');
  return { id: data.session.user.id, email: data.session.user.email };
}

export async function setNewPassword(password: string) {
  const u = await sessionUser();
  const d = await derive(u.email, password);
  const { error } = await need().auth.updateUser({ password: d.auth });
  if (error) throw error;
  pending = d;
}

export async function reopenWithKey(code: string): Promise<{ recKey?: string }> {
  const sb = need(), u = await sessionUser();
  if (!pending) throw new AppError('Entre com a senha nova para continuar.');
  const { data: vault, error } = await sb.from('vaults').select('dk_id,wrapped_rk').eq('user_id', u.id).maybeSingle();
  if (error) throw error;
  if (!vault) return startFresh();
  let dk: Uint8Array;
  try { dk = await open(await kekFromCode(code), vault.wrapped_rk); }
  catch { throw new AppError('Chave não confere. Confira e tente de novo.'); }
  const { error: e2 } = await sb.from('vaults').update({ wrapped_pw: await seal(pending.kek, dk) }).eq('user_id', u.id);
  if (e2) throw e2;
  await adopt(u.id, u.email, dk, vault.dk_id, pending.auth);
  pending = null;
  return {};
}

// Sem a chave: o que está no servidor não abre mais. O que está neste aparelho continua.
export async function startFresh(): Promise<{ recKey: string }> {
  const sb = need(), u = await sessionUser();
  if (!pending) throw new AppError('Entre com a senha nova para continuar.');
  const { error } = await sb.from('notes').delete().eq('user_id', u.id);
  if (error) throw error;
  const v = await createVault(u.id, pending.kek);
  await adopt(u.id, u.email, v.dk, v.dkId, pending.auth);
  pending = null;
  return { recKey: v.recKey };
}

export async function regenRecovery() {
  const sb = need(), acc = get().cfg.account, raw = get().cfg.dk;
  if (!acc || !raw) throw new AppError('Entre de novo para gerar uma chave.');
  const recKey = randomCode('MEMO', 5);
  const { error } = await sb.from('vaults').update({ wrapped_rk: await seal(await kekFromCode(recKey), unb64(raw)) }).eq('user_id', acc.userId);
  if (error) throw error;
  return recKey;
}

// Confere email e senha para o "Esqueci o PIN". Funciona offline.
export async function verifyAccount(email: string, password: string) {
  const acc = get().cfg.account;
  if (!acc || acc.email.toLowerCase() !== email.trim().toLowerCase()) return false;
  const { auth } = await derive(acc.email, password);
  if (await verifySecret(auth, acc.pwSalt, acc.pwHash)) return true;
  if (!supabase || !navigator.onLine) return false;
  const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: auth });
  if (error) return false;
  const pw = await hashSecret(auth);
  setCfg({ account: { ...acc, pwSalt: pw.salt, pwHash: pw.hash } });
  return true;
}

// Sincronização
let running = false, again = false, timer = 0;

export function scheduleSync(delay = 2500) {
  if (!get().cfg.account) return;
  clearTimeout(timer);
  timer = window.setTimeout(() => void syncNow(), delay);
}

export async function syncNow() {
  const acc = get().cfg.account;
  if (!acc || !supabase) return;
  if (!navigator.onLine) { set({ sync: 'offline' }); return; }
  if (running) { again = true; return; }
  running = true; again = false;
  clearTimeout(timer);
  set({ sync: 'syncing' });
  try {
    const sb = supabase, key = await dkKey();
    const { data: sess, error: se } = await sb.auth.getSession();
    if (!sess.session) {
      // Falha de rede ao renovar o acesso não encerra a sessão: tenta de novo na próxima vez.
      // Só sai da conta quando o servidor recusa a sessão ou ela já não existe.
      if (se && !(isAuthApiError(se) && se.status >= 400 && se.status < 500)) throw se;
      await logout(); toast('Sua sessão terminou. Entre de novo para sincronizar.'); return;
    }

    const { data: vault, error: ve } = await sb.from('vaults').select('dk_id,prefs').eq('user_id', acc.userId).maybeSingle();
    if (ve) throw ve;
    if (!vault || vault.dk_id !== acc.dkId) { await logout(); toast('Sua conta mudou em outro aparelho. Entre de novo para sincronizar.'); return; }

    // Nome do diário e cor: vale o mais recente.
    let remoteTs = 0;
    if (vault.prefs) {
      try {
        const p = JSON.parse(await openText(key, vault.prefs)) as { diaryName: string; theme: ThemeKey; ts: number };
        remoteTs = p.ts;
        if (p.ts > get().cfg.prefsTs && THEMES[p.theme]) setCfg({ diaryName: p.diaryName, theme: p.theme, prefsTs: p.ts });
      } catch { /* prefs ilegíveis: regravamos abaixo */ }
    }
    const c = get().cfg;
    if (c.prefsTs > remoteTs || !vault.prefs) {
      const blob = await sealText(key, JSON.stringify({ diaryName: c.diaryName, theme: c.theme, ts: c.prefsTs }));
      const { error } = await sb.from('vaults').update({ prefs: blob }).eq('user_id', acc.userId);
      if (error) throw error;
    }

    // Puxa o que mudou e junta com o que está aqui. O servidor carimba updated_at no começo da
    // gravação, então algo de outro aparelho pode chegar depois do último pull com horário anterior:
    // rever o último minuto pega esses casos (juntar de novo o que já está aqui não muda nada).
    const incoming: { id: string; c: NoteContent }[] = [];
    let lastPull = c.lastPull;
    const lastT = c.lastPull ? Date.parse(c.lastPull) : NaN;
    const since = Number.isNaN(lastT) ? c.lastPull : new Date(lastT - 60000).toISOString();
    for (let from = 0; ; from += 500) {
      let q = sb.from('notes').select('id,data,updated_at').eq('user_id', acc.userId).order('updated_at').order('id').range(from, from + 499);
      if (since) q = q.gte('updated_at', since);
      const { data, error } = await q;
      if (error) throw error;
      for (const r of data) {
        try { incoming.push({ id: r.id, c: content(JSON.parse(await openText(key, r.data))) }); }
        catch { console.warn('Memoras: anotação ilegível ignorada', r.id); }
        if (!lastPull || r.updated_at > lastPull) lastPull = r.updated_at;
      }
      if (data.length < 500) break;
    }
    if (incoming.length) {
      const touched: Note[] = [];
      set(s => {
        const byId = new Map(s.notes.map(n => [n.id, n]));
        for (const r of incoming) {
          const local = byId.get(r.id);
          if (!local) { const n: Note = { id: r.id, ...r.c, rev: 0, syncedRev: 0, pushed: true }; byId.set(r.id, n); touched.push(n); continue; }
          const m = merge(content(local), r.c);
          const rev = sameContent(m, local) ? local.rev : local.rev + 1;
          const n: Note = { ...local, ...m, rev, syncedRev: sameContent(m, r.c) ? rev : -1, pushed: true };
          if (n.rev !== local.rev || n.syncedRev !== local.syncedRev || !local.pushed) { byId.set(r.id, n); touched.push(n); }
        }
        return { notes: [...byId.values()] };
      });
      touched.forEach(n => void notePut(n));
    }

    // Envia o que mudou aqui, já cifrado.
    const dirty = get().notes.filter(n => n.rev !== n.syncedRev && (n.deleted || n.pushed || !isEmpty(n)));
    for (let i = 0; i < dirty.length; i += 100) {
      const chunk = dirty.slice(i, i + 100);
      const rows = await Promise.all(chunk.map(async n => ({ user_id: acc.userId, id: n.id, data: await sealText(key, JSON.stringify(content(n))) })));
      const { error } = await sb.from('notes').upsert(rows);
      if (error) throw error;
      const sent = new Map(chunk.map(n => [n.id, n.rev]));
      set(s => ({ notes: s.notes.map(n => sent.has(n.id) ? { ...n, syncedRev: sent.get(n.id)!, pushed: true } : n) }));
      get().notes.forEach(n => { if (sent.has(n.id)) void notePut(n); });
    }

    if (lastPull !== c.lastPull) setCfg({ lastPull });
    set({ sync: 'synced' });
  } catch (e) {
    console.warn('Memoras: sincronização falhou', e);
    set({ sync: navigator.onLine ? 'error' : 'offline' });
  } finally {
    running = false;
    if (again) void syncNow();
  }
}

export function startSync() {
  hooks.changed = () => scheduleSync();
  window.addEventListener('online', () => void syncNow());
  window.addEventListener('offline', () => set({ sync: 'offline' }));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') scheduleSync(300); });
  window.setInterval(() => { if (document.visibilityState === 'visible') void syncNow(); }, 60000);
  void syncNow();
}

// O link de redefinição de senha abre o app já no passo 2.
supabase?.auth.onAuthStateChange((event, session) => {
  if (event !== 'PASSWORD_RECOVERY') return;
  hooks.recoveryPending = true;
  if (get().screen !== 'loading') set({ screen: 'forgot', fStep: 2, fEmail: session?.user.email ?? '' });
  else set({ fEmail: session?.user.email ?? '' });
});

// Links memoras:// que abrem o app: no Windows chegam pela ponte do Electron, no Android pelo plugin App.
if (supabase) {
  (window as unknown as { memorasWin?: { onLink?(cb: (url: string) => void): void } }).memorasWin?.onLink?.(l => void openAppLink(l));
  if (Capacitor.isNativePlatform()) {
    void NativeApp.addListener('appUrlOpen', e => void openAppLink(e.url));
    void NativeApp.getLaunchUrl().then(r => { if (r?.url) void openAppLink(r.url); }, () => {});
  }
}
