'use client';

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  QueryConstraint,
  DocumentData,
  Unsubscribe,
  FirestoreError,
  arrayUnion,
  arrayRemove,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import type { AppPreferences, Post, Campaign, ConnectedAccount, Approval } from '@/lib/types';

// ─── GENERIC HELPERS ────────────────────────────────────────────────────────

/**
 * Subscribe to a collection with change-based callbacks.
 * Returns an unsubscribe function.
 */
export function listenCollection<T extends DocumentData>(
  path: string,
  callbacks: {
    onAdd?:    (doc: T & { id: string }) => void;
    onUpdate?: (doc: T & { id: string }) => void;
    onRemove?: (id: string) => void;
    onSync?:   (fromCache: boolean) => void;
    onError?:  (err: FirestoreError) => void;
  },
  constraints: QueryConstraint[] = []
): Unsubscribe {
  const ref   = collection(db, path);
  const q     = constraints.length > 0 ? query(ref, ...constraints) : ref;

  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snapshot) => {
      callbacks.onSync?.(snapshot.metadata.fromCache);

      snapshot.docChanges().forEach((change) => {
        const data = { id: change.doc.id, ...change.doc.data() } as T & { id: string };
        if (change.type === 'added')    callbacks.onAdd?.(data);
        if (change.type === 'modified') callbacks.onUpdate?.(data);
        if (change.type === 'removed')  callbacks.onRemove?.(change.doc.id);
      });
    },
    (error) => {
      callbacks.onError?.(error);
    }
  );
}

/**
 * Subscribe to a single document.
 */
export function listenDoc<T extends DocumentData>(
  path: string,
  id: string,
  callback: (data: (T & { id: string }) | null) => void,
  onError?: (err: FirestoreError) => void
): Unsubscribe {
  const ref = doc(db, path, id);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) { callback(null); return; }
      callback({ id: snap.id, ...(snap.data() as T) });
    },
    (error) => { onError?.(error); }
  );
}

/**
 * Fetch a single document (one-time).
 */
export async function fetchDoc<T extends DocumentData>(
  path: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(doc(db, path, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

/**
 * Fetch all documents in a collection (one-time).
 */
export async function fetchCollection<T extends DocumentData>(
  path: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const ref   = collection(db, path);
  const q     = constraints.length > 0 ? query(ref, ...constraints) : ref;
  const snap  = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

/**
 * Set / merge a document.
 */
export async function saveDoc(
  path: string,
  id: string,
  data: DocumentData,
  merge = true
): Promise<void> {
  await setDoc(
    doc(db, path, id),
    { ...data, updatedAt: serverTimestamp() },
    { merge }
  );
}

/**
 * Update specific fields of a document.
 */
export async function updateFields(
  path: string,
  id: string,
  data: DocumentData
): Promise<void> {
  await updateDoc(doc(db, path, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a document.
 */
export async function removeDoc(path: string, id: string): Promise<void> {
  await deleteDoc(doc(db, path, id));
}

// ─── POSTS ──────────────────────────────────────────────────────────────────

export function listenPosts(
  uid: string,
  callbacks: Parameters<typeof listenCollection<Post>>[1],
  status?: string
): Unsubscribe {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (status) constraints.unshift(where('status', '==', status));
  return listenCollection<Post>(`users/${uid}/posts`, callbacks, constraints);
}

export async function movePostToStatus(
  uid: string,
  postId: string,
  newStatus: Post['status'],
  oldStatus?: Post['status']
): Promise<void> {
  const batch = writeBatch(db);

  // Update main post doc
  batch.update(doc(db, `users/${uid}/posts/${postId}`), {
    status:    newStatus,
    updatedAt: serverTimestamp(),
  });

  // Remove from old subcollection
  if (oldStatus) {
    const oldCollPath = statusToCollection(oldStatus);
    if (oldCollPath) batch.delete(doc(db, `users/${uid}/${oldCollPath}/${postId}`));
  }

  // Add to new subcollection
  const newCollPath = statusToCollection(newStatus);
  if (newCollPath) {
    const postSnap = await getDoc(doc(db, `users/${uid}/posts/${postId}`));
    if (postSnap.exists()) {
      batch.set(
        doc(db, `users/${uid}/${newCollPath}/${postId}`),
        { ...postSnap.data(), status: newStatus, updatedAt: serverTimestamp() }
      );
    }
  }

  await batch.commit();
}

function statusToCollection(status: Post['status']): string | null {
  const map: Partial<Record<Post['status'], string>> = {
    em_analise: 'emAnalise',
    aprovado:   'aprovados',
    rejeitado:  'rejeitados',
    revisao:    'revisao',
  };
  return map[status] ?? null;
}

// ─── CONNECTED ACCOUNTS ─────────────────────────────────────────────────────

export function listenAccounts(
  uid: string,
  callbacks: Parameters<typeof listenCollection<ConnectedAccount>>[1]
): Unsubscribe {
  return listenCollection<ConnectedAccount>(
    `users/${uid}/connectedAccounts`,
    callbacks,
    [orderBy('connectedAt', 'desc')]
  );
}

// ─── CAMPAIGNS ──────────────────────────────────────────────────────────────

export function listenCampaigns(
  uid: string,
  callbacks: Parameters<typeof listenCollection<Campaign>>[1]
): Unsubscribe {
  return listenCollection<Campaign>(
    `users/${uid}/campanhas`,
    callbacks,
    [orderBy('createdAt', 'desc')]
  );
}

// ─── APPROVALS ──────────────────────────────────────────────────────────────

export async function fetchApproval(token: string): Promise<(Approval & { id: string }) | null> {
  return fetchDoc<Approval>('approvals', token);
}

export async function respondApproval(
  token: string,
  status: 'aprovado' | 'rejeitado' | 'correcao',
  comentario: string
): Promise<void> {
  await updateDoc(doc(db, 'approvals', token), {
    status,
    comentario,
    respondidoEm: serverTimestamp(),
  });
}

// ─── PREFERENCES ────────────────────────────────────────────────────────────

export async function savePreference(
  uid: string,
  key: string,
  value: unknown
): Promise<void> {
  await setDoc(
    doc(db, `users/${uid}/preferences/app`),
    { [key]: value, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function loadPreferences(uid: string): Promise<Partial<AppPreferences>> {
  const snap = await getDoc(doc(db, `users/${uid}/preferences/app`));
  return snap.exists() ? (snap.data() as Partial<AppPreferences>) : {};
}

// ─── BADGE COUNTS ───────────────────────────────────────────────────────────

export function listenBadgeCount(
  path: string,
  onChange: (count: number) => void
): Unsubscribe {
  return onSnapshot(collection(db, path), (snap) => {
    onChange(snap.size);
  });
}

// Re-exports for convenience
export {
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  increment,
  where,
  orderBy,
  limit,
};
