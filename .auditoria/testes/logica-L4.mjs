// L4: destravado, abrir "Esqueci o PIN" pelos Ajustes e sair do app por mais tempo que o limite não trava o app.
import { start, stop, ctx, seedCfg, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p = await c.newPage();
  await p.addInitScript(() => {
    window.__vis = 'visible'; window.__off = 0;
    Object.defineProperty(document, 'visibilityState', { get: () => window.__vis });
    Object.defineProperty(document, 'hidden', { get: () => window.__vis === 'hidden' });
    const n = Date.now.bind(Date); Date.now = () => n() + window.__off;
  });
  await p.goto(BASE); await p.waitForTimeout(1500);
  await seedCfg(p, { onboarded: true, pinOn: true, pinHash: 'x', pinSalt: 'x', lockAfter: 5 });
  await p.reload(); await p.waitForTimeout(1500);
  // Estado: PIN ligado e app destravado (como depois de digitar o PIN), nos Ajustes, "Trocar PIN", "Esqueci o PIN".
  const r = await p.evaluate(async () => {
    const m = await import('/src/store.ts');
    m.set({ unlocked: true }); m.go('settings');
    m.go('forgotPin');
    const antes = { screen: m.get().screen, unlocked: m.get().unlocked };
    // Sai do app por 1 hora e volta.
    window.__vis = 'hidden'; document.dispatchEvent(new Event('visibilitychange'));
    window.__off = 3600 * 1000; window.__vis = 'visible'; document.dispatchEvent(new Event('visibilitychange'));
    return { antes, depois: { screen: m.get().screen, unlocked: m.get().unlocked } };
  });
  console.log(JSON.stringify(r));
  fail = r.depois.unlocked === true;
  console.log(fail ? 'BUG L4: continua destravado na tela Esqueci o PIN depois de 1 h fora' : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
