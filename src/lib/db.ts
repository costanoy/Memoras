import type { Note } from './notes';

// As anotações moram aqui, no banco "memoras" do aparelho. Para não perdê-las numa atualização:
// - nunca troque o nome do banco nem apague stores;
// - para mudar a estrutura, suba DB_VERSION e acrescente um passo em onupgradeneeded que só
//   cria coisas novas ou converte dados, sem nunca apagar o que existe.
const DB_VERSION = 1;
let dbp: Promise<IDBDatabase> | null = null;
function db() {
  return dbp ??= new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open('memoras', DB_VERSION);
    r.onupgradeneeded = e => {
      if (e.oldVersion < 1) { r.result.createObjectStore('kv'); r.result.createObjectStore('notes', { keyPath: 'id' }); }
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => { dbp = null; rej(r.error); };
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

// Leitura que falha de verdade em vez de fingir que o banco está vazio (usada ao abrir o app).
export const kvRead = <T>(k: string) => run<T | undefined>('kv', 'readonly', s => s.get(k));
export const notesRead = () => run<Note[]>('notes', 'readonly', s => s.getAll());
export const kvSet = (k: string, v: unknown) => quiet(run('kv', 'readwrite', s => s.put(v, k)));
export const notePut = (n: Note) => quiet(run('notes', 'readwrite', s => s.put(n)));
export const kvDel = (k: string) => quiet(run('kv', 'readwrite', s => s.delete(k)));
export const noteDel = (id: string) => quiet(run('notes', 'readwrite', s => s.delete(id)));
export const wipeAll = () => Promise.all([quiet(run('kv', 'readwrite', s => s.clear())), quiet(run('notes', 'readwrite', s => s.clear()))]);
