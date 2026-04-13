import { NextRequest, NextResponse }     from 'next/server';
import { getAdminAuth, getAdminStorage } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/quicktime',
];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
    const idToken = authHeader.slice(7);
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const uid     = decoded.uid;

    const body = await req.json() as {
      fileName: string;
      fileType: string;
      postId:   string;
    };
    const { fileName, fileType, postId } = body;

    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { error: `Tipo não suportado: ${fileType}. Use PNG, JPG, GIF, WEBP ou MP4.` },
        { status: 415 }
      );
    }

    const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path      = `users/${uid}/creatives/${postId}/${Date.now()}_${sanitized}`;
    const bucket    = getAdminStorage().bucket();
    const fileRef   = bucket.file(path);

    const [signedUrl] = await fileRef.getSignedUrl({
      action:      'write',
      expires:     Date.now() + 15 * 60 * 1000,
      contentType: fileType,
    });

    return NextResponse.json({ signedUrl, path }, { status: 200 });
  } catch (err) {
    console.error('[API/upload]', err);
    return NextResponse.json({ error: 'Erro ao gerar URL de upload.' }, { status: 500 });
  }
}
