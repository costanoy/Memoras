import { openDB } from 'idb';

const DB_NAME = 'memoras';
const DB_VERSION = 2;

const DEFAULT_SETTINGS = {
  passwordEnabled: false,
  passwordHash: null,
  passwordSalt: null,
};

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, tx) {
        if (!db.objectStoreNames.contains('entries')) {
          db.createObjectStore('entries', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }

        if (oldVersion < 1 || oldVersion >= DB_VERSION) return;

        // v1 -> v2: entries gain a status, and the single "draft" becomes a normal entry.
        const entries = tx.objectStore('entries');
        entries.openCursor().then(function addStatus(cursor) {
          if (!cursor) return undefined;
          const v = cursor.value;
          if (!v.status) {
            cursor.update({
              ...v,
              status: 'active',
              statusChangedAt: null,
              lastActiveAt: v.lastActiveAt ?? v.createdAt,
            });
          }
          return cursor.continue().then(addStatus);
        });

        if (db.objectStoreNames.contains('draft')) {
          tx.objectStore('draft')
            .get('current')
            .then((draft) => {
              if (!draft || !draft.createdAt) return;
              entries.put({
                id: `e${draft.createdAt}`,
                title: draft.title ?? '',
                createdAt: draft.createdAt,
                lastActiveAt: draft.lastActiveAt ?? draft.createdAt,
                paragraphs: draft.paragraphs ?? [{ text: '', time: null }],
                status: 'active',
                statusChangedAt: null,
              });
            });
        }
      },
    });
  }
  return dbPromise;
}

export async function getEntries() {
  const db = await getDB();
  return db.getAll('entries');
}

export async function putEntry(entry) {
  const db = await getDB();
  return db.put('entries', entry);
}

export async function deleteEntry(id) {
  const db = await getDB();
  return db.delete('entries', id);
}

export async function getSettings() {
  const db = await getDB();
  const settings = await db.get('settings', 'current');
  return settings ?? DEFAULT_SETTINGS;
}

export async function putSettings(settings) {
  const db = await getDB();
  return db.put('settings', settings, 'current');
}

const DEFAULT_PREFS = {
  diaryName: '',
};

// Mesma object store da senha, chave diferente ('prefs' em vez de 'current') —
// preferências de exibição não têm nada a ver com segurança, mas não vale a
// pena criar uma store nova só para isso.
export async function getPrefs() {
  const db = await getDB();
  const prefs = await db.get('settings', 'prefs');
  return prefs ?? DEFAULT_PREFS;
}

export async function putPrefs(prefs) {
  const db = await getDB();
  return db.put('settings', prefs, 'prefs');
}

export { DEFAULT_SETTINGS, DEFAULT_PREFS };
