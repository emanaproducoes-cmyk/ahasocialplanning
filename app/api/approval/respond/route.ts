import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb }                from '@/lib/firebase/admin';
import { FieldValue, Timestamp }     from 'firebase-admin/firestore';

const VALID_STATUSES = ['aprovado', 'rejeitado', 'correcao'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      token:       string;
      status:      string;
      comentario?: string;
    };

    const { token, status, comentario } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token é obrigatório.' }, { status: 400 });
    }

    if (!VALID_STATUSES.includes(status as ValidStatus)) {
      return NextResponse.json({ error: 'Status inválido.' }, { status: 400 });
    }

    const adminDb     = getAdminDb();
    const approvalRef = adminDb.doc(`approvals/${token}`);
    const approvalSnap = await approvalRef.get();

    if (!approvalSnap.exists) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 });
    }

    const data = approvalSnap.data()!;

    if (data['expiresAt'] && (data['expiresAt'] as Timestamp).toDate() < new Date()) {
      return NextResponse.json({ error: 'Link expirado.' }, { status: 410 });
    }

    if (data['status'] !== 'pending') {
      return NextResponse.json({ error: 'Este link já foi respondido.' }, { status: 409 });
    }

    await approvalRef.update({
      status,
      comentario:   comentario ?? '',
      respondidoEm: FieldValue.serverTimestamp(),
    });

    const { uid, agendamentoId } = data as { uid: string; agendamentoId: string };

    await adminDb.doc(`users/${uid}/posts/${agendamentoId}`).update({
      status:    status === 'correcao' ? 'revisao' : status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (status === 'aprovado' || status === 'rejeitado') {
      const postSnap = await adminDb.doc(`users/${uid}/posts/${agendamentoId}`).get();
      if (postSnap.exists) {
        const colName = status === 'aprovado' ? 'aprovados' : 'rejeitados';
        await adminDb
          .doc(`users/${uid}/${colName}/${agendamentoId}`)
          .set({ ...postSnap.data(), status, updatedAt: FieldValue.serverTimestamp() });
      }
    }

    return NextResponse.json({ ok: true, status }, { status: 200 });
  } catch (err) {
    console.error('[API/approval/respond]', err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}
