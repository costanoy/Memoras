import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it, vi } from 'vitest';

// Banco da versão 1 (antes de Cadernos e Agenda), com uma anotação e um cfg.
function criaBancoV1() {
  return new Promise<void>((res, rej) => {
    const r = indexedDB.open('memoras', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('notes', { keyPath: 'id' }); };
    r.onsuccess = () => {
      const tx = r.result.transaction(['kv', 'notes'], 'readwrite');
      tx.objectStore('kv').put({ onboarded: true, theme: 'roxo' }, 'cfg');
      tx.objectStore('notes').put({ id: 'n1', title: 'Antiga', segs: [] });
      tx.oncomplete = () => { r.result.close(); res(); };
      tx.onerror = () => rej(tx.error);
    };
    r.onerror = () => rej(r.error);
  });
}

describe('db: migração da versão 1 para a atual', () => {
  beforeAll(async () => { await criaBancoV1(); vi.resetModules(); });

  it('mantém anotação e cfg e cria a store de itens vazia', async () => {
    const db = await import('../src/lib/db');
    expect((await db.notesRead()).map(n => n.id)).toEqual(['n1']);
    expect(await db.kvRead<{ theme: string }>('cfg')).toEqual({ onboarded: true, theme: 'roxo' });
    expect(await db.itemsRead()).toEqual([]);
  });
});
