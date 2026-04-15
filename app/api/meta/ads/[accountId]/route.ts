// app/api/meta/ads/[accountId]/route.ts
// Busca métricas de anúncios (Ads Insights) da conta Meta.
// Usado pela página de Tráfego Pago.
//
// Query params:
//   uid    (obrigatório) — UID do usuário dono da conta
//   period (opcional)   — "7d" | "30d" | "90d" (default: "30d")
import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export const dynamic = "force-dynamic";

const API_VERSION = "v21.0";

export async function GET(
  req: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const uid = req.nextUrl.searchParams.get("uid");
  const { accountId } = params;

  if (!uid || !accountId) {
    return NextResponse.json(
      { error: "uid e accountId são obrigatórios." },
      { status: 400 }
    );
  }

  // ─── Busca a conta no Firestore ──────────────────────────────────────────────
  const db = getAdminDb();
  const snap = await db
    .collection("users").doc(uid)
    .collection("socialAccounts").doc(accountId)  // ← socialAccounts (corrigido)
    .get();

  if (!snap.exists) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }

  const account = snap.data()!;

  // _pageToken (Page Access Token) tem permissão para acessar a Ads API
  const token = (account._pageToken ?? account.metaLongLivedToken) as string | undefined;
  const adAccountId = account.adAccountId as string | undefined;

  if (!token) {
    return NextResponse.json({ error: "Token Meta não encontrado." }, { status: 400 });
  }

  if (!adAccountId) {
    return NextResponse.json(
      { error: "Nenhuma conta de anúncios (Ad Account) associada. Verifique permissões no Meta Business Suite." },
      { status: 400 }
    );
  }

  // ─── Configura período ───────────────────────────────────────────────────────
  const period = req.nextUrl.searchParams.get("period") ?? "30d";
  const datePreset =
    period === "7d" ? "last_7d" : period === "90d" ? "last_90d" : "last_30d";

  const base = `https://graph.facebook.com/${API_VERSION}/${adAccountId}`;

  // ─── Chamadas paralelas à Graph API ─────────────────────────────────────────
  try {
    const [summaryRes, dailyRes, campaignsRes] = await Promise.all([
      fetch(
        `${base}/insights?fields=impressions,reach,clicks,spend,cpc,cpm,ctr,actions,conversions` +
          `&date_preset=${datePreset}&access_token=${token}`
      ),
      fetch(
        `${base}/insights?fields=spend,impressions,clicks,cpc,cpm&time_increment=1` +
          `&date_preset=${datePreset}&access_token=${token}`
      ),
      fetch(
        `${base}/campaigns?fields=id,name,status,objective` +
          `&effective_status=["ACTIVE","PAUSED"]&access_token=${token}`
      ),
    ]);

    const [summaryData, dailyData, campaignsData] = (await Promise.all([
      summaryRes.json(),
      dailyRes.json(),
      campaignsRes.json(),
    ])) as [
      { data?: Record<string, unknown>[]; error?: { message: string } },
      { data?: { date_start: string; spend?: string; impressions?: string; clicks?: string; cpc?: string; cpm?: string }[] },
      { data?: { id: string; name: string; status: string; objective: string }[] },
    ];

    if (summaryData.error) {
      throw new Error(summaryData.error.message);
    }

    // ─── Processa resumo ───────────────────────────────────────────────────────
    const s = (summaryData.data?.[0] ?? {}) as Record<string, unknown>;
    const actions = (s.actions ?? []) as { action_type: string; value: string }[];
    const purchases = actions.find(
      (a) => a.action_type === "offsite_conversion.fb_pixel_purchase"
    );
    const spend = parseFloat(String(s.spend ?? "0"));
    const roas =
      spend > 0 && purchases ? (parseInt(purchases.value, 10) * 100) / spend : 0;

    const summary = {
      spend,
      impressions: parseInt(String(s.impressions ?? "0"), 10),
      reach: parseInt(String(s.reach ?? "0"), 10),
      clicks: parseInt(String(s.clicks ?? "0"), 10),
      cpc: parseFloat(String(s.cpc ?? "0")),
      cpm: parseFloat(String(s.cpm ?? "0")),
      ctr: parseFloat(String(s.ctr ?? "0")),
      conversions: purchases ? parseInt(purchases.value, 10) : 0,
      roas: parseFloat(roas.toFixed(2)),
    };

    // ─── Processa dados diários (para gráfico) ─────────────────────────────────
    const chartData = (dailyData.data ?? []).map((d) => ({
      name: new Date(d.date_start).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      }),
      CPC: parseFloat(d.cpc ?? "0"),
      CPM: parseFloat(d.cpm ?? "0"),
      Cliques: parseInt(d.clicks ?? "0", 10),
      Investido: parseFloat(d.spend ?? "0"),
    }));

    // ─── Campanhas ─────────────────────────────────────────────────────────────
    const campaigns = (campaignsData.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      platform: "facebook",
    }));

    return NextResponse.json({ success: true, summary, chartData, campaigns, period, adAccountId });
  } catch (err) {
    console.error("[meta/ads] Erro:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao buscar dados de anúncios." },
      { status: 500 }
    );
  }
}
