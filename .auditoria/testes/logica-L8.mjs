// L8: a confirmação não devolve o foco a quem a abriu, e a barra de título fica dentro da área inerte.
import { start, stop, ctx, seedCfg, winStub, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  await c.addInitScript(winStub);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true }); await p0.close();
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  // Teclado: foca o botão "Cadernos" e abre uma confirmação (como o menu de uma anotação faria).
  await p.getByRole('button', { name: 'Cadernos' }).first().focus();
  await p.evaluate(async () => { const m = await import('/src/store.ts'); m.set({ confirm: { id: 'x', trash: true } }); });
  await p.waitForTimeout(400);
  const inertBar = await p.evaluate(() => { const t = document.querySelector('.titlebar, .tbar, [class*="title"]'); return t ? !!t.closest('[inert]') : null; });
  await p.getByRole('button', { name: 'Cancelar' }).click(); await p.waitForTimeout(400);
  const foco = await p.evaluate(() => document.activeElement?.tagName + ':' + (document.activeElement?.textContent || '').trim().slice(0, 20));
  console.log('foco depois de cancelar:', foco, '| barra de título inerte:', inertBar);
  fail = foco.startsWith('BODY') || inertBar === true;
  console.log(fail ? 'BUG L8' : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
