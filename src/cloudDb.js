import { getFirebase } from './firebase';

async function entriesRef(uid) {
  const { firestore, storeMod } = await getFirebase();
  return { ref: storeMod.collection(firestore, 'users', uid, 'entries'), storeMod };
}

export async function getCloudEntries(uid) {
  const { ref, storeMod } = await entriesRef(uid);
  const snap = await storeMod.getDocs(ref);
  return snap.docs.map((d) => d.data());
}

export async function putCloudEntry(uid, entry) {
  const { ref, storeMod } = await entriesRef(uid);
  return storeMod.setDoc(storeMod.doc(ref, entry.id), entry);
}

export async function deleteCloudEntry(uid, id) {
  const { ref, storeMod } = await entriesRef(uid);
  return storeMod.deleteDoc(storeMod.doc(ref, id));
}

/**
 * First sign-in on a device: push local-only notes up so nothing written
 * before creating the account is lost. Never overwrites a cloud copy.
 */
export async function uploadMissingEntries(uid, localEntries) {
  const cloud = await getCloudEntries(uid);
  const cloudIds = new Set(cloud.map((e) => e.id));
  const missing = localEntries.filter((e) => !cloudIds.has(e.id));
  await Promise.all(missing.map((e) => putCloudEntry(uid, e)));
  return { uploaded: missing.length, total: cloud.length + missing.length };
}
