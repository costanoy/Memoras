// L12: ao acionar "Pronto" pelo teclado, o botão some e o foco cai no body (e depois de "Editar" também pode cair).
import { start, stop, ctx, seedCfg, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true }); await p0.close();
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: 'Cadernos' }).first().click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Novo caderno/i }).first().click(); await p.waitForTimeout(600);
  await p.keyboard.type('Titulo'); await p.keyboard.press('Tab'); await p.keyboard.type('corpo do caderno'); await p.waitForTimeout(300);
  const foco = () => p.evaluate(() => { const a = document.activeElement; return a.tagName + ':' + (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 20); });
  console.log('em edição, foco em:', await foco());
  await p.getByRole('button', { name: /Pronto/ }).focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const depoisPronto = await foco();
  console.log('depois de Pronto (Enter), foco em:', depoisPronto);
  const editar = p.getByRole('button', { name: 'Editar' });
  await editar.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
  const depoisEditar = await foco();
  console.log('depois de Editar (Enter), foco em:', depoisEditar);
  fail = depoisPronto.startsWith('BODY');
  console.log(fail ? 'BUG L12: o foco do teclado se perde depois de Pronto' : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
