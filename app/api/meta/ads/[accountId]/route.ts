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

    const account     = snap.data() as Record<string, unknown>;
    const token       = account.metaLongLivedToken as string | undefined;
    const adAccountId = account.adAccountId        as string | undefined;

    if (!token) {
      return NextResponse.json({ error: 'Token Meta não encontrado.' }, { status: 400 });
    }

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'Nenhuma conta de anúncios (Ad Account) associada. Verifique permissões.' },
        { status: 400 }
      );
    }

    const period     = req.nextUrl.searchParams.get('period') ?? '30d';
    const datePreset =
      period === '7d'  ? 'last_7d'  :
      period === '90d' ? 'last_90d' : 'last_30d';

    const summaryUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?` +
      `fields=impressions,reach,clicks,spend,cpc,cpm,ctr,actions,conversions` +
      `&date_preset=${datePreset}&access_token=${token}`;

    const dailyUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?` +
      `fields=spend,impressions,clicks,cpc,cpm&time_increment=1` +
      `&date_preset=${datePreset}&access_token=${token}`;

    const campaignsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?` +
      `fields=id,name,status,objective` +
      `&effective_status=["ACTIVE","PAUSED"]` +
      `&access_token=${token}`;

    const [summaryRes, dailyRes, campaignsRes] = await Promise.all([
      fetch(summaryUrl),
      fetch(dailyUrl),
      fetch(campaignsUrl),
    ]);

    const [summaryData, dailyData, campaignsData] = await Promise.all([
      summaryRes.json()   as Promise<{ data?: Record<string, unknown>[]; error?: { message: string } }>,
      dailyRes.json()     as Promise<{ data?: { date_start: string; spend?: string; impressions?: string; clicks?: string; cpc?: string; cpm?: string }[] }>,
      campaignsRes.json() as Promise<{ data?: { id: string; name: string; status: string; objective: string }[] }>,
    ]);

    if (!summaryRes.ok) {
      throw new Error((summaryData as any).error?.message ?? 'Erro ao buscar dados de anúncios.');
    }

    const s       = (summaryData.data?.[0] ?? {}) as Record<string, unknown>;
    const actions = (s.actions ?? []) as { action_type: string; value: string }[];
    const purchases = actions.find((a) => a.action_type === 'offsite_conversion.fb_pixel_purchase');

    const spend  = parseFloat(String(s.spend  ?? '0'));
    const clicks = parseInt(String(s.clicks   ?? '0'), 10);
    const roas   = spend > 0 && purchases ? (parseInt(purchases.value, 10) * 100) / spend : 0;

    const summary = {
      spend,
      impressions: parseInt(String(s.impressions ?? '0'), 10),
      reach:       parseInt(String(s.reach       ?? '0'), 10),
      clicks,
      cpc:         parseFloat(String(s.cpc ?? '0')),
      cpm:         parseFloat(String(s.cpm ?? '0')),
      ctr:         parseFloat(String(s.ctr ?? '0')),
      conversions: purchases ? parseInt(purchases.value, 10) : 0,
      roas:        parseFloat(roas.toFixed(2)),
    };

    const chartData = (dailyData.data ?? []).map((d) => ({
      name:      new Date(d.date_start).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      CPC:       parseFloat(d.cpc        ?? '0'),
      CPM:       parseFloat(d.cpm        ?? '0'),
      Cliques:   parseInt(d.clicks       ?? '0', 10),
      Investido: parseFloat(d.spend      ?? '0'),
    }));

    const campaigns = (campaignsData.data ?? []).map((c) => ({
      id:        c.id,
      name:      c.name,
      status:    c.status,
      objective: c.objective,
      platform:  'facebook',
    }));

    return NextResponse.json({ success: true, summary, chartData, campaigns, period, adAccountId });
  } catch (err) {
    console.error('[meta/ads] Error:', err);
    const message = err instanceof Error ? err.message : 'Erro ao buscar dados de anúncios.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
