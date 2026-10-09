import { useSyncExternalStore } from 'react';
import { toast } from './store';

// Atualizações do app de Windows (ver electron/main.cjs). Fora dele, nada disso aparece.
export interface Upd { state: 'idle' | 'checking' | 'latest' | 'downloading' | 'ready' | 'error'; version: string; percent: number; current: string; on: boolean }
type Api = { get(): Promise<Upd>; check(): void; install(): void; on(cb: (u: Partial<Upd>) => void): void };
const api = (window as unknown as { memorasWin?: { update?: Api } }).memorasWin?.update;

let cur: Upd | null = null;
const subs = new Set<() => void>();
function apply(u: Partial<Upd>) {
  const was = cur?.state;
  cur = { state: 'idle', version: '', percent: 0, current: '', on: false, ...cur, ...u };
  subs.forEach(f => f());
  if (cur.on && cur.state === 'ready' && was !== 'ready') toast('A versão ' + cur.version + ' está pronta. Clique em Atualizar, no alto da janela.');
}
if (api) { void api.get().then(apply); api.on(apply); }

export const useUpdate = () => useSyncExternalStore(f => { subs.add(f); return () => subs.delete(f); }, () => cur);
export const checkUpdate = () => api?.check();
export const installUpdate = () => api?.install();
