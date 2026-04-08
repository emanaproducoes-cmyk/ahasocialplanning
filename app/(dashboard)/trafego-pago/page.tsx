'use client';

import { useState, useEffect, useCallback } from 'react';
import Link                                  from 'next/link';
import { useAuth }                           from '@/lib/hooks/useAuth';
import { useUserCollection }                 from '@/lib/hooks/useCollection';
import { cn }                                from '@/lib/utils/cn';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { ConnectedAccount } from '@/lib/types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AdsSummary {
  spend: number; impressions: number; reach: number; clicks: number;
  cpc: number; cpm: number; ctr: number; conversions: number; roas: number;
}

interface AdsChartPoint {
  name: string; CPC: number; CPM: number; Cliques: number; Investido: number;
}

interface AdsCampaign {
  id: string; name: string; status: string; objective: string; platform: string;
}

interface AdsData {
  summary:   AdsSummary;
  chartData: AdsChartPoint[];
  campaigns: AdsCampaign[];
}

// ─── Mock data (fallback quando não há Meta conectado) ───────────────────────

const MOCK_CPC_DATA = [
  { name: 'Instagram',  CPC: 1.20, CPM: 8.50  },
  { name: 'Facebook',   CPC: 0.85, CPM: 12.00 },
  { name: 'Google Ads', CPC: 2.10, CPM: 15.00 },
  { name: 'TikTok',     CPC: 0.45, CPM: 5.50  },
  { name: 'YouTube',    CPC: 1.80, CPM: 10.00 },
];

const MOCK_ENTRIES = [
  { id: 'a', name: 'Stories Black Friday', platform: 'instagram', status: 'ativo',   invested: 1200, impressions: 85000, reach: 62000, clicks: 3200, conversions: 84,  cpc: 0.37, cpm: 14.1, ctr: 3.76, roas: 3.2 },
  { id: 'b', name: 'Feed Promoção Natal',  platform: 'facebook',  status: 'ativo',   invested: 800,  impressions: 54000, reach: 41000, clicks: 1900, conversions: 48,  cpc: 0.42, cpm: 14.8, ctr: 3.52, roas: 2.8 },
  { id: 'c', name: 'Reels Produto X',      platform: 'tiktok',    status: 'pausado', invested: 600,  impressions: 120000,reach: 95000, clicks: 5100, conversions: 31,  cpc: 0.11, cpm: 5.0,  ctr: 4.25, roas: 1.9 },
  { id: 'd', name: 'B2B Awareness',        platform: 'linkedin',  status: 'ativo',   invested: 1500, impressions: 28000, reach: 22000, clicks: 980,  conversions: 62,  cpc: 1.53, cpm: 53.5, ctr: 3.50, roas: 4.1 },
];

const INVEST_COLORS = ['#E1306C', '#1877F2', '#010101', '#0A66C2', '#FF5C00'];

const PLATFORM_CONFIG: Record<string, { icon: string; bg: string }> = {
  instagram: { icon: '📸', bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  facebook:  { icon: '👤', bg: 'bg-blue-600'  },
  google_ads:{ icon: 'G',  bg: 'bg-green-600' },
  tiktok:    { icon: '🎵', bg: 'bg-black'     },
  youtube:   { icon: '▶',  bg: 'bg-red-600'   },
  linkedin:  { icon: 'in', bg: 'bg-blue-700'  },
};

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function KpiCard({ label, value, color, isReal }: { label: string; value: string; color?: string; isReal?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-extrabold', color ?? 'text-gray-900')}>{value}</p>
      {!isReal && <p className="text-[9px] text-gray-300 mt-1">simulado</p>}
    </div>
  );
}

function MetaConnectBanner() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shrink-0">📊</div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-900">Conecte sua conta Meta Ads para dados reais</p>
        <p className="text-xs text-blue-600 mt-0.5">CPC, CPM, CTR, ROAS e investimento direto da Meta Ads API.</p>
      </div>
      <Link
        href="/contas"
        className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Conectar →
      </Link>
    </div>
  );
}

type SortKey = 'invested' | 'impressions' | 'clicks' | 'conversions' | 'cpc' | 'cpm' | 'ctr' | 'roas';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TrafegoPagoPage() {
  const { user }     = useAuth();
  const [period,     setPeriod]     = useState<'7d' | '30d' | '90d'>('30d');
  const [sortKey,    setSortKey]    = useState<SortKey>('roas');
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('desc');
  const [adsData,    setAdsData]    = useState<AdsData | null>(null);
  const [loadingAds, setLoadingAds] = useState(false);
  const [adsError,   setAdsError]   = useState<string | null>(null);

  const { data: contas } = useUserCollection<ConnectedAccount>(user?.uid ?? null, 'connectedAccounts');

  // Conta Meta com adAccountId
  const metaConta = contas.find((c) => c.metaAccountId && c.adAccountId);
  const hasAdsConnected = !!metaConta;

  // ── Buscar dados da Ads API ───────────────────────────────────────────────
  const fetchAdsData = useCallback(async () => {
    if (!user?.uid || !metaConta) return;
    setLoadingAds(true);
    setAdsError(null);
    try {
      const res  = await fetch(`/api/meta/ads/${metaConta.id}?uid=${user.uid}&period=${period}`);
      const data = await res.json() as AdsData & { error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar anúncios.');
      setAdsData(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar dados.';
      setAdsError(msg);
    } finally {
      setLoadingAds(false);
    }
  }, [user?.uid, metaConta, period]);

  useEffect(() => {
    if (hasAdsConnected) fetchAdsData();
  }, [hasAdsConnected, fetchAdsData]);

  // ── Dados para exibição ───────────────────────────────────────────────────
  const isReal = hasAdsConnected && !!adsData;

  const summary: AdsSummary = isReal
    ? adsData!.summary
    : MOCK_ENTRIES.reduce(
        (acc, e) => ({
          spend:       acc.spend + e.invested,
          impressions: acc.impressions + e.impressions,
          reach:       acc.reach + e.reach,
          clicks:      acc.clicks + e.clicks,
          cpc:         0,
          cpm:         0,
          ctr:         0,
          conversions: acc.conversions + e.conversions,
          roas:        0,
        }),
        { spend: 0, impressions: 0, reach: 0, clicks: 0, cpc: 0, cpm: 0, ctr: 0, conversions: 0, roas: 0 }
      );

  // Calcular médias para o mock
  if (!isReal) {
    summary.cpc  = summary.clicks > 0 ? summary.spend / summary.clicks : 0;
    summary.ctr  = summary.impressions > 0 ? (summary.clicks / summary.impressions) * 100 : 0;
    summary.roas = MOCK_ENTRIES.reduce((a, e) => a + e.roas, 0) / MOCK_ENTRIES.length;
  }

  const chartBarData  = isReal ? adsData!.chartData.slice(-7) : MOCK_CPC_DATA;
  const campaignsData = isReal ? adsData!.campaigns : [];

  // Tabela de entradas
  const tableEntries = isReal
    ? adsData!.campaigns.map((c, i) => ({
        id:          c.id,
        name:        c.name,
        platform:    c.platform,
        status:      c.status.toLowerCase(),
        invested:    0,
        impressions: 0,
        reach:       0,
        clicks:      0,
        conversions: 0,
        cpc:         0,
        cpm:         0,
        ctr:         0,
        roas:        0,
      }))
    : MOCK_ENTRIES;

  const sortedEntries = [...tableEntries].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortDir === 'desc' ? -diff : diff;
  });

  const investData = isReal
    ? adsData!.campaigns.slice(0, 5).map((c, i) => ({
        name:  c.name.slice(0, 20),
        value: 100 / (i + 1),
        color: INVEST_COLORS[i % INVEST_COLORS.length],
      }))
    : MOCK_ENTRIES.map((e, i) => ({
        name:  e.platform,
        value: e.invested,
        color: INVEST_COLORS[i % INVEST_COLORS.length],
      }));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const COLS: { key: SortKey; label: string }[] = [
    { key: 'invested', label: 'Investimento' }, { key: 'impressions', label: 'Impressões' },
    { key: 'clicks', label: 'Cliques' }, { key: 'conversions', label: 'Conversões' },
    { key: 'cpc', label: 'CPC' }, { key: 'cpm', label: 'CPM' },
    { key: 'ctr', label: 'CTR' }, { key: 'roas', label: 'ROAS' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tráfego Pago</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isReal ? '✅ Dados reais da Meta Ads API' : 'Performance de anúncios pagos'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de período */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d')}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
          {hasAdsConnected && (
            <button
              onClick={fetchAdsData}
              disabled={loadingAds}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors shadow"
            >
              {loadingAds ? '🔄 Carregando...' : '🔄 Atualizar da Meta'}
            </button>
          )}
        </div>
      </div>

      {/* Banner conectar (quando sem Meta Ads) */}
      {!hasAdsConnected && <MetaConnectBanner />}

      {/* Erro */}
      {adsError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          ⚠️ {adsError}
          <button onClick={fetchAdsData} className="ml-auto text-xs font-semibold underline">Tentar novamente</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Investimento"  value={formatCurrency(summary.spend)}           isReal={isReal} />
        <KpiCard label="CPC Médio"     value={formatCurrency(summary.cpc)}             isReal={isReal} />
        <KpiCard label="CTR"           value={formatPercent(summary.ctr)}  color="text-green-600" isReal={isReal} />
        <KpiCard label="ROAS"          value={`${summary.roas.toFixed(1)}x`} color="text-green-600" isReal={isReal} />
      </div>

      {/* KPIs adicionais quando real */}
      {isReal && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Impressões',   value: formatNumber(summary.impressions) },
            { label: 'Alcance',      value: formatNumber(summary.reach)       },
            { label: 'Cliques',      value: formatNumber(summary.clicks)      },
            { label: 'Conversões',   value: String(summary.conversions)       },
            { label: 'CPM',          value: formatCurrency(summary.cpm)       },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{item.label}</p>
              <p className="text-xl font-extrabold text-gray-900">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Campanhas ativas (quando real) */}
      {isReal && campaignsData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-[15px] mb-3">Campanhas Ativas</h3>
          <div className="flex flex-wrap gap-2">
            {campaignsData.map((c) => (
              <span
                key={c.id}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold',
                  c.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                )}
              >
                <span className={cn('w-1.5 h-1.5 rounded-full', c.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400')} />
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-[15px] mb-1">
            {isReal ? 'CPC & CPM ao longo do tempo' : 'CPC & CPM por Plataforma'}
          </h3>
          {!isReal && <p className="text-xs text-gray-400 mb-3">Dados simulados — conecte a Meta Ads para dados reais</p>}
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartBarData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="CPC" fill="#FF5C00" radius={[4, 4, 0, 0]} name="CPC (R$)" />
              <Bar dataKey="CPM" fill="#3B82F6" radius={[4, 4, 0, 0]} name="CPM (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-[15px] mb-4">Distribuição de Investimento</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={investData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {investData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => isReal ? `${v.toFixed(0)}%` : formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de criativos / campanhas */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-[15px]">
            {isReal ? 'Campanhas em Tráfego' : 'Criativos em Tráfego'}
          </h3>
          <span className="text-xs text-gray-400">{sortedEntries.length} itens</span>
        </div>

        {loadingAds ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">🔄 Carregando dados da Meta...</div>
        ) : sortedEntries.length === 0 && isReal ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            Nenhuma campanha ativa encontrada na conta de anúncios.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {isReal ? 'Campanha' : 'Criativo'}
                  </th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase text-left">Plataforma</th>
                  <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase text-left">Status</th>
                  {!isReal && COLS.map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-3 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-[#FF5C00] transition-colors whitespace-nowrap select-none"
                    >
                      {col.label}{sortKey === col.key && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sortedEntries.map((entry) => {
                  const plat = PLATFORM_CONFIG[entry.platform] ?? PLATFORM_CONFIG.instagram;
                  return (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">📊</span>
                          <span className="font-medium text-gray-800">{entry.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold', plat.bg)}>
                          {plat.icon}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn(
                          'flex items-center gap-1.5 text-sm',
                          entry.status === 'ativo' || entry.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'
                        )}>
                          <span className={cn('w-2 h-2 rounded-full', entry.status === 'ativo' || entry.status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-300')} />
                          {entry.status === 'ativo' || entry.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                        </span>
                      </td>
                      {!isReal && (
                        <>
                          <td className="py-3 px-3 text-right text-gray-700">{formatCurrency((entry as any).invested)}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{formatNumber((entry as any).impressions)}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{formatNumber((entry as any).clicks)}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{formatNumber((entry as any).conversions)}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{formatCurrency((entry as any).cpc)}</td>
                          <td className="py-3 px-3 text-right text-gray-700">{formatCurrency((entry as any).cpm)}</td>
                          <td className="py-3 px-3 text-right">
                            <span className={cn('font-semibold', (entry as any).ctr > 3.5 ? 'text-blue-600' : 'text-gray-700')}>
                              {formatPercent((entry as any).ctr)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className={cn('font-bold', (entry as any).roas >= 3 ? 'text-green-600' : (entry as any).roas >= 2 ? 'text-amber-600' : 'text-red-500')}>
                              {(entry as any).roas.toFixed(1)}x
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
