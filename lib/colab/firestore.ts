// lib/colab/firestore.ts
// Firebase helpers exclusivos do AHA Social Colab
// Mantém os dados separados da coleção principal do Social Planning

import {
  getFirestore, doc, getDoc, setDoc, addDoc, updateDoc,
  collection, query, where, getDocs, deleteDoc,
  serverTimestamp, Timestamp, orderBy, limit,
} from 'firebase/firestore';
import { app } from '@/lib/firebase/config'; // ajuste o caminho para seu firebase/config

const db = getFirestore(app);

/* ───────────────────────────────────────────────────────────────────
   INVITES
─────────────────────────────────────────────────────────────────── */

/** Cria um convite e salva no Firestore */
export async function createColabInvite(params: {
  adminUid:    string;
  adminEmail:  string;
  agencyName:  string;
  clientEmail: string;
  clientName:  string;
}): Promise<{ inviteId: string; token: string; url: string }> {
  const token     = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const ref = await addDoc(collection(db, 'colab_invites'), {
    ...params,
    token,
    status:    'pending',
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/colab/invite/${token}`;
  return { inviteId: ref.id, token, url };
}

/** Busca convite pelo token (usado na página pública de aceite) */
export async function getInviteByToken(token: string) {
  const q = query(
    collection(db, 'colab_invites'),
    where('token', '==', token),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as import('./types').ColabInvite;
}

/** Aceita convite — muda status e salva sessão */
export async function acceptColabInvite(inviteId: string, clientEmail: string) {
  await updateDoc(doc(db, 'colab_invites', inviteId), {
    status:     'accepted',
    acceptedAt: new Date().toISOString(),
    clientEmail,
  });
}

/** Lista todos convites de um admin */
export async function listAdminInvites(adminUid: string) {
  const q = query(
    collection(db, 'colab_invites'),
    where('adminUid', '==', adminUid),
    orderBy('createdAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as import('./types').ColabInvite[];
}

/** Revoga/exclui convite */
export async function revokeColabInvite(inviteId: string) {
  await deleteDoc(doc(db, 'colab_invites', inviteId));
}

/* ───────────────────────────────────────────────────────────────────
   PLANNING ENTRIES
─────────────────────────────────────────────────────────────────── */

/** Salva ou atualiza uma entrada de planejamento */
export async function savePlanningEntry(entry: Omit<import('./types').PlanningEntry, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const now = new Date().toISOString();
  if (entry.id) {
    await updateDoc(doc(db, 'colab_planning', entry.id), { ...entry, updatedAt: now });
    return entry.id;
  }
  const ref = await addDoc(collection(db, 'colab_planning'), {
    ...entry,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

/** Lista planejamentos de um admin */
export async function listPlanningEntries(adminUid: string) {
  const q = query(
    collection(db, 'colab_planning'),
    where('adminUid', '==', adminUid),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as import('./types').PlanningEntry[];
}

/** Deleta uma entrada */
export async function deletePlanningEntry(id: string) {
  await deleteDoc(doc(db, 'colab_planning', id));
}

/* ───────────────────────────────────────────────────────────────────
   RATINGS
─────────────────────────────────────────────────────────────────── */

/** Salva avaliação do cliente */
export async function saveColabRating(rating: Omit<import('./types').ColabRating, 'id'>) {
  // Upsert: um rating por client+month
  const q = query(
    collection(db, 'colab_ratings'),
    where('adminUid',    '==', rating.adminUid),
    where('clientEmail', '==', rating.clientEmail),
    where('month',       '==', rating.month),
    limit(1),
  );
  const snap = await getDocs(q);
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { ...rating });
    return snap.docs[0].id;
  }
  const ref = await addDoc(collection(db, 'colab_ratings'), rating);
  return ref.id;
}

/** Busca avaliação existente */
export async function getColabRating(adminUid: string, clientEmail: string, month: string) {
  const q = query(
    collection(db, 'colab_ratings'),
    where('adminUid',    '==', adminUid),
    where('clientEmail', '==', clientEmail),
    where('month',       '==', month),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as import('./types').ColabRating;
}

/** Lista todas as avaliações de um admin */
export async function listAdminRatings(adminUid: string) {
  const q = query(
    collection(db, 'colab_ratings'),
    where('adminUid', '==', adminUid),
    orderBy('month', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as import('./types').ColabRating[];
}

/* ───────────────────────────────────────────────────────────────────
   POST COMMENTS
─────────────────────────────────────────────────────────────────── */

export async function addPostComment(comment: Omit<import('./types').PostComment, 'id'>) {
  const ref = await addDoc(collection(db, 'colab_post_comments'), comment);
  return ref.id;
}

export async function getPostComments(adminUid: string, postId: string) {
  const q = query(
    collection(db, 'colab_post_comments'),
    where('adminUid', '==', adminUid),
    where('postId',   '==', postId),
    orderBy('createdAt', 'asc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as import('./types').PostComment[];
}
