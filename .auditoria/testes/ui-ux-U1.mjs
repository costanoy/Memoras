// U1: com a confirmação aberta, a barra de título fica dentro de [inert].
import { start, stop, ctx, seedCfg, winStub, BASE } from './_util-uiux.mjs';
const b = await start(); let fail = false;
try {
  const c = await ctx(b);
  await c.addInitScript(winStub);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true }); await p0.close();
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  console.log('titlebar:', await p.locator('.titlebar, .tbar, [class*=title]').count());
  // abre uma anotação nova e pede a lixeira
  await p.keyboard.press('Control+n'); await p.waitForTimeout(800);
  await p.keyboard.type('Texto de teste'); await p.waitForTimeout(1500);
  await p.locator('[aria-label="Mover para a lixeira"]').first().click(); await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const dlg = document.querySelector('[role=dialog],[role=alertdialog]');
    const close = [...document.querySelectorAll('button')].find(x => /^fechar$/i.test(x.getAttribute('aria-label') || x.title || ''));
    return { dlg: !!dlg, close: !!close, inert: close ? !!close.closest('[inert]') : null };
  });
  console.log(JSON.stringify(r));
  fail = !(r.dlg && r.close && r.inert);
  console.log(fail ? 'nao reproduziu' : 'BUG: botao fechar da barra de titulo inerte com a confirmacao aberta');
  fail = !fail; // sai 1 quando o bug existe
} catch (e) { console.error('Erro no teste', e); process.exit(2); }
await stop(b); process.exit(fail ? 1 : 0);
