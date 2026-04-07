/**
 * app/api/meta/connect/route.ts
 * Gera a URL de login da Meta e redireciona o usuário.
 * O token de autenticação Firebase é passado via state para ser recuperado no callback.
 */

import { NextRequest, NextResponse } from 'next/server';

const META_APP_ID    = process.env.META_APP_ID ?? '';
const APP_URL        = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const REDIRECT_URI   = `${APP_URL}/api/meta/callback`;

// Escopos necessários: Graph API (contas, posts, insights) + Ads API
const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'business_management',
  'ads_management',
  'ads_read',
].join(',');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idToken          = searchParams.get('idToken') ?? '';
  const uid              = searchParams.get('uid')     ?? '';

  if (!META_APP_ID) {
    return NextResponse.json({ error: 'META_APP_ID não configurado.' }, { status: 500 });
  }

  // Encoda uid + idToken no state para recuperar no callback
  const state = Buffer.from(JSON.stringify({ uid, idToken })).toString('base64url');

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id',     META_APP_ID);
  authUrl.searchParams.set('redirect_uri',  REDIRECT_URI);
  authUrl.searchParams.set('scope',         SCOPES);
  authUrl.searchParams.set('state',         state);
  authUrl.searchParams.set('response_type', 'code');

  return NextResponse.redirect(authUrl.toString());
}
