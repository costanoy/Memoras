// T13: com outro tema escolhido, o primeiro quadro renderizado do app sai turquesa.
import { start, stop, ctx, seedCfg, BASE } from './_util.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true, pinOn: false, theme: 'roxo' }); await p0.close();
  const p = await c.newPage();
  await p.addInitScript(() => {
    window.__frames = [];
    const snap = () => { const r = document.documentElement; window.__frames.push({ acc: r.style.getPropertyValue('--acc') || '(padrao turquesa)', root: !!document.querySelector('#root > *') }); };
    const tick = () => { if (document.documentElement) snap(); if (window.__frames.length < 120) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await p.goto(BASE); await p.waitForTimeout(2500);
  const frames = await p.evaluate(() => window.__frames);
  const renderedDefault = frames.filter(f => f.root && f.acc.startsWith('(padrao'));
  const final = frames.at(-1).acc;
  console.log({ tema_final: final, quadros_com_app_na_tela_em_turquesa: renderedDefault.length });
  fail = renderedDefault.length > 0;
  console.log(fail ? 'BUG: o app apareceu em turquesa antes de aplicar o tema roxo' : 'OK');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
