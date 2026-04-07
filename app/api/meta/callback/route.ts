/**
 * app/api/meta/callback/route.ts
 *
 * Recebe o code do OAuth Meta, troca por short-lived token,
 * faz upgrade para long-lived token (60 dias), busca as Pages e
 * contas Instagram vinculadas, e salva tudo no Firestore via Admin SDK.
 *
 * O accessToken NUNCA é exposto ao client — fica só no Firestore
 * no campo _accessToken (prefixo _ = campo privado por convenção).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb }                from '@/lib/firebase/admin';
import { FieldValue }                from 'firebase-admin/firestore';

const META_APP_ID     = process.env.META_APP_ID     ?? '';
const META_APP_SECRET = process.env.META_APP_SECRET ?? '';
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const REDIRECT_URI    = `${APP_URL}/api/meta/callback`;

interface MetaPage {
  id:           string;
  name:         string;
  access_token: string;
  instagram_business_account?: { id: string };
}

interface MetaIGAccount {
  id:               string;
  name:             string;
  username:         string;
  profile_picture_url?: string;
  followers_count:  number;
  media_count:      number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code             = searchParams.get('code');
  const stateRaw         = searchParams.get('state') ?? '';
  const errorParam       = searchParams.get('error');

  // Usuário cancelou
  if (errorParam) {
    return NextResponse.redirect(`${APP_URL}/contas?meta=cancelled`);
  }

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/contas?meta=error&msg=no_code`);
  }

  // Decodifica state para recuperar uid
  let uid = '';
  try {
    const parsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
    uid = parsed.uid ?? '';
  } catch {
    return NextResponse.redirect(`${APP_URL}/contas?meta=error&msg=invalid_state`);
  }

  if (!uid) {
    return NextResponse.redirect(`${APP_URL}/contas?meta=error&msg=no_uid`);
  }

  try {
    // 1. Troca code por short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      `&client_secret=${META_APP_SECRET}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Falha ao obter short-lived token');

    // 2. Upgrade para long-lived token (~60 dias)
    const llRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&client_id=${META_APP_ID}` +
      `&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`
    );
    const llData = await llRes.json();
    const longLivedToken: string = llData.access_token ?? tokenData.access_token;

    // 3. Busca Pages vinculadas
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longLivedToken}`
    );
    const pagesData = await pagesRes.json();
    const pages: MetaPage[] = pagesData.data ?? [];

    const db      = getAdminDb();
    const batch   = db.batch();
    const baseRef = db.collection(`users/${uid}/connectedAccounts`);
    const now     = FieldValue.serverTimestamp();

    for (const page of pages) {
      // Salva conta Facebook Page
      const fbDocId = `facebook_${page.id}`;
      batch.set(baseRef.doc(fbDocId), {
        platform:     'facebook',
        name:         page.name,
        handle:       page.name.toLowerCase().replace(/\s/g, ''),
        avatar:       `https://graph.facebook.com/${page.id}/picture?type=square`,
        followers:    0,
        engagement:   0,
        posts:        0,
        status:       'ativo',
        metaPageId:   page.id,
        _pageToken:   page.access_token, // privado
        _accessToken: longLivedToken,    // privado
        connectedAt:  now,
        updatedAt:    now,
      }, { merge: true });

      // Se tem IG Business vinculado, busca dados e salva
      if (page.instagram_business_account?.id) {
        const igId  = page.instagram_business_account.id;
        const igRes = await fetch(
          `https://graph.facebook.com/v19.0/${igId}?` +
          `fields=id,name,username,profile_picture_url,followers_count,media_count` +
          `&access_token=${page.access_token}`
        );
        const ig: MetaIGAccount = await igRes.json();

        const igDocId = `instagram_${igId}`;
        batch.set(baseRef.doc(igDocId), {
          platform:        'instagram',
          name:            ig.name    ?? page.name,
          handle:          ig.username ?? '',
          avatar:          ig.profile_picture_url ?? '',
          followers:       ig.followers_count ?? 0,
          engagement:      0,
          posts:           ig.media_count ?? 0,
          status:          'ativo',
          metaAccountId:   igId,
          metaPageId:      page.id,
          _pageToken:      page.access_token, // privado
          _accessToken:    longLivedToken,    // privado
          connectedAt:     now,
          updatedAt:       now,
          lastSyncedAt:    now,
        }, { merge: true });
      }
    }

    await batch.commit();

    return NextResponse.redirect(`${APP_URL}/contas?meta=success`);
  } catch (err: any) {
    console.error('[Meta callback error]', err);
    return NextResponse.redirect(`${APP_URL}/contas?meta=error&msg=${encodeURIComponent(err.message)}`);
  }
}
