import type { Note } from './notes';

let dbp: Promise<IDBDatabase> | null = null;
function db() {
  return dbp ??= new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('memoras', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('notes', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>) {
  return db().then(d => new Promise<T>((res, rej) => {
    const tx = d.transaction(store, mode), rq = fn(tx.objectStore(store));
    tx.oncomplete = () => res(rq.result);
    tx.onerror = tx.onabort = () => rej(tx.error);
  }));
}
const quiet = (p: Promise<unknown>) => p.then(() => {}, e => console.error('Memoras: falha ao gravar', e));

export const kvGet = <T>(k: string) => run<T | undefined>('kv', 'readonly', s => s.get(k)).catch(() => undefined);
export const kvSet = (k: string, v: unknown) => quiet(run('kv', 'readwrite', s => s.put(v, k)));
export const notesAll = () => run<Note[]>('notes', 'readonly', s => s.getAll()).catch(() => [] as Note[]);
export const notePut = (n: Note) => quiet(run('notes', 'readwrite', s => s.put(n)));
export const noteDel = (id: string) => quiet(run('notes', 'readwrite', s => s.delete(id)));
export const wipeAll = () => Promise.all([quiet(run('kv', 'readwrite', s => s.clear())), quiet(run('notes', 'readwrite', s => s.clear()))]);
