// L10: a conexão do banco do app não trata versionchange: outra aba que abra uma versão maior fica bloqueada para sempre.
import { start, stop, ctx, seedCfg, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p0 = await c.newPage(); await p0.goto(BASE); await p0.waitForTimeout(1500);
  await seedCfg(p0, { onboarded: true }); await p0.close();
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(1500);
  // Uma segunda aba (aqui, a mesma página) tenta abrir o banco numa versão maior, como faria um app atualizado.
  const r = await p.evaluate(() => new Promise(res => {
    const q = indexedDB.open('memoras', 3); let blocked = false;
    q.onblocked = () => { blocked = true; };
    q.onsuccess = () => { q.result.close(); res({ ok: true, blocked }); };
    q.onerror = () => res({ ok: false, blocked });
    setTimeout(() => res({ ok: false, blocked, timeout: true }), 4000);
  }));
  console.log(JSON.stringify(r));
  fail = !r.ok;
  console.log(fail ? 'BUG L10: a abertura da versão nova ficou bloqueada pela conexão antiga do app' : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
