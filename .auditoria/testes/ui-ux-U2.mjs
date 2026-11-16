// U2: texto digitado em "Adicionar tarefa" se perde ao trocar de tela com Ctrl+1.
import { start, stop, ctx, seedCfg, BASE } from './_util-uiux.mjs';
const b = await start(); let fail = false;
try {
  const c = await ctx(b); await c.addInitScript("window.memorasWin={minimize(){},toggleMaximize(){},close(){},onMaximized(){},mode:'full'};");
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true }); await p0.close();
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  await p.keyboard.press('Control+3'); await p.waitForTimeout(500);
  const inp = p.locator('input[aria-label="Adicionar tarefa"]');
  console.log('campo visivel:', await inp.count());
  await inp.first().click(); await p.keyboard.type('Comprar pao');
  await p.keyboard.press('Control+1'); await p.waitForTimeout(500);
  await p.keyboard.press('Control+3'); await p.waitForTimeout(500);
  const n = await p.locator('.task', { hasText: 'Comprar pao' }).count()
    + await p.locator('input.tasktext').evaluateAll(els => els.filter(e => e.value.includes('Comprar')).length);
  console.log(n ? 'OK: tarefa gravada' : 'BUG: tarefa perdida');
  fail = !n;
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b); process.exit(fail ? 1 : 0);
