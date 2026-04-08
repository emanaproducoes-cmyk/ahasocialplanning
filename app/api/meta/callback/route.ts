import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb }                from '@/lib/firebase/admin';
import { FieldValue }                from 'firebase-admin/firestore';

const META_APP_ID     = process.env.META_APP_ID     ?? '';
const META_APP_SECRET = process.env.META_APP_SECRET ?? '';
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function exchangeCodeForToken(code: string): Promise<string> {
  const redirectUri = `${APP_URL}/api/meta/callback`;
  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  url.searchParams.set('client_id',     META_APP_ID);
  url.searchParams.set('client_secret', META_APP_SECRET);
  url.searchParams.set('redirect_uri',  redirectUri);
  url.searchParams.set('code',          code);

  const res  = await fetch(url.toString());
  const data = await res.json() as { access_token?: string; error?: { message: string } };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? 'Falha ao trocar código por token.');
  }
  return data.access_token;
}

async function getLongLivedToken(shortToken: string): Promise<string> {
  const url = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  url.searchParams.set('grant_type',        'fb_exchange_token');
  url.searchParams.set('client_id',         META_APP_ID);
  url.searchParams.set('client_secret',     META_APP_SECRET);
  url.searchParams.set('fb_exchange_token', shortToken);

  const res  = await fetch(url.toString());
  const data = await res.json() as { access_token?: string; error?: { message: string } };

  if (!res.ok || !data.access_token) {
    throw new Error(data.error?.message ?? 'Falha ao obter long-lived token.');
  }
  return data.access_token;
}

async function fetchMetaUserInfo(token: string): Promise<{
  metaUserId: string;
  name:       string;
  adAccounts: { id: string; name: string; currency: string }[];
}> {
  const url = `https://graph.facebook.com/v19.0/me?fields=id,name,adaccounts{id,name,currency}&access_token=${token}`;
  const res  = await fetch(url);
  const data = await res.json() as {
    id?: string; name?: string;
    adaccounts?: { data: { id: string; name: string; currency: string }[] };
    error?: { message: string };
  };

  if (!res.ok || !data.id) {
    throw new Error(data.error?.message ?? 'Falha ao obter dados do usuário Meta.');
  }

  return {
    metaUserId: data.id,
    name:       data.name ?? '',
    adAccounts: data.adaccounts?.data ?? [],
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code     = searchParams.get('code');
  const state    = searchParams.get('state');
  const errParam = searchParams.get('error');

  if (errParam) {
    return NextResponse.redirect(`${APP_URL}/contas?meta_error=permission_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/contas?meta_error=missing_params`);
  }

  try {
    const { uid, accountId } = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf-8')
    ) as { uid: string; accountId: string | null };

    if (!uid) throw new Error('UID inválido no state.');

    const shortToken     = await exchangeCodeForToken(code);
    const longToken      = await getLongLivedToken(shortToken);
    const metaInfo       = await fetchMetaUserInfo(longToken);
    const firstAdAccount = metaInfo.adAccounts[0] ?? null;

    const accountDocId = accountId ?? `meta_${metaInfo.metaUserId}`;

    // getAdminDb() usa lazy init — seguro em runtime
    const adminDb = getAdminDb();
    const ref = adminDb
      .collection('users')
      .doc(uid)
      .collection('connectedAccounts')
      .doc(accountDocId);

    await ref.set(
      {
        platform:           'facebook',
        name:               metaInfo.name,
        handle:             metaInfo.name.toLowerCase().replace(/\s/g, ''),
        avatar:             '',
        followers:          0,
        engagement:         0,
        posts:              0,
        status:             'ativo',
        metaAccountId:      metaInfo.metaUserId,
        metaLongLivedToken: longToken,           // somente server-side no Firestore
        adAccountId:        firstAdAccount?.id   ?? null,
        adAccountName:      firstAdAccount?.name ?? null,
        allAdAccounts:      metaInfo.adAccounts,
        lastSyncedAt:       FieldValue.serverTimestamp(),
        connectedAt:        FieldValue.serverTimestamp(),
        updatedAt:          FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.redirect(
      `${APP_URL}/contas?meta_success=1&account=${accountDocId}`
    );
  } catch (err) {
    console.error('[meta/callback] Error:', err);
    const msg = err instanceof Error ? encodeURIComponent(err.message) : 'unknown';
    return NextResponse.redirect(`${APP_URL}/contas?meta_error=${msg}`);
  }
}
