/**
 * app/api/meta/insights/[accountId]/route.ts
 *
 * Proxy seguro para Graph API — nunca expõe o token ao client.
 * Cache de 4 horas no cabeçalho para não exceder rate limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb }                from '@/lib/firebase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const { searchParams } = new URL(req.url);
  const uid              = searchParams.get('uid');

  if (!uid) return NextResponse.json({ error: 'uid obrigatório' }, { status: 400 });

  try {
    const db      = getAdminDb();
    const docSnap = await db.doc(`users/${uid}/connectedAccounts/${params.accountId}`).get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const account   = docSnap.data()!;
    const token     = account._pageToken ?? account._accessToken;
    const metaId    = account.metaAccountId ?? account.metaPageId;

    if (!token || !metaId) {
      return NextResponse.json({ error: 'Token ou ID Meta não configurado' }, { status: 400 });
    }

    // Busca dados do perfil + insights de 7 dias
    const [profileRes, insightsRes] = await Promise.all([
      fetch(`https://graph.facebook.com/v19.0/${metaId}?fields=followers_count,media_count,biography,name,username&access_token=${token}`),
      fetch(`https://graph.facebook.com/v19.0/${metaId}/insights?metric=reach,impressions,profile_views&period=day&since=${sevenDaysAgo()}&access_token=${token}`),
    ]);

    const profile  = await profileRes.json();
    const insights = await insightsRes.json();

    // Formata série semanal para o LineChart
    const weekly = formatInsightsSeries(insights.data ?? []);

    const response = NextResponse.json({
      profile: {
        name:        profile.name      ?? account.name,
        username:    profile.username  ?? account.handle,
        followers:   profile.followers_count ?? account.followers ?? 0,
        posts:       profile.media_count     ?? account.posts     ?? 0,
        biography:   profile.biography ?? '',
      },
      weekly,
    });

    // Cache 4 horas
    response.headers.set('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=3600');
    return response;

  } catch (err: any) {
    console.error('[Meta insights error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function sevenDaysAgo(): number {
  return Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
}

function formatInsightsSeries(data: any[]) {
  const map: Record<string, Record<string, number>> = {};

  for (const metric of data) {
    for (const point of metric.values ?? []) {
      const label = new Date(point.end_time).toLocaleDateString('pt-BR', { weekday: 'short' });
      if (!map[label]) map[label] = {};
      map[label][metric.name] = point.value;
    }
  }

  return Object.entries(map).map(([name, values]) => ({ name, ...values }));
}
