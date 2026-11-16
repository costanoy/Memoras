// T13 (segunda abertura): com o tema roxo escolhido e o espelho em localStorage já gravado
// pela abertura anterior, nenhum quadro com o app na tela pode sair turquesa.
// Sobe o Vite na porta 5207 (lote-7), dentro do worktree. Saída 1 = defeito existe, 0 = corrigido.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const BASE = 'http://localhost:5207/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const up = async () => { try { return (await fetch(BASE)).ok; } catch { return false; } };

let vite = null;
if (!(await up())) {
  vite = spawn('npx', ['vite', '--port', '5207', '--strictPort'], { cwd: ROOT, shell: true, stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await up()); i++) await sleep(1000);
}
const b = await chromium.launch({ channel: 'msedge' });
let fail = false;
try {
  const c = await b.newContext({ locale: 'pt-BR', serviceWorkers: 'block', viewport: { width: 1280, height: 800 } });
  await c.route(/supabase\.co/, r => r.abort());
  // Primeira abertura: grava o tema roxo no IndexedDB e recarrega, para o init gravar o espelho.
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await p0.evaluate(cfg => new Promise((res, rej) => {
    const r = indexedDB.open('memoras', 2);
    r.onupgradeneeded = e => { if (e.oldVersion < 1) { r.result.createObjectStore('kv'); r.result.createObjectStore('notes', { keyPath: 'id' }); } if (e.oldVersion < 2) r.result.createObjectStore('items', { keyPath: 'id' }); };
    r.onsuccess = () => { const tx = r.result.transaction('kv', 'readwrite'); tx.objectStore('kv').put(cfg, 'cfg'); tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error); };
    r.onerror = () => rej(r.error);
  }), { onboarded: true, pinOn: false, theme: 'roxo' });
  await p0.reload(); await p0.waitForTimeout(2000);
  const espelho = await p0.evaluate(() => localStorage.getItem('memoras:tema'));
  await p0.close();
  // Segunda abertura: mede os quadros.
  const p = await c.newPage();
  await p.addInitScript(() => {
    window.__frames = [];
    const snap = () => { const r = document.documentElement; window.__frames.push({ acc: r.style.getPropertyValue('--acc') || '(padrao turquesa)', root: !!document.querySelector('#root > *') }); };
    const tick = () => { if (document.documentElement) snap(); if (window.__frames.length < 120) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await p.goto(BASE); await p.waitForTimeout(2500);
  const frames = await p.evaluate(() => window.__frames);
  const turquesa = frames.filter(f => f.root && f.acc.startsWith('(padrao'));
  console.log({ espelho, tema_final: frames.at(-1).acc, quadros_com_app_na_tela_em_turquesa: turquesa.length });
  fail = turquesa.length > 0 || espelho !== 'roxo';
  console.log(fail ? 'BUG: o app apareceu em turquesa antes de aplicar o tema roxo' : 'OK');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await b.close();
if (vite) { try { spawn('taskkill', ['/pid', String(vite.pid), '/T', '/F'], { stdio: 'ignore' }); } catch {} }
process.exit(fail ? 1 : 0);
