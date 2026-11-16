// T3: Ctrl+1 com texto na "Adicionar tarefa" da Agenda descarta a tarefa digitada.
import { start, stop, ctx, seedCfg, winStub, BASE } from './_util.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true, pinOn: false }); await p0.close();
  const p = await c.newPage();
  await p.addInitScript(winStub);
  await p.goto(BASE); await p.waitForTimeout(2000);
  await p.keyboard.press('Control+3'); await p.waitForTimeout(600);
  const inp = p.getByLabel('Adicionar tarefa').first();
  await inp.click(); await inp.fill('comprar pao');
  // Controle: Enter salva.
  await p.keyboard.press('Control+1'); await p.waitForTimeout(500);
  await p.keyboard.press('Control+3'); await p.waitForTimeout(600);
  const txt = await p.locator('body').innerText();
  const saved = txt.includes('comprar pao') || (await p.locator('input.tasktext').evaluateAll(a => a.some(i => i.value === 'comprar pao')));
  console.log(saved ? 'OK: tarefa salva' : 'BUG: a tarefa digitada sumiu ao trocar de tela com Ctrl+1');
  fail = !saved;
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
