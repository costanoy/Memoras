// Utilitário dos testes da auditoria técnica: sobe o Vite em 5192 (se preciso) e abre o app sem Supabase.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
export const BASE = 'http://localhost:5192/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let vite = null;
async function up() { try { return (await fetch(BASE)).ok; } catch { return false; } }
export async function start() {
  if (!(await up())) {
    vite = spawn('npx', ['vite', '--port', '5192', '--strictPort'], { cwd: 'C:/Users/Vinicius Costa/Desktop/Memoras', shell: true, stdio: 'ignore' });
    for (let i = 0; i < 60 && !(await up()); i++) await sleep(1000);
  }
  return chromium.launch({ channel: 'msedge' });
}
export async function stop(browser) {
  await browser?.close();
  if (vite) { try { spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
}
export async function ctx(browser, opts = {}) {
  const c = await browser.newContext({ locale: 'pt-BR', serviceWorkers: 'block', viewport: { width: 1280, height: 800 }, ...opts });
  await c.route(/supabase\.co/, r => r.abort());
  return c;
}
// Grava o cfg no IndexedDB do app (numa página já aberta na origem do Vite).
export async function seedCfg(page, cfg) {
  await page.evaluate(c => new Promise((res, rej) => {
    const r = indexedDB.open('memoras', 2);
    r.onupgradeneeded = e => { if (e.oldVersion < 1) { r.result.createObjectStore('kv'); r.result.createObjectStore('notes', { keyPath: 'id' }); } if (e.oldVersion < 2) r.result.createObjectStore('items', { keyPath: 'id' }); };
    r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(c, 'cfg'); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); };
    r.onerror = () => rej(r.error);
  }), cfg);
}
export const winStub = `window.memorasWin={minimize(){},toggleMaximize(){},close(){},onMaximized(){},mode:'full'};`;
