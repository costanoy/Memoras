import { useSyncExternalStore } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isNative } from './native';

// Versão nova do app. No Windows, o electron-updater (electron/main.cjs) procura, baixa e instala.
// No Android, o app procura nos Releases do GitHub ao abrir e, com um toque, baixa e abre o instalador
// do sistema (android/.../UpdatePlugin.java). O cartão de aviso (UpdateCard) aparece ao abrir o app
// sempre que houver versão nova.
export type UpdState = 'idle' | 'checking' | 'latest' | 'available' | 'downloading' | 'ready' | 'permission' | 'installing' | 'error';
export interface Upd { state: UpdState; version: string; percent: number; current: string; on: boolean; kind: 'win' | 'apk'; url?: string; asked?: boolean }

type WinApi = { get(): Promise<Partial<Upd>>; check(): void; install(): void; on(cb: (u: Partial<Upd>) => void): void };
const win = (window as unknown as { memorasWin?: { update?: WinApi } }).memorasWin?.update;

type ApkApi = { baixar(o: { url: string }): Promise<{ path: string }>; instalar(): Promise<{ permissao?: boolean }>; addListener(e: 'progresso', f: (p: { percent: number }) => void): Promise<PluginListenerHandle> };
// Nos testes de desenvolvimento, um dublê pode fazer o papel do plugin do Android.
const dev = import.meta.env.DEV ? (window as unknown as { __apkTeste?: ApkApi }).__apkTeste : undefined;
const apk: ApkApi | null = isNative ? registerPlugin<ApkApi>('Atualizador') : dev ?? null;

let cur: Upd | null = null;
const subs = new Set<() => void>();
function apply(u: Partial<Upd>) {
  cur = { state: 'idle', version: '', percent: 0, current: __APP_VERSION__, on: false, kind: win ? 'win' : 'apk', ...cur, ...u };
  subs.forEach(f => f());
}
if (win) { void win.get().then(apply); win.on(apply); }
else if (apk) apply({ on: true });

export const useUpdate = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => cur);

// 1.1.10 é mais nova que 1.1.9: compara número a número.
export function newer(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  return false;
}

const RELEASES = 'https://api.github.com/repos/costanoy/Memoras/releases/latest';
let lastCheck = 0, downloaded = '';
// manual: pela tela de Ajustes, mostra o erro; ao abrir o app, sem internet, só tenta da próxima vez.
export async function checkUpdate(manual = false) {
  if (win) return win.check();
  if (!apk || !navigator.onLine || cur?.state === 'downloading') return;
  lastCheck = Date.now();
  if (manual) apply({ state: 'checking' });
  try {
    const r = await fetch(RELEASES, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const j = await r.json() as { tag_name?: string; assets?: { name: string; browser_download_url: string }[] };
    const v = (j.tag_name ?? '').replace(/^v/, ''), url = j.assets?.find(a => a.name === 'Memoras.apk')?.browser_download_url;
    console.info('Memoras: versão publicada ' + (v || '?') + ', instalada ' + __APP_VERSION__);
    if (url && newer(v, __APP_VERSION__)) { if (cur?.version !== v || cur.state === 'idle' || cur.state === 'latest' || cur.state === 'checking') apply({ state: 'available', version: v, url, percent: 0 }); }
    else apply({ state: 'latest' });
  } catch (e) {
    console.warn('Memoras: não deu para procurar versão nova', e);
    apply({ state: manual ? 'error' : cur?.version ? cur.state : 'idle' });
  }
}

export async function installUpdate() {
  if (win) return win.install();
  const u = cur;
  if (!apk || !u?.url) return;
  apply({ asked: true });
  try {
    if (downloaded !== u.version) {
      apply({ state: 'downloading', percent: 0 });
      const h = await apk.addListener('progresso', p => apply({ percent: p.percent }));
      try { await apk.baixar({ url: u.url }); } finally { void h.remove(); }
      downloaded = u.version;
    }
    const r = await apk.instalar();
    apply({ state: r.permissao ? 'permission' : 'installing' });
  } catch (e) {
    console.warn('Memoras: atualização não terminou', e);
    apply({ state: 'error' });
  }
}

// Android: procura ao abrir o app e quando ele volta para a tela depois de um tempo (o celular
// costuma manter o app aberto em segundo plano por dias).
export function startUpdates() {
  if (!apk || win) return;
  setTimeout(() => void checkUpdate(), 1500);
  if (isNative) void NativeApp.addListener('appStateChange', ({ isActive }) => { if (isActive && Date.now() - lastCheck > 3600e3) void checkUpdate(); });
}
