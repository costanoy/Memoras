const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Without credentials the app still runs, just fully offline/local.
export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

let pending = null;

/**
 * Loaded on demand so the ~600 kB Firebase SDK never reaches people who are
 * only using the app locally.
 */
export function getFirebase() {
  if (!isFirebaseConfigured) return Promise.resolve(null);
  if (!pending) {
    pending = (async () => {
      const [{ initializeApp }, authMod, storeMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
        import('firebase/firestore'),
      ]);
      const app = initializeApp(config);
      const auth = authMod.getAuth(app);
      // Persistent cache keeps writes working offline and syncs them when back online.
      const firestore = storeMod.initializeFirestore(app, {
        localCache: storeMod.persistentLocalCache({
          tabManager: storeMod.persistentMultipleTabManager(),
        }),
      });
      return { app, auth, firestore, authMod, storeMod };
    })();
  }
  return pending;
}
