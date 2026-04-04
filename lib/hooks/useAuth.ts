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
  user:        User | null;
  loading:     boolean;
  isAdmin:     boolean;
}

export function useAuth(): AuthState & {
  loginWithEmail:    (email: string, password: string) => Promise<void>;
  loginWithGoogle:   () => Promise<void>;
  logout:            () => Promise<void>;
  resetPassword:     (email: string) => Promise<void>;
  error:             string | null;
  clearError:        () => void;
} {
  const [user,    setUser]    = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  // Persist user profile to Firestore on every login
  const persistProfile = useCallback(async (u: User) => {
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
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) await persistProfile(u);
    });
    return unsubscribe;
  }, [persistProfile]);

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
      const result = await signInWithPopup(auth, googleProvider);
      await persistProfile(result.user);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(humanizeFirebaseError(code));
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
