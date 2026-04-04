import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb }        from '@/lib/firebase/admin';
import { FieldValue }                from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid     = decoded.uid;

    // Sync: count posts per status and update user stats document
    const postsSnap = await adminDb.collection(`users/${uid}/posts`).get();

    const counts: Record<string, number> = {};
    postsSnap.docs.forEach((doc) => {
      const status = (doc.data()['status'] as string) ?? 'rascunho';
      counts[status] = (counts[status] ?? 0) + 1;
    });

    await adminDb.doc(`users/${uid}/stats/posts`).set({
      ...counts,
      total:     postsSnap.size,
      syncedAt:  FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, counts, total: postsSnap.size });
  } catch (err) {
    console.error('[API/sync]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
