import { useState, useEffect, useCallback } from 'react';
import { getFirebase, isFirebaseConfigured } from '../firebase';

const MESSAGES = {
  'auth/invalid-email': 'E-mail inválido.',
  'auth/missing-password': 'Digite sua senha.',
  'auth/weak-password': 'A senha precisa ter pelo menos 6 caracteres.',
  'auth/email-already-in-use': 'Já existe uma conta com esse e-mail.',
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'Não encontramos uma conta com esse e-mail.',
  'auth/too-many-requests': 'Muitas tentativas. Tente de novo em alguns minutos.',
  'auth/network-request-failed': 'Sem conexão. Verifique sua internet.',
};

function toMessage(error) {
  return MESSAGES[error?.code] ?? 'Não foi possível concluir. Tente novamente.';
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;
    let unsubscribe = null;
    let cancelled = false;

    getFirebase().then(({ auth, authMod }) => {
      if (cancelled) return;
      unsubscribe = authMod.onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const run = useCallback(async (action) => {
    try {
      const fb = await getFirebase();
      await action(fb);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: toMessage(error) };
    }
  }, []);

  const signUp = useCallback(
    (email, password) =>
      run(({ auth, authMod }) =>
        authMod.createUserWithEmailAndPassword(auth, email.trim(), password)
      ),
    [run]
  );

  const signIn = useCallback(
    (email, password) =>
      run(({ auth, authMod }) =>
        authMod.signInWithEmailAndPassword(auth, email.trim(), password)
      ),
    [run]
  );

  const resetPassword = useCallback(
    (email) => run(({ auth, authMod }) => authMod.sendPasswordResetEmail(auth, email.trim())),
    [run]
  );

  const signOut = useCallback(
    () => run(({ auth, authMod }) => authMod.signOut(auth)),
    [run]
  );

  return {
    available: isFirebaseConfigured,
    loading,
    user,
    signUp,
    signIn,
    resetPassword,
    signOut,
  };
}
