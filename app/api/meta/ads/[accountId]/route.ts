/**
 * app/api/meta/ads/[accountId]/route.ts
 *
 * Proxy seguro para Meta Ads API.
 * Retorna KPIs (CPC, CPM, CTR, ROAS), lista de campanhas e série diária.
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

    const account     = docSnap.data()!;
    const token       = account._pageToken ?? account._accessToken;
    const adAccountId = account.adAccountId;

    if (!token) {
      return NextResponse.json({ error: 'Token não configurado' }, { status: 400 });
    }

    if (!adAccountId) {
      return NextResponse.json({
        error:   'ad_account_id não configurado',
        noAdAccount: true,
      }, { status: 400 });
    }

    const since = thirtyDaysAgo();
    const until = todayStr();

    // Busca insights globais + lista de campanhas em paralelo
    const [insightsRes, campaignsRes] = await Promise.all([
      fetch(
        `https://graph.facebook.com/v19.0/${adAccountId}/insights?` +
        `fields=spend,impressions,reach,clicks,cpc,cpm,ctr,actions,action_values&` +
        `time_range={"since":"${since}","until":"${until}"}` +
        `&access_token=${token}`
      ),
      fetch(
        `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?` +
        `fields=id,name,status,daily_budget,lifetime_budget,insights{spend,impressions,clicks,cpc,ctr,cpm}&` +
        `access_token=${token}`
      ),
    ]);

    const insightsData  = await insightsRes.json();
    const campaignsData = await campaignsRes.json();

    const raw      = insightsData.data?.[0] ?? {};
    const spend    = parseFloat(raw.spend       ?? '0');
    const clicks   = parseInt(raw.clicks        ?? '0', 10);
    const impr     = parseInt(raw.impressions   ?? '0', 10);
    const cpc      = parseFloat(raw.cpc         ?? '0');
    const cpm      = parseFloat(raw.cpm         ?? '0');
    const ctr      = parseFloat(raw.ctr         ?? '0');

    // ROAS = soma de purchase_value / spend
    const purchaseValue = (raw.action_values ?? [])
      .filter((a: any) => a.action_type === 'omni_purchase')
      .reduce((sum: number, a: any) => sum + parseFloat(a.value ?? '0'), 0);
    const roas = spend > 0 ? purchaseValue / spend : 0;

    // Conversões (purchases)
    const conversions = (raw.actions ?? [])
      .filter((a: any) => a.action_type === 'omni_purchase')
      .reduce((sum: number, a: any) => sum + parseInt(a.value ?? '0', 10), 0);

    const campaigns = (campaignsData.data ?? []).map((c: any) => {
      const ci = c.insights?.data?.[0] ?? {};
      return {
        id:          c.id,
        name:        c.name,
        status:      c.status,
        budget:      parseFloat(c.daily_budget ?? c.lifetime_budget ?? '0') / 100,
        spend:       parseFloat(ci.spend   ?? '0'),
        impressions: parseInt(ci.impressions ?? '0', 10),
        clicks:      parseInt(ci.clicks ?? '0', 10),
        cpc:         parseFloat(ci.cpc ?? '0'),
        ctr:         parseFloat(ci.ctr ?? '0'),
        cpm:         parseFloat(ci.cpm ?? '0'),
      };
    });

    const response = NextResponse.json({
      kpis: { spend, impressions: impr, clicks, cpc, cpm, ctr, roas, conversions },
      campaigns,
    });

    response.headers.set('Cache-Control', 'public, s-maxage=14400, stale-while-revalidate=3600');
    return response;

  } catch (err: any) {
    console.error('[Meta ads error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
