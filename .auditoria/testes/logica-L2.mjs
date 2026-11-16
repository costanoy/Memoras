// L2: tarefa digitada na Agenda some se a tela troca (Ctrl+1) sem tirar o foco do campo.
import { start, stop, ctx, seedCfg, winStub, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  await c.addInitScript(winStub); // ativa os atalhos do app de Windows
  const p0 = await c.newPage();
  await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true });
  await p0.close();
  const p = await c.newPage();
  await p.goto(BASE); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: 'Agenda' }).first().click(); await p.waitForTimeout(500);
  await p.getByLabel('Adicionar tarefa').click(); await p.keyboard.type('comprar pão');
  await p.keyboard.press('Control+1'); await p.waitForTimeout(600);
  const saiu = await p.getByLabel('Adicionar tarefa').count() === 0;
  console.log('a tela trocou com o campo em foco:', saiu);
  await p.getByRole('button', { name: 'Agenda' }).first().click(); await p.waitForTimeout(500);
  const txt = await p.locator('input.tasktext').evaluateAll(a => a.map(i => i.value));
  console.log('campos na Agenda depois de voltar:', JSON.stringify(txt));
  fail = saiu && !txt.includes('comprar pão');
  console.log(fail ? 'BUG L2: a tarefa digitada sumiu' : 'ok (nao reproduziu)');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
