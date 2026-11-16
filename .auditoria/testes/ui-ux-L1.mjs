// L1: em janela baixa (<=760 px) a regra do .flow perde a área segura (--sat/--sab).
import { start, stop, ctx, BASE } from './_util-uiux.mjs';
const b = await start(); let fail = false;
try {
  const c = await ctx(b, { viewport: { width: 360, height: 640 } });
  const p = await c.newPage();
  await p.goto(BASE); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    document.documentElement.style.setProperty('--sat', '32px'); document.documentElement.style.setProperty('--sab', '24px');
    const f = document.querySelector('.flow'); if (!f) return null;
    const cs = getComputedStyle(f); return { top: parseFloat(cs.paddingTop), bottom: parseFloat(cs.paddingBottom) };
  });
  console.log(JSON.stringify(r));
  fail = !r || r.top < 32 || r.bottom < 24;
  console.log(fail ? 'BUG: padding sem a área segura' : 'OK');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b); process.exit(fail ? 1 : 0);
