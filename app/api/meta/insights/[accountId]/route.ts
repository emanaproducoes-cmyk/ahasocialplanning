import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb }                from '@/lib/firebase/admin';

export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    const uid = req.nextUrl.searchParams.get('uid');
    const { accountId } = params;

    if (!uid || !accountId) {
      return NextResponse.json({ error: 'uid e accountId são obrigatórios.' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const snap    = await adminDb
      .collection('users').doc(uid)
      .collection('connectedAccounts').doc(accountId)
      .get();

    if (!snap.exists()) {
      return NextResponse.json({ error: 'Conta não encontrada.' }, { status: 404 });
    }

    const account       = snap.data() as Record<string, unknown>;
    const token         = account.metaLongLivedToken as string | undefined;
    const metaAccountId = account.metaAccountId     as string | undefined;

    if (!token || !metaAccountId) {
      return NextResponse.json({ error: 'Token Meta não encontrado. Reconecte a conta.' }, { status: 400 });
    }

    const period = req.nextUrl.searchParams.get('period') ?? '30d';
    const days   = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const since  = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
    const until  = Math.floor(Date.now() / 1000);

    const metricsUrl = `https://graph.facebook.com/v19.0/${metaAccountId}/insights?` +
      `metric=page_fans,page_impressions,page_engaged_users,page_post_engagements,page_views_total` +
      `&period=total_over_range&since=${since}&until=${until}` +
      `&access_token=${token}`;

    const weeklyUrl = `https://graph.facebook.com/v19.0/${metaAccountId}/insights?` +
      `metric=page_impressions,page_engaged_users` +
      `&period=week&since=${since}&until=${until}` +
      `&access_token=${token}`;

    const [metricsRes, weeklyRes] = await Promise.all([
      fetch(metricsUrl),
      fetch(weeklyUrl),
    ]);

    const [metricsData, weeklyData] = await Promise.all([
      metricsRes.json() as Promise<{
        data?: { name: string; values: { value: number; end_time: string }[] }[];
        error?: { message: string };
      }>,
      weeklyRes.json() as Promise<{
        data?: { name: string; values: { value: number; end_time: string }[] }[];
      }>,
    ]);

    if (!metricsRes.ok) {
      throw new Error((metricsData as any).error?.message ?? 'Erro ao buscar insights.');
    }

    const totals: Record<string, number> = {};
    (metricsData.data ?? []).forEach((item) => {
      totals[item.name] = item.values?.[0]?.value ?? 0;
    });

    const weeklyMap: Record<string, Record<string, number>> = {};
    (weeklyData.data ?? []).forEach((item) => {
      item.values.forEach((v) => {
        const label = new Date(v.end_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        if (!weeklyMap[label]) weeklyMap[label] = {};
        weeklyMap[label][item.name] = v.value;
      });
    });

    const chartData = Object.entries(weeklyMap).map(([date, metrics]) => ({
      name:        date,
      impressoes:  metrics.page_impressions    ?? 0,
      engajamento: metrics.page_engaged_users  ?? 0,
    }));

    return NextResponse.json({
      success: true,
      totals: {
        fans:           totals.page_fans               ?? 0,
        impressions:    totals.page_impressions         ?? 0,
        engagement:     totals.page_engaged_users       ?? 0,
        postEngagement: totals.page_post_engagements    ?? 0,
        pageViews:      totals.page_views_total         ?? 0,
      },
      chartData,
      period,
    });
  } catch (err) {
    console.error('[meta/insights] Error:', err);
    const message = err instanceof Error ? err.message : 'Erro ao buscar insights.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
