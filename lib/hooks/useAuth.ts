'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '@/lib/firebase/config';
import { humanizeFirebaseError } from '@/lib/utils/firebase-errors';

const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

export interface AuthState {
  user:    User | null;
  loading: boolean;
  isAdmin: boolean;
}

export function useAuth(): AuthState & {
  loginWithEmail:  (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout:          () => Promise<void>;
  resetPassword:   (email: string) => Promise<void>;
  error:           string | null;
  clearError:      () => void;
} {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const persistProfile = useCallback(async (u: User) => {
    try {
      await setDoc(
        doc(db, 'users', u.uid),
        {
          name:      u.displayName,
          email:     u.email,
          photoURL:  u.photoURL,
          lastLogin: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      // Não bloqueia o login se persistProfile falhar
      console.warn('[useAuth] persistProfile falhou:', e);
    }
  }, []);

  // Escuta mudanças de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) await persistProfile(u);
    });
    return unsubscribe;
  }, [persistProfile]);

  // REMOVIDO: useEffect com getRedirectResult
  // Motivo: signInWithRedirect foi substituído por signInWithPopup.
  // getRedirectResult causava erros silenciosos no Vercel pois a
  // página era recarregada antes do resultado ser capturado.

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await persistProfile(result.user);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(humanizeFirebaseError(code));
      throw err;
    }
  }, [persistProfile]);

  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      // CORRIGIDO: signInWithRedirect → signInWithPopup
      // signInWithRedirect recarregava a página inteira e o Next.js
      // perdia o estado — router.replace('/dashboard') nunca executava.
      // signInWithPopup abre uma janela separada e retorna o resultado
      // diretamente, sem recarregar a página principal.
      const result = await signInWithPopup(auth, googleProvider);
      await persistProfile(result.user);
      // onAuthStateChanged é disparado automaticamente após o popup fechar,
      // mas chamamos persistProfile aqui para garantir latência mínima.
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      // auth/cancelled-popup-request e auth/popup-closed-by-user
      // são ações do usuário — não mostrar como erro
      if (
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-closed-by-user'
      ) {
        return;
      }
      const message = humanizeFirebaseError(code);
      if (message) setError(message);
      throw err;
    }
  }, [persistProfile]);

  const logout = useCallback(async () => {
    await signOut(auth);
    window.location.href = '/login';
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(humanizeFirebaseError(code));
      throw err;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    user,
    loading,
    isAdmin,
    loginWithEmail,
    loginWithGoogle,
    logout,
    resetPassword,
    error,
    clearError,
  };
}
