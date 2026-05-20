'use client';
// lib/colab/useColabSession.ts
// Gerencia a sessão do cliente no Colab (sem Firebase Auth para o convidado)
// A sessão é armazenada no localStorage e validada contra o Firestore

import { useState, useEffect } from 'react';
import { getInviteByToken }    from './firestore';
import type { ColabSession }   from './types';

const SESSION_KEY = 'aha_colab_session';

export function useColabSession() {
  const [session,  setSession]  = useState<ColabSession | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch (_e) { /* ignore */ }
    setLoading(false);
  }, []);

  const saveSession = (s: ColabSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    setSession(s);
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  return { session, loading, saveSession, clearSession };
}

/** Verifica se o token do convite ainda é válido */
export async function validateInviteToken(token: string) {
  const invite = await getInviteByToken(token);
  if (!invite)                             return { valid: false, reason: 'not_found'  as const };
  if (invite.status === 'expired')         return { valid: false, reason: 'expired'    as const };
  if (new Date(invite.expiresAt) < new Date()) return { valid: false, reason: 'expired' as const };
  return { valid: true, invite };
}
