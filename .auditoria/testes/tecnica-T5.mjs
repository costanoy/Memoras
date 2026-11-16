// T5: cada tecla digitada abre uma transação no IndexedDB e re-renderiza o app inteiro.
import { start, stop, ctx, seedCfg, BASE } from './_util.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true, pinOn: false }); await p0.close();
  const p = await c.newPage();
  await p.addInitScript(() => {
    window.__tx = 0;
    const o = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (s, m) { if (m === 'readwrite' && String(s) === 'notes') window.__tx++; return o.apply(this, arguments); };
  });
  await p.goto(BASE); await p.waitForTimeout(2000);
  await p.getByRole('button', { name: /Nova anotação|Nova/ }).first().click({ timeout: 4000 }).catch(() => p.keyboard.press('Control+n'));
  await p.waitForTimeout(700);
  const ed = p.locator('[contenteditable="true"], textarea').first();
  await ed.click();
  const antes = await p.evaluate(() => window.__tx);
  const N = 30;
  await p.keyboard.type('a'.repeat(N), { delay: 20 });
  await p.waitForTimeout(300);
  const gravacoes = (await p.evaluate(() => window.__tx)) - antes;
  console.log({ teclas: N, transacoes_readwrite_em_notes: gravacoes });
  fail = gravacoes >= N * 0.8;
  console.log(fail ? 'BUG: ~1 transacao IDB por tecla (sem debounce)' : 'OK');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
