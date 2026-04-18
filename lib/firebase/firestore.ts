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
  orderBy,'use client';

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
  const ref = collection(db, path);
  const q   = constraints.length > 0 ? query(ref, ...constraints) : ref;

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
    (error) => { callbacks.onError?.(error); }
  );
}

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

export async function fetchDoc<T extends DocumentData>(
  path: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(doc(db, path, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

export async function fetchCollection<T extends DocumentData>(
  path: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const ref  = collection(db, path);
  const q    = constraints.length > 0 ? query(ref, ...constraints) : ref;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

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
  // ✅ Busca o post ANTES de iniciar o batch — garante dados corretos na cópia
  const postSnap = await getDoc(doc(db, `users/${uid}/posts`, postId));
  if (!postSnap.exists()) throw new Error('Post não encontrado.');

  const postData = postSnap.data();
  const batch    = writeBatch(db);

  // Atualiza o documento principal com o novo status
  batch.update(doc(db, `users/${uid}/posts`, postId), {
    status:    newStatus,
    updatedAt: serverTimestamp(),
  });

  // Remove da subcoleção antiga
  if (oldStatus) {
    const oldCollPath = statusToCollection(oldStatus);
    if (oldCollPath) {
      batch.delete(doc(db, `users/${uid}/${oldCollPath}`, postId));
    }
  }

  // Adiciona na subcoleção nova com dados atualizados
  const newCollPath = statusToCollection(newStatus);
  if (newCollPath) {
    batch.set(
      doc(db, `users/${uid}/${newCollPath}`, postId),
      { ...postData, status: newStatus, updatedAt: serverTimestamp() }
    );
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

// ─── META INTEGRATION HELPERS ───────────────────────────────────────────────

export async function initiateMetaOAuth(uid: string, accountId?: string): Promise<string> {
  const res  = await fetch('/api/meta/connect', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ uid, accountId }),
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Falha ao iniciar OAuth Meta.');
  return data.url;
}

export async function syncMetaAccount(
  uid: string,
  accountId: string
): Promise<{ cached: boolean }> {
  const res  = await fetch(`/api/meta/sync-account/${accountId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ uid }),
  });
  const data = await res.json() as { success?: boolean; cached?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Erro ao sincronizar conta Meta.');
  return { cached: data.cached ?? false };
}

export async function getMetaInsights(
  uid:       string,
  accountId: string,
  period:    '7d' | '30d' | '90d' = '30d'
): Promise<{
  totals:    { fans: number; impressions: number; engagement: number; postEngagement: number; pageViews: number };
  chartData: { name: string; impressoes: number; engajamento: number }[];
}> {
  const res  = await fetch(`/api/meta/insights/${accountId}?uid=${uid}&period=${period}`);
  const data = await res.json() as {
    totals?: Record<string, number>;
    chartData?: unknown[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar insights.');
  return {
    totals: {
      fans:           (data.totals?.fans           as number) ?? 0,
      impressions:    (data.totals?.impressions    as number) ?? 0,
      engagement:     (data.totals?.engagement     as number) ?? 0,
      postEngagement: (data.totals?.postEngagement as number) ?? 0,
      pageViews:      (data.totals?.pageViews      as number) ?? 0,
    },
    chartData: (data.chartData ?? []) as { name: string; impressoes: number; engajamento: number }[],
  };
}

export async function getMetaAdsData(
  uid:       string,
  accountId: string,
  period:    '7d' | '30d' | '90d' = '30d'
): Promise<{
  summary:   { spend: number; impressions: number; reach: number; clicks: number; cpc: number; cpm: number; ctr: number; conversions: number; roas: number };
  chartData: { name: string; CPC: number; CPM: number; Cliques: number; Investido: number }[];
  campaigns: { id: string; name: string; status: string; objective: string; platform: string }[];
}> {
  const res  = await fetch(`/api/meta/ads/${accountId}?uid=${uid}&period=${period}`);
  const data = await res.json() as {
    summary?:   Record<string, number>;
    chartData?: unknown[];
    campaigns?: unknown[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar dados de anúncios.');
  return {
    summary: {
      spend:       (data.summary?.spend       as number) ?? 0,
      impressions: (data.summary?.impressions as number) ?? 0,
      reach:       (data.summary?.reach       as number) ?? 0,
      clicks:      (data.summary?.clicks      as number) ?? 0,
      cpc:         (data.summary?.cpc         as number) ?? 0,
      cpm:         (data.summary?.cpm         as number) ?? 0,
      ctr:         (data.summary?.ctr         as number) ?? 0,
      conversions: (data.summary?.conversions as number) ?? 0,
      roas:        (data.summary?.roas        as number) ?? 0,
    },
    chartData: (data.chartData ?? []) as { name: string; CPC: number; CPM: number; Cliques: number; Investido: number }[],
    campaigns: (data.campaigns ?? []) as { id: string; name: string; status: string; objective: string; platform: string }[],
  };
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
  const ref = collection(db, path);
  const q   = constraints.length > 0 ? query(ref, ...constraints) : ref;

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
    (error) => { callbacks.onError?.(error); }
  );
}

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

export async function fetchDoc<T extends DocumentData>(
  path: string,
  id: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(doc(db, path, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as T) };
}

export async function fetchCollection<T extends DocumentData>(
  path: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const ref  = collection(db, path);
  const q    = constraints.length > 0 ? query(ref, ...constraints) : ref;
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

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
  // ✅ Busca o post ANTES de iniciar o batch — garante dados corretos na cópia
  const postSnap = await getDoc(doc(db, `users/${uid}/posts`, postId));
  if (!postSnap.exists()) throw new Error('Post não encontrado.');

  const postData = postSnap.data();
  const batch    = writeBatch(db);

  // Atualiza o documento principal com o novo status
  batch.update(doc(db, `users/${uid}/posts`, postId), {
    status:    newStatus,
    updatedAt: serverTimestamp(),
  });

  // Remove da subcoleção antiga
  if (oldStatus) {
    const oldCollPath = statusToCollection(oldStatus);
    if (oldCollPath) {
      batch.delete(doc(db, `users/${uid}/${oldCollPath}`, postId));
    }
  }

  // Adiciona na subcoleção nova com dados atualizados
  const newCollPath = statusToCollection(newStatus);
  if (newCollPath) {
    batch.set(
      doc(db, `users/${uid}/${newCollPath}`, postId),
      { ...postData, status: newStatus, updatedAt: serverTimestamp() }
    );
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

// ─── META INTEGRATION HELPERS ───────────────────────────────────────────────

export async function initiateMetaOAuth(uid: string, accountId?: string): Promise<string> {
  const res  = await fetch('/api/meta/connect', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ uid, accountId }),
  });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Falha ao iniciar OAuth Meta.');
  return data.url;
}

export async function syncMetaAccount(
  uid: string,
  accountId: string
): Promise<{ cached: boolean }> {
  const res  = await fetch(`/api/meta/sync-account/${accountId}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ uid }),
  });
  const data = await res.json() as { success?: boolean; cached?: boolean; error?: string };
  if (!res.ok) throw new Error(data.error ?? 'Erro ao sincronizar conta Meta.');
  return { cached: data.cached ?? false };
}

export async function getMetaInsights(
  uid:       string,
  accountId: string,
  period:    '7d' | '30d' | '90d' = '30d'
): Promise<{
  totals:    { fans: number; impressions: number; engagement: number; postEngagement: number; pageViews: number };
  chartData: { name: string; impressoes: number; engajamento: number }[];
}> {
  const res  = await fetch(`/api/meta/insights/${accountId}?uid=${uid}&period=${period}`);
  const data = await res.json() as {
    totals?: Record<string, number>;
    chartData?: unknown[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar insights.');
  return {
    totals: {
      fans:           (data.totals?.fans           as number) ?? 0,
      impressions:    (data.totals?.impressions    as number) ?? 0,
      engagement:     (data.totals?.engagement     as number) ?? 0,
      postEngagement: (data.totals?.postEngagement as number) ?? 0,
      pageViews:      (data.totals?.pageViews      as number) ?? 0,
    },
    chartData: (data.chartData ?? []) as { name: string; impressoes: number; engajamento: number }[],
  };
}

export async function getMetaAdsData(
  uid:       string,
  accountId: string,
  period:    '7d' | '30d' | '90d' = '30d'
): Promise<{
  summary:   { spend: number; impressions: number; reach: number; clicks: number; cpc: number; cpm: number; ctr: number; conversions: number; roas: number };
  chartData: { name: string; CPC: number; CPM: number; Cliques: number; Investido: number }[];
  campaigns: { id: string; name: string; status: string; objective: string; platform: string }[];
}> {
  const res  = await fetch(`/api/meta/ads/${accountId}?uid=${uid}&period=${period}`);
  const data = await res.json() as {
    summary?:   Record<string, number>;
    chartData?: unknown[];
    campaigns?: unknown[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar dados de anúncios.');
  return {
    summary: {
      spend:       (data.summary?.spend       as number) ?? 0,
      impressions: (data.summary?.impressions as number) ?? 0,
      reach:       (data.summary?.reach       as number) ?? 0,
      clicks:      (data.summary?.clicks      as number) ?? 0,
      cpc:         (data.summary?.cpc         as number) ?? 0,
      cpm:         (data.summary?.cpm         as number) ?? 0,
      ctr:         (data.summary?.ctr         as number) ?? 0,
      conversions: (data.summary?.conversions as number) ?? 0,
      roas:        (data.summary?.roas        as number) ?? 0,
    },
    chartData: (data.chartData ?? []) as { name: string; CPC: number; CPM: number; Cliques: number; Investido: number }[],
    campaigns: (data.campaigns ?? []) as { id: string; name: string; status: string; objective: string; platform: string }[],
  };
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
