// L14 (limpeza): anotação e caderno vazios já enviados não podem virar lápide ao trocar de tela; o vazio nunca enviado some.
import { start, stop, ctx, BASE } from './_util-logica.mjs';
const b = await start();
let fail = false;
try {
  const c = await ctx(b);
  const p = await c.newPage();
  await p.goto(BASE); await p.waitForTimeout(1500);
  await p.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('memoras', 2);
    r.onupgradeneeded = e => { if (e.oldVersion < 1) { r.result.createObjectStore('kv'); r.result.createObjectStore('notes', { keyPath: 'id' }); } if (e.oldVersion < 2) r.result.createObjectStore('items', { keyPath: 'id' }); };
    r.onsuccess = () => {
      const note = (id, pushed) => ({ id, created: Date.now() - 1000, title: '', titleTs: 0, status: 'active', statusTs: 0, color: '', colorTs: 0, last: 0, segs: [], deleted: false, rev: 1, syncedRev: pushed ? 1 : -1, pushed });
      const doc = (id, pushed) => ({ id, kind: 'doc', created: Date.now() - 1000, deleted: false, title: '', titleTs: 0, body: '', bodyTs: 0, status: 'active', statusTs: 0, color: '', colorTs: 0, pinned: false, pinnedTs: 0, base: null, rev: 1, syncedRev: pushed ? 1 : -1, pushed });
      const tx = r.result.transaction(['kv', 'notes', 'items'], 'readwrite');
      tx.objectStore('kv').put({ onboarded: true }, 'cfg');
      tx.objectStore('notes').put(note('n-enviada', true));
      tx.objectStore('notes').put(note('n-nova', false));
      tx.objectStore('items').put(doc('d-enviado', true));
      tx.objectStore('items').put(doc('d-novo', false));
      tx.oncomplete = () => { r.result.close(); res(); };
      tx.onerror = () => rej(tx.error);
    };
    r.onerror = () => rej(r.error);
  }));
  await p.reload(); await p.waitForTimeout(1500);
  const r = await p.evaluate(async () => {
    const m = await import('/src/store.ts');
    await m.init(); // o módulo importado aqui é outra instância: carrega o banco nela
    m.go('docs'); m.go('history'); m.go('docs'); m.go('history');
    await new Promise(r => setTimeout(r, 400));
    const s = m.get();
    return {
      nota: s.notes.find(n => n.id === 'n-enviada') ?? null,
      doc: s.items.find(i => i.id === 'd-enviado') ?? null,
      notaNova: s.notes.some(n => n.id === 'n-nova'),
      docNovo: s.items.some(i => i.id === 'd-novo'),
    };
  });
  console.log(JSON.stringify({ nota: r.nota && { deleted: r.nota.deleted }, doc: r.doc && { deleted: r.doc.deleted }, notaNova: r.notaNova, docNovo: r.docNovo }));
  if (!r.nota || r.nota.deleted) { console.log('BUG L14: anotação vazia já enviada virou lápide'); fail = true; }
  if (!r.doc || r.doc.deleted) { console.log('BUG L14: caderno vazio já enviado virou lápide'); fail = true; }
  if (r.notaNova || r.docNovo) { console.log('BUG L14: vazio nunca enviado deveria sumir'); fail = true; }
  if (!fail) console.log('ok');
} catch (e) { console.error('Erro no teste', e); fail = true; }
await stop(b);
process.exit(fail ? 1 : 0);
