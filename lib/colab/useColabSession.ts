'use client';
import { useState, useEffect } from 'react';
import { ColabSession } from './types';

const SESSION_KEY = 'colab_session';

export function useColabSession() {
  const [session, setSession] = useState<ColabSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {}
    setLoading(false);
  }, []);

  function saveSession(data: ColabSession) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    setSession(data);
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  }

  function isExpired(): boolean {
    if (!session) return true;
    return !session.isActive;
  }

  return { session, loading, saveSession, clearSession, isExpired };
}
