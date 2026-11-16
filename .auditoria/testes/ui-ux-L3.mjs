// L3b: com o painel < 600 px, a pílula de texto "Hoje" da Agenda vira 44 px com padding 0 e o texto transborda.
import { start, stop, ctx, seedCfg, winStub, BASE } from './_util-uiux.mjs';
const b = await start(); let fail = false;
try {
  const c = await ctx(b, { viewport: { width: 760, height: 800 } }); await c.addInitScript(winStub);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true }); await p0.close();
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  await p.keyboard.press('Control+3'); await p.waitForTimeout(500);
  await p.locator('[aria-label="Dia anterior"]').click(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const el = [...document.querySelectorAll('.ibar .pill')].find(x => x.textContent.trim() === 'Hoje'); if (!el) return null;
    const panel = el.closest('.panel'); const cs = getComputedStyle(el);
    return { panel: panel?.getBoundingClientRect().width, w: el.getBoundingClientRect().width, pad: cs.paddingLeft, sw: el.scrollWidth, cw: el.clientWidth };
  });
  console.log(JSON.stringify(r));
  fail = !r || (r.panel < 600 && r.pad === '0px');
  console.log(fail ? 'BUG: pilula Hoje sem respiro/transbordando' : 'OK');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b); process.exit(fail ? 1 : 0);
