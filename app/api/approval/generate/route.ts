import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb }        from '@/lib/firebase/admin';
import { FieldValue, Timestamp }     from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    // Verify auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const idToken = authHeader.slice(7);
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid     = decoded.uid;

    const body = await req.json() as {
      postId:     string;
      creatives:  unknown[];
      caption:    string;
      platforms:  string[];
      responsavel:{ nome: string; avatar: string; uid: string };
    };

    const { postId, creatives, caption, platforms, responsavel } = body;

    if (!postId) {
      return NextResponse.json({ error: 'postId é obrigatório.' }, { status: 400 });
    }

    const token     = crypto.randomUUID();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    );

    // Create approval document
    await adminDb.doc(`approvals/${token}`).set({
      agendamentoId: postId,
      uid,
      creatives:     creatives ?? [],
      caption:       caption   ?? '',
      platforms:     platforms ?? [],
      status:        'pending',
      responsavel,
      createdAt:     FieldValue.serverTimestamp(),
      expiresAt,
    });

    // Update post status
    await adminDb.doc(`users/${uid}/posts/${postId}`).update({
      approvalToken: token,
      status:        'em_analise',
      updatedAt:     FieldValue.serverTimestamp(),
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get('origin') ?? '';
    const url     = `${baseUrl}/aprovacao?token=${token}`;

    return NextResponse.json({ token, url }, { status: 201 });
  } catch (err) {
    console.error('[API/approval/generate]', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
