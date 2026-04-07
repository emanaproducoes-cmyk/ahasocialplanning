/**
 * app/api/meta/sync-account/[accountId]/route.ts
 *
 * Sincroniza seguidores, reach e impressions de uma conta Meta
 * e atualiza o documento no Firestore. Cache de 4 horas.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb }                from '@/lib/firebase/admin';
import { FieldValue }                from 'firebase-admin/firestore';

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { uid } = await req.json().catch(() => ({ uid: '' }));

  if (!uid) return NextResponse.json({ error: 'uid obrigatório' }, { status: 400 });

  try {
    const db      = getAdminDb();
    const ref     = db.doc(`users/${uid}/connectedAccounts/${params.accountId}`);
    const docSnap = await ref.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const account = docSnap.data()!;
    const token   = account._pageToken ?? account._accessToken;
    const metaId  = account.metaAccountId ?? account.metaPageId;

    if (!token || !metaId) {
      return NextResponse.json({ error: 'Token ou ID Meta não configurado' }, { status: 400 });
    }

    // Verifica se sync recente (< 4 horas) para não bater desnecessariamente
    const lastSync = account.lastSyncedAt?.toDate?.() ?? new Date(0);
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    if (lastSync > fourHoursAgo) {
      return NextResponse.json({ skipped: true, message: 'Sincronizado recentemente' });
    }

    // Determina se é IG ou Facebook e busca dados correspondentes
    const isInstagram = account.platform === 'instagram';
    const fields = isInstagram
      ? 'followers_count,media_count,name,username,profile_picture_url'
      : 'fan_count,name,picture{url}';

    const profileRes = await fetch(
      `https://graph.facebook.com/v19.0/${metaId}?fields=${fields}&access_token=${token}`
    );
    const profile = await profileRes.json();

    if (profile.error) throw new Error(profile.error.message);

    const updates: Record<string, any> = {
      updatedAt:   FieldValue.serverTimestamp(),
      lastSyncedAt: FieldValue.serverTimestamp(),
      status:      'ativo',
    };

    if (isInstagram) {
      updates.followers = profile.followers_count ?? account.followers;
      updates.posts     = profile.media_count     ?? account.posts;
      updates.name      = profile.name            ?? account.name;
      updates.handle    = profile.username        ?? account.handle;
      if (profile.profile_picture_url) updates.avatar = profile.profile_picture_url;
    } else {
      updates.followers = profile.fan_count ?? account.followers;
      updates.name      = profile.name      ?? account.name;
      if (profile.picture?.data?.url) updates.avatar = profile.picture.data.url;
    }

    await ref.update(updates);

    return NextResponse.json({ success: true, followers: updates.followers });

  } catch (err: any) {
    console.error('[Meta sync error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
