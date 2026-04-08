import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb }                from '@/lib/firebase/admin';
import { FieldValue }                from 'firebase-admin/firestore';

async function fetchPageFollowers(token: string, metaAccountId: string) {
  const url = `https://graph.facebook.com/v19.0/${metaAccountId}?fields=followers_count,fan_count,name,picture&access_token=${token}`;
  const res  = await fetch(url);
  return res.json() as Promise<{
    followers_count?: number; fan_count?: number;
    name?: string; error?: { message: string };
  }>;
}

async function fetchInsights(token: string, metaAccountId: string) {
  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const until = Math.floor(Date.now() / 1000);

  const url = `https://graph.facebook.com/v19.0/${metaAccountId}/insights?` +
    `metric=page_fans,page_impressions,page_engaged_users,page_post_engagements` +
    `&period=total_over_range&since=${since}&until=${until}` +
    `&access_token=${token}`;

  const res  = await fetch(url);
  const data = await res.json() as {
    data?: { name: string; values: { value: number }[] }[];
    error?: { message: string };
  };
  if (!res.ok) throw new Error(data.error?.message ?? 'Erro ao buscar insights.');
  return data.data ?? [];
}

async function fetchAdsData(token: string, adAccountId: string) {
  const url = `https://graph.facebook.com/v19.0/${adAccountId}/insights?` +
    `fields=impressions,reach,clicks,spend,cpc,cpm,ctr,actions&date_preset=last_30d` +
    `&access_token=${token}`;

  const res  = await fetch(url);
  const data = await res.json() as {
    data?: {
      impressions?: string; reach?: string; clicks?: string;
      spend?: string; cpc?: string; cpm?: string; ctr?: string;
      actions?: { action_type: string; value: string }[];
    }[];
    error?: { message: string };
  };
  if (!res.ok) throw new Error(data.error?.message ?? 'Erro ao buscar dados de anúncios.');
  return data.data?.[0] ?? null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const { uid } = await req.json() as { uid?: string };
    const { accountId } = params;

    if (!uid || !accountId) {
      return NextResponse.json({ error: 'uid e accountId são obrigatórios.' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const ref     = adminDb.collection('users').doc(uid).collection('connectedAccounts').doc(accountId);
    const snap    = await ref.get();

    if (!snap.exists()) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    const account       = snap.data() as Record<string, unknown>;
    const token         = account.metaLongLivedToken as string | undefined;
    const metaAccountId = account.metaAccountId     as string | undefined;
    const adAccountId   = account.adAccountId       as string | undefined;

    if (!token || !metaAccountId) {
      return NextResponse.json(
        { error: 'Conta Meta não conectada. Reconecte via OAuth.' },
        { status: 400 }
      );
    }

    // Cache de 4 horas
    const lastSync    = account.lastSyncedAt as { _seconds?: number } | undefined;
    const fourHoursAgo = Date.now() / 1000 - 4 * 60 * 60;
    if (lastSync?._seconds && lastSync._seconds > fourHoursAgo) {
      return NextResponse.json({ success: true, cached: true, message: 'Dados já atualizados nas últimas 4 horas.' });
    }

    const [pageInfo, insights, adsData] = await Promise.allSettled([
      fetchPageFollowers(token, metaAccountId),
      fetchInsights(token, metaAccountId),
      adAccountId ? fetchAdsData(token, adAccountId) : Promise.resolve(null),
    ]);

    const insightMap: Record<string, number> = {};
    if (insights.status === 'fulfilled') {
      insights.value.forEach((item) => {
        insightMap[item.name] = item.values?.[0]?.value ?? 0;
      });
    }

    const pageData  = pageInfo.status === 'fulfilled' ? pageInfo.value : {};
    const followers = pageData.followers_count ?? pageData.fan_count ?? 0;

    const ads         = adsData.status === 'fulfilled' ? adsData.value : null;
    const conversions = ads?.actions?.find(
      (a) => a.action_type === 'offsite_conversion.fb_pixel_purchase'
    )?.value ?? null;

    const update: Record<string, unknown> = {
      followers,
      engagement:   insightMap.page_post_engagements ?? 0,
      impressions:  insightMap.page_impressions      ?? 0,
      reach:        insightMap.page_engaged_users    ?? 0,
      status:       'ativo',
      lastSyncedAt: FieldValue.serverTimestamp(),
      updatedAt:    FieldValue.serverTimestamp(),
    };

    if (ads && adAccountId) {
      update.adsMetrics = {
        spend:       parseFloat(ads.spend       ?? '0'),
        impressions: parseInt(ads.impressions   ?? '0', 10),
        reach:       parseInt(ads.reach         ?? '0', 10),
        clicks:      parseInt(ads.clicks        ?? '0', 10),
        cpc:         parseFloat(ads.cpc         ?? '0'),
        cpm:         parseFloat(ads.cpm         ?? '0'),
        ctr:         parseFloat(ads.ctr         ?? '0'),
        conversions: conversions ? parseInt(conversions, 10) : 0,
        roas:        0,
        syncedAt:    new Date().toISOString(),
      };
    }

    await ref.update(update);

    return NextResponse.json({ success: true, cached: false, followers });
  } catch (err) {
    console.error('[meta/sync-account] Error:', err);
    const message = err instanceof Error ? err.message : 'Erro ao sincronizar conta Meta.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
