import { getEntries, putEntry, deleteEntry } from './db';
import { getCloudEntries, putCloudEntry, deleteCloudEntry, uploadMissingEntries } from './cloudDb';

const MIGRATED_KEY = 'memoras:uploaded-local-entries';

function hasUploadedFor(uid) {
  try {
    const raw = localStorage.getItem(MIGRATED_KEY);
    return raw ? JSON.parse(raw).includes(uid) : false;
  } catch {
    return false;
  }
}

function markUploadedFor(uid) {
  try {
    const raw = localStorage.getItem(MIGRATED_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(uid)) {
      list.push(uid);
      localStorage.setItem(MIGRATED_KEY, JSON.stringify(list));
    }
  } catch {
    // A blocked localStorage only costs us the guard, not correctness.
  }
}

/**
 * Signed out -> local IndexedDB. Signed in -> Firestore (which keeps its own
 * offline cache, so writes still work without connection).
 */
export function makeRepository(uid) {
  if (!uid) {
    return {
      isCloud: false,
      getAll: getEntries,
      put: putEntry,
      remove: deleteEntry,
    };
  }
  return {
    isCloud: true,
    getAll: () => getCloudEntries(uid),
    put: (entry) => putCloudEntry(uid, entry),
    remove: (id) => deleteCloudEntry(uid, id),
  };
}

/** Runs once per account per device, so deleting a synced note doesn't resurrect it. */
export async function syncLocalEntriesOnce(uid) {
  if (hasUploadedFor(uid)) return null;
  const local = await getEntries();
  const result = await uploadMissingEntries(uid, local);
  markUploadedFor(uid);
  return result;
}
