// T2: em janela com menos de 760 px de altura, a tela do PIN ignora a área segura (--sat/--sab).
import { start, stop, ctx, seedCfg, BASE } from './_util.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b, { viewport: { width: 360, height: 740 } });
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true, pinOn: true, pinHash: 'x', pinSalt: 'x', awayAt: 0 }); await p0.close();
  const p = await c.newPage();
  await p.goto(BASE); await p.waitForTimeout(2000);
  // Simula uma barra de status de 28 px e barra de gestos de 24 px.
  await p.addStyleTag({ content: ':root{--sat:28px !important;--sab:24px !important}' });
  const r = await p.evaluate(() => { const f = document.querySelector('.flow'); const s = getComputedStyle(f); return { tela: !!document.querySelector('.pintitle'), top: s.paddingTop, bottom: s.paddingBottom }; });
  console.log(r);
  const ok = r.tela && parseFloat(r.top) >= 12 + 28 && parseFloat(r.bottom) >= 12 + 24;
  console.log(ok ? 'OK' : 'BUG: padding da tela do PIN ignora a area segura em 360x740');
  fail = !ok;
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
