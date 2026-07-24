import { openDB } from 'idb';

const DB_NAME = 'memoras';
const DB_VERSION = 1;

const DEFAULT_DRAFT = {
  title: '',
  createdAt: null,
  paragraphs: [{ text: '', time: null }],
  lastActiveAt: Date.now(),
};

const DEFAULT_SETTINGS = {
  passwordEnabled: false,
  passwordHash: null,
  passwordSalt: null,
};

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('entries', { keyPath: 'id' });
        db.createObjectStore('draft');
        db.createObjectStore('settings');
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

export async function getDraft() {
  const db = await getDB();
  const draft = await db.get('draft', 'current');
  return draft ?? DEFAULT_DRAFT;
}

export async function putDraft(draft) {
  const db = await getDB();
  return db.put('draft', draft, 'current');
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

export { DEFAULT_DRAFT, DEFAULT_SETTINGS };
