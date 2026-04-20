'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
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
  loginWithEmail:    (email: string, password: string) => Promise<void>;
  loginWithGoogle:   () => Promise<void>;
  registerWithEmail: (name: string, email: string, password: string) => Promise<void>;
  logout:            () => Promise<void>;
  resetPassword:     (email: string) => Promise<void>;
  error:             string | null;
  clearError:        () => void;
} {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Persiste o perfil do usuário no Firestore com isolamento por UID
  const persistProfile = useCallback(async (u: User, extraData?: { name?: string }) => {
    try {
      await setDoc(
        doc(db, 'users', u.uid),
        {
          name:      extraData?.name ?? u.displayName ?? '',
          email:     u.email,
          photoURL:  u.photoURL ?? '',
          role:      u.email === ADMIN_EMAIL ? 'admin' : 'member',
          lastLogin: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
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

  // Login com e-mail e senha
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

  // NOVO: Cadastro com nome, e-mail e senha
  const registerWithEmail = useCallback(async (
    name: string,
    email: string,
    password: string
  ) => {
    setError(null);
    try {
      // 1. Cria o usuário no Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);

      // 2. Atualiza o displayName no perfil Firebase Auth
      await updateProfile(result.user, { displayName: name });

      // 3. Cria o documento isolado no Firestore: users/{uid}
      await setDoc(doc(db, 'users', result.user.uid), {
        name,
        email,
        photoURL:  '',
        role:      email === ADMIN_EMAIL ? 'admin' : 'member',
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 4. Envia e-mail de verificação (não bloqueia o fluxo de login)
      sendEmailVerification(result.user).catch(() => {
        console.warn('[useAuth] sendEmailVerification falhou (não crítico)');
      });

    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(humanizeFirebaseError(code));
      throw err;
    }
  }, []);

  // Login com Google
  const loginWithGoogle = useCallback(async () => {
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await persistProfile(result.user);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
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

  // Logout
  const logout = useCallback(async () => {
    await signOut(auth);
    window.location.href = '/login';
  }, []);

  // Reset de senha
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
    registerWithEmail,
    logout,
    resetPassword,
    error,
    clearError,
  };
}
