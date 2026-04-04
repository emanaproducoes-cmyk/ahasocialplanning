'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export interface BadgeCounts {
  emAnalise:      number;
  aprovados:      number;
  rejeitados:     number;
  revisao:        number;
  connectedAccounts: number;
}

const INITIAL_COUNTS: BadgeCounts = {
  emAnalise:         0,
  aprovados:         0,
  rejeitados:        0,
  revisao:           0,
  connectedAccounts: 0,
};

const SUBCOLLECTIONS: (keyof BadgeCounts)[] = [
  'emAnalise',
  'aprovados',
  'rejeitados',
  'revisao',
  'connectedAccounts',
];

/**
 * Subscribes to all badge-count collections simultaneously.
 * Returns live counts that drive the sidebar and topbar badges.
 */
export function useBadges(uid: string | null): BadgeCounts {
  const [counts, setCounts] = useState<BadgeCounts>(INITIAL_COUNTS);

  useEffect(() => {
    if (!uid) {
      setCounts(INITIAL_COUNTS);
      return;
    }

    const unsubscribes = SUBCOLLECTIONS.map((key) =>
      onSnapshot(
        collection(db, `users/${uid}/${key}`),
        (snap) => {
          setCounts((prev) => ({ ...prev, [key]: snap.size }));
        },
        () => {
          // Ignore per-collection errors for badges
        }
      )
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [uid]);

  return counts;
}
