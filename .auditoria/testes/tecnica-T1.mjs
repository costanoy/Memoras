// T1: recarga com a janela escondida (minimizada) destrava o diário sem PIN.
import { start, stop, ctx, seedCfg, BASE } from './_util.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p0 = await c.newPage();
  await p0.goto(BASE); await p0.waitForTimeout(1500);
  // PIN ligado, janela saiu há 5 s (como ao minimizar), tempo de trava = 5 min.
  await seedCfg(p0, { onboarded: true, pinOn: true, pinHash: 'x', pinSalt: 'x', lockAfter: 5, awayAt: Date.now() - 5000 });
  await p0.close();
  const p = await c.newPage();
  // Página que já nasce escondida: nunca recebe o evento de esconder.
  await p.addInitScript(() => {
    window.__vis = 'hidden'; window.__off = 0;
    Object.defineProperty(document, 'visibilityState', { get: () => window.__vis });
    Object.defineProperty(document, 'hidden', { get: () => window.__vis === 'hidden' });
    const n = Date.now.bind(Date); Date.now = () => n() + window.__off;
  });
  await p.goto(BASE); await p.waitForTimeout(2000);
  // Horas depois, a janela volta.
  await p.evaluate(() => { window.__off = 3 * 3600 * 1000; window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(800);
  const pin = await p.locator('.pintitle').count();
  console.log(pin ? 'OK: pediu o PIN' : 'BUG: o diário abriu sem pedir o PIN depois de 3 h');
  fail = !pin;
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
