// T4: o diálogo de confirmação não devolve o foco ao botão de origem e a barra de título fica inerte.
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
  await p.keyboard.press('Control+n'); await p.waitForTimeout(700);
  await p.keyboard.type('nota de teste'); await p.waitForTimeout(400);
  const trash = p.getByRole('button', { name: 'Mover para a lixeira' }).first();
  await trash.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const dlg = await p.locator('[role=alertdialog]').count();
  const barInert = await p.evaluate(() => { const t = document.querySelector('.titlebar'); return !!t?.closest('[inert]'); });
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  const foco = await p.evaluate(() => { const a = document.activeElement; return a === document.body ? 'body' : (a.getAttribute('aria-label') || a.textContent || a.tagName).slice(0, 30); });
  console.log({ dialogoAbriu: dlg, barraInerteComDialogo: barInert, focoDepoisDoEsc: foco });
  const ok = dlg === 1 && !barInert && foco === 'Mover para a lixeira';
  console.log(ok ? 'OK' : 'BUG: foco nao volta ao botao de origem e/ou barra de titulo inerte');
  fail = !ok;
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
