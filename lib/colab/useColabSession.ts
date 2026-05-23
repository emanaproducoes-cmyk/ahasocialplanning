'use client';
import { useState, useEffect } from 'react';
import type { ColabSession } from './types';

const SESSION_KEY = 'aha_colab_session';

export function useColabSession(): { session: ColabSession | null; loading: boolean } {
  const [session, setSession] = useState<ColabSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ColabSession;
        if (parsed?.adminUid && parsed?.clientName) {
          setSession(parsed);
        }
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  return { session, loading };
}

export function saveColabSession(s: ColabSession) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch {}
}

export function clearColabSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}
