import { db } from '@/lib/firebase/config';
import {
  collection, doc, getDocs, setDoc, updateDoc,
  query, where, orderBy, addDoc, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { ColabInvite, ColabPost, ColabPlanning, ColabRating } from './types';

export async function createColabInvite(data: Omit<ColabInvite, 'id' | 'createdAt' | 'expiresAt' | 'status'>) {
  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  const ref = await addDoc(collection(db, 'colab_invites'), {
    ...data, token, status: 'pending',
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(expiresAt),
  });
  return { id: ref.id, token };
}

export async function getInviteByToken(token: string): Promise<ColabInvite | null> {
  const q = query(collection(db, 'colab_invites'), where('token', '==', token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as ColabInvite;
}

export async function acceptInvite(token: string) {
  const q = query(collection(db, 'colab_invites'), where('token', '==', token));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  await updateDoc(snap.docs[0].ref, {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
  });
  return true;
}

export async function getColabPosts(adminUid: string): Promise<ColabPost[]> {
  const q = query(
    collection(db, `users/${adminUid}/posts`),
    orderBy('scheduledAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    const scheduledAt = data.scheduledAt?.toDate?.() ?? new Date(data.scheduledAt);
    const date = scheduledAt.toISOString().slice(0, 10);
    return {
      id: d.id,
      adminUid: data.userId,
      date,
      title: data.title ?? 'Sem título',
      caption: data.caption,
      contentType: data.format ?? 'feed',
      network: data.platforms?.[0] ?? 'instagram',
      status: data.status ?? 'planejado',
      theme: data.tags?.[0],
      mediaUrl: data.mediaUrl ?? data.videoUrl ?? data.imageUrl ?? data.fileUrl ?? undefined,
      mediaType: data.fileType === 'video' ? 'video' : data.fileType === 'image' ? 'image' : undefined,
      createdAt: data.createdAt?.toDate?.() ?? new Date(),
      updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
    } as ColabPost;
  });
}

export async function saveColabPlanning(data: Omit<ColabPlanning, 'id' | 'updatedAt'>) {
  const id = `${data.adminUid}_${data.period}_${data.startDate}`;
  await setDoc(doc(db, 'colab_planning', id), {
    ...data, updatedAt: serverTimestamp(),
  }, { merge: true });
  return id;
}

export async function getColabPlanning(adminUid: string): Promise<ColabPlanning[]> {
  const q = query(
    collection(db, 'colab_planning'),
    where('adminUid', '==', adminUid),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ColabPlanning));
}

export async function saveColabRating(data: Omit<ColabRating, 'id' | 'createdAt'>) {
  const ref = await addDoc(collection(db, 'colab_ratings'), {
    ...data, createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getColabRatings(adminUid: string): Promise<ColabRating[]> {
  const q = query(
    collection(db, 'colab_ratings'),
    where('adminUid', '==', adminUid),
    orderBy('month', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ColabRating));
}
