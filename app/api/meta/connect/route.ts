import { NextRequest, NextResponse } from 'next/server';

const META_APP_ID     = process.env.META_APP_ID     ?? '';
const META_APP_SECRET = process.env.META_APP_SECRET ?? '';
const APP_URL         = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

const GRAPH_SCOPES = [
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

export async function POST(req: NextRequest) {
  try {
    if (!META_APP_ID || !META_APP_SECRET) {
      return NextResponse.json(
        { error: 'Meta App ID ou Secret não configurados no servidor.' },
        { status: 500 }
      );
    }

    const { uid, accountId } = await req.json() as { uid?: string; accountId?: string };

    if (!uid) {
      return NextResponse.json({ error: 'UID do usuário é obrigatório.' }, { status: 400 });
    }

    const state = Buffer.from(
      JSON.stringify({ uid, accountId: accountId ?? null, ts: Date.now() })
    ).toString('base64url');

    const redirectUri = `${APP_URL}/api/meta/callback`;

    const oauthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    oauthUrl.searchParams.set('client_id',     META_APP_ID);
    oauthUrl.searchParams.set('redirect_uri',  redirectUri);
    oauthUrl.searchParams.set('scope',         GRAPH_SCOPES);
    oauthUrl.searchParams.set('state',         state);
    oauthUrl.searchParams.set('response_type', 'code');

    return NextResponse.json({ url: oauthUrl.toString() });
  } catch (err) {
    console.error('[meta/connect] Error:', err);
    return NextResponse.json({ error: 'Erro interno ao iniciar OAuth.' }, { status: 500 });
  }
}
