'use client';

import { useState, useEffect, useRef } from 'react';
import {
  collection,
  query,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  FirestoreError,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { SyncStatus } from '@/lib/types';

export interface UseCollectionResult<T> {
  data:       T[];
  loading:    boolean;
  error:      FirestoreError | null;
  syncStatus: SyncStatus;
}

/**
 * Generic hook that subscribes to a Firestore collection and maintains
 * a sorted, deduplicated local state via docChanges().
 */
export function useCollection<T extends DocumentData & { id: string }>(
  path: string | null,
  constraints: QueryConstraint[] = []
): UseCollectionResult<T> {
  const [data,       setData]       = useState<T[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<FirestoreError | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');

  // Store constraints in a ref to avoid infinite re-renders
  const constraintsRef = useRef(constraints);

  useEffect(() => {
    if (!path) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const ref = collection(db, path);
    const q   = constraintsRef.current.length > 0
      ? query(ref, ...constraintsRef.current)
      : ref;

    const unsubscribe = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        setSyncStatus(snapshot.metadata.fromCache ? 'offline' : 'online');

        setData((prev) => {
          let next = [...prev];

          snapshot.docChanges().forEach((change) => {
            const item = { id: change.doc.id, ...(change.doc.data() as Omit<T, 'id'>) } as T;

            if (change.type === 'added') {
              if (!next.find((d) => d.id === item.id)) next.push(item);
            } else if (change.type === 'modified') {
              next = next.map((d) => (d.id === item.id ? item : d));
            } else if (change.type === 'removed') {
              next = next.filter((d) => d.id !== item.id);
            }
          });

          return next;
        });

        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err);
        setLoading(false);
        setSyncStatus('offline');
      }
    );

    return unsubscribe;
  }, [path]);

  return { data, loading, error, syncStatus };
}

/**
 * Convenience: subscribe to a user's sub-collection.
 */
export function useUserCollection<T extends DocumentData & { id: string }>(
  uid: string | null,
  subCollection: string,
  constraints: QueryConstraint[] = []
): UseCollectionResult<T> {
  const path = uid ? `users/${uid}/${subCollection}` : null;
  return useCollection<T>(path, constraints);
}
