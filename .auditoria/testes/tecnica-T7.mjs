// T7: o app não fecha a conexão do IndexedDB quando outra aba pede uma versão maior (onversionchange ausente).
import { start, stop, ctx, seedCfg, BASE } from './_util.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p = await c.newPage(); await p.goto(BASE); await p.waitForTimeout(2000);
  const r = await p.evaluate(() => new Promise(res => {
    const q = indexedDB.open('memoras', 3); let blocked = false;
    q.onblocked = () => { blocked = true; };
    q.onsuccess = () => { q.result.close(); res({ blocked, upgraded: true }); };
    q.onerror = () => res({ blocked, upgraded: false });
    setTimeout(() => res({ blocked, upgraded: false }), 3000);
  }));
  console.log(r);
  fail = r.blocked && !r.upgraded;
  console.log(fail ? 'BUG: a conexao do app segue aberta e bloqueia a subida de versao' : 'OK');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
