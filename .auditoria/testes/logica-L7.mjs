// L7: se a gravação da cópia de segurança falha, o app apaga a cópia mais antiga, lista uma chave inexistente e grava appVersion.
import { start, stop, ctx, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p0 = await c.newPage();
  await p0.goto(BASE); await p0.waitForTimeout(1500);
  // Estado de um aparelho que estava na versão 0.9.0 com 3 cópias antigas.
  await p0.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('memoras', 2);
    r.onsuccess = () => {
      const tx = r.result.transaction('kv', 'readwrite'), s = tx.objectStore('kv');
      s.put({ onboarded: true }, 'cfg'); s.put('0.9.0', 'appVersion');
      s.put(['backup:0.8.0', 'backup:0.7.0', 'backup:0.6.0'], 'backups');
      for (const v of ['0.8.0', '0.7.0', '0.6.0']) s.put({ version: v, notes: [], items: [] }, 'backup:' + v);
      tx.oncomplete = () => { r.result.close(); res(); }; tx.onerror = () => rej(tx.error);
    };
  }));
  await p0.close();
  const p = await c.newPage();
  // Falta de espaço só para as cópias: put com chave "backup:" lança erro.
  await p.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (v, k) { if (typeof k === 'string' && k.startsWith('backup:')) throw new DOMException('cheio', 'QuotaExceededError'); return put.call(this, v, k); };
  });
  await p.goto(BASE); await p.waitForTimeout(2500);
  const r = await p.evaluate(() => new Promise(res => {
    const q = indexedDB.open('memoras', 2);
    q.onsuccess = () => {
      const s = q.result.transaction('kv').objectStore('kv'), out = {};
      s.getAllKeys().onsuccess = e => { out.keys = e.target.result; s.get('backups').onsuccess = e2 => { out.backups = e2.target.result; s.get('appVersion').onsuccess = e3 => { out.appVersion = e3.target.result; res(out); }; }; };
    };
  }));
  console.log(JSON.stringify(r));
  const listadasSemExistir = (r.backups || []).filter(k => !r.keys.includes(k));
  const apagouAntiga = !r.keys.includes('backup:0.6.0');
  console.log('listadas sem existir:', listadasSemExistir, '| cópia antiga apagada:', apagouAntiga, '| appVersion:', r.appVersion);
  fail = listadasSemExistir.length > 0 || apagouAntiga;
  console.log(fail ? 'BUG L7' : 'ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
