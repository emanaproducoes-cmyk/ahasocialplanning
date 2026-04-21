'use client';

import { useState, useEffect, useCallback } from 'react';
import Link                                  from 'next/link';
import { useAuth }                           from '@/lib/hooks/useAuth';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { useUserCollection }   from '@/lib/hooks/useCollection';
import { orderBy }             from 'firebase/firestore';
import type { Post, ConnectedAccount, Platform } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Platform KPI Card ────────────────────────────────────────────────────────

const PLATFORM_DISPLAY: {
  platform: Platform; prefix: string; label: string; metric: string; gradient: string;
}[] = [
  { platform: 'instagram', prefix: 'IG', label: 'INSTAGRAM', metric: 'SEGUIDORES', gradient: 'linear-gradient(135deg,#833AB4 0%,#FD1D1D 50%,#F77737 100%)' },
  { platform: 'facebook',  prefix: 'FB', label: 'FACEBOOK',  metric: 'CURTIDAS',   gradient: 'linear-gradient(135deg,#1877F2 0%,#0C5FD6 100%)'             },
  { platform: 'youtube',   prefix: 'YT', label: 'YOUTUBE',   metric: 'INSCRITOS',  gradient: 'linear-gradient(135deg,#FF0000 0%,#CC0000 100%)'             },
  { platform: 'tiktok',    prefix: 'TT', label: 'TIKTOK',    metric: 'SEGUIDORES', gradient: 'linear-gradient(135deg,#006994 0%,#00CED1 50%,#40E0D0 100%)' },
  { platform: 'linkedin',  prefix: 'LI', label: 'LINKEDIN',  metric: 'CONEXÕES',   gradient: 'linear-gradient(135deg,#0A66C2 0%,#004182 100%)'             },
];

function PlatformKPICard({
  prefix, label, metric, gradient, value, variation, isReal,
}: {
  prefix: string; label: string; metric: string; gradient: string;
  value: number; variation: number; isReal: boolean;
}) {
  const positive = variation >= 0;
  return (
    <div className="rounded-2xl p-4 text-white flex-1 min-w-0" style={{ background: gradient }}>
      <p className="text-[11px] font-bold opacity-70 tracking-wider mb-2"
        style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 700 }}>{prefix} {label}</p>
      <p className="leading-none mb-1"
        style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 900, fontSize: '28px' }}>{formatNum(value)}</p>
      <p className="text-[11px] opacity-70 uppercase tracking-wider mb-1"
        style={{ fontFamily: "'Aileron', sans-serif" }}>{metric}</p>
      <div className="flex items-center justify-between">
        <p className={`text-[12px] font-semibold ${positive ? 'text-white' : 'text-red-200'}`}
          style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 700 }}>
          {positive ? '↑' : '↓'} {Math.abs(variation)}%
        </p>
        {!isReal && (
          <span className="text-[9px] opacity-50 bg-white/10 px-1.5 py-0.5 rounded-full">simulado</span>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card branco ──────────────────────────────────────────────────────────

// SVG icons matching the dashboard screenshot exactly
const KPI_SVG_ICONS: Record<string, React.ReactNode> = {
  posts: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  aprovados: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  ),
  analise: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  rejeitados: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
};

function KPICard({ label, value, variation, iconKey, borderColor }: {
  label: string; value: number; variation: number; iconKey: string; borderColor: string;
}) {
  const positive = variation >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 flex-1 min-w-0 flex items-start justify-between border border-gray-100 shadow-sm">
      <div>
        <p className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-3"
          style={{ fontFamily: "'Aileron', sans-serif" }}>{label}</p>
        <p className="text-[36px] leading-none mb-2 text-gray-900"
          style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 900 }}>{value}</p>
        <p className={`text-[12px] font-semibold flex items-center gap-1 ${positive ? 'text-green-600' : 'text-red-500'}`}
          style={{ fontFamily: "'Aileron', sans-serif" }}>
          <span>{positive ? '↑' : '↓'}</span>
          <span>{positive ? '+' : ''}{Math.abs(variation)}% vs mês anterior</span>
        </p>
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: `${borderColor}18` }}
      >
        {KPI_SVG_ICONS[iconKey]}
      </div>
    </div>
  );
}

// ─── Funnel Step ──────────────────────────────────────────────────────────────

function FunnelStep({ icon, value, label, pct, color, isLast }: {
  icon: string; value: number; label: string; pct: number; color: string; isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-0">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2" style={{ background: `${color}15` }}>
          {icon}
        </div>
        <p className="text-[22px] font-bold text-gray-900"
          style={{ fontFamily: "'Aileron', sans-serif", fontWeight: 900 }}>{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color, fontFamily: "'Aileron', sans-serif", fontWeight: 700 }}>{label}</p>
        <p className="text-[11px] text-gray-400" style={{ fontFamily: "'Aileron', sans-serif" }}>{pct}%</p>
      </div>
      {!isLast && (
        <div className="flex items-center mx-3 mb-4">
          <div className="w-6 h-px bg-gray-200" />
          <svg width="8" height="12" viewBox="0 0 8 12" className="text-gray-300">
            <polyline points="0,0 8,6 0,12" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Banner "Conecte sua conta Meta" ─────────────────────────────────────────

function MetaConnectBanner() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shrink-0">
        🔵
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-blue-900">Conecte sua conta Meta para ver dados reais</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Instagram, Facebook e Ads — seguidores, engajamento, CPC, ROAS e mais.
        </p>
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

// ─── Tipos de dados Meta ──────────────────────────────────────────────────────

interface MetaInsights {
  totals: { fans: number; impressions: number; engagement: number; postEngagement: number; pageViews: number };
  chartData: { name: string; impressoes: number; engajamento: number }[];
}

// ─── Dados mock (fallback quando não há Meta conectado) ───────────────────────

const MOCK_ENGAGEMENT = [
  { name: 'Sem 1', instagram: 4200, facebook: 3100, tiktok: 5200 },
  { name: 'Sem 2', instagram: 4800, facebook: 3400, tiktok: 5800 },
  { name: 'Sem 3', instagram: 4500, facebook: 3200, tiktok: 6200 },
  { name: 'Sem 4', instagram: 5200, facebook: 3800, tiktok: 6800 },
  { name: 'Sem 5', instagram: 5800, facebook: 4200, tiktok: 7200 },
  { name: 'Sem 6', instagram: 6500, facebook: 4800, tiktok: 7800 },
];

const PERIOD_OPTIONS   = ['Hoje', 'Esta semana', 'Este mês', 'Últimos 30 dias', 'Últimos 3 meses'];
const PLATFORM_OPTIONS = ['Todas', 'Instagram', 'Facebook', 'YouTube', 'TikTok', 'LinkedIn'];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user }   = useAuth();
  const [period,   setPeriod]   = useState('Últimos 30 dias');
  const [platform, setPlatform] = useState('Todas');
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaInsights, setMetaInsights] = useState<MetaInsights | null>(null);
  const [syncingMeta,  setSyncingMeta]  = useState(false);

  const { data: posts      } = useUserCollection<Post>(user?.uid ?? null, 'posts',     [orderBy('createdAt', 'desc')]);
  const { data: aprovados  } = useUserCollection<Post>(user?.uid ?? null, 'aprovados');
  const { data: emAnalise  } = useUserCollection<Post>(user?.uid ?? null, 'emAnalise');
  const { data: rejeitados } = useUserCollection<Post>(user?.uid ?? null, 'rejeitados');
  const { data: contas     } = useUserCollection<ConnectedAccount>(user?.uid ?? null, 'connectedAccounts');

  // Conta Meta conectada (primeira encontrada)
  const metaConta = contas.find((c) => c.metaAccountId);
  const hasMetaConnected = !!metaConta;

  // ── Buscar insights reais da Meta ────────────────────────────────────────
  const fetchMetaInsights = useCallback(async () => {
    if (!user?.uid || !metaConta) return;
    setLoadingMeta(true);
    try {
      const apiPeriod = period === 'Esta semana' ? '7d' : period === 'Últimos 3 meses' ? '90d' : '30d';
      const res  = await fetch(`/api/meta/insights/${metaConta.id}?uid=${user.uid}&period=${apiPeriod}`);
      const data = await res.json() as MetaInsights & { error?: string };
      if (res.ok && !data.error) {
        setMetaInsights(data);
      }
    } catch {
      // silently fall back to mock
    } finally {
      setLoadingMeta(false);
    }
  }, [user?.uid, metaConta, period]);

  useEffect(() => {
    if (hasMetaConnected) fetchMetaInsights();
  }, [hasMetaConnected, fetchMetaInsights]);

  // ── Sync manual ───────────────────────────────────────────────────────────
  const handleSyncMeta = async () => {
    if (!user?.uid || !metaConta) return;
    setSyncingMeta(true);
    try {
      const res  = await fetch(`/api/meta/sync-account/${metaConta.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid }),
      });
      const data = await res.json() as { cached?: boolean; error?: string };
      if (res.ok) {
        await fetchMetaInsights();
        const msg = data.cached ? 'Dados já atualizados (cache 4h).' : '✅ Dados atualizados da Meta!';
        // inline toast via alert — ou showToast se preferir
        console.log(msg);
      }
    } finally {
      setSyncingMeta(false);
    }
  };

  // ── Dados dos KPI cards de plataforma ─────────────────────────────────────
  const platformKpis = PLATFORM_DISPLAY.map((p) => {
    const conta = contas.find((c) => c.platform === p.platform);
    return {
      ...p,
      value:    conta?.followers ?? (p.platform === 'instagram' ? 48200 : p.platform === 'facebook' ? 12400 : p.platform === 'youtube' ? 8900 : p.platform === 'tiktok' ? 22100 : 3600),
      variation: conta ? 0 : (p.platform === 'instagram' ? 1.8 : p.platform === 'facebook' ? 1.6 : p.platform === 'youtube' ? -0.5 : p.platform === 'tiktok' ? 8.4 : 2.1),
      isReal:   !!conta,
    };
  });

  // ── Funil com dados reais do Firestore ────────────────────────────────────
  const totalPosts = posts.length;
  const funnelSteps = [
    { icon: '✏️', value: totalPosts,         label: 'Criados',    pct: 100,                                                               color: '#FF5C00' },
    { icon: '📤', value: emAnalise.length,   label: 'Em Análise', pct: totalPosts > 0 ? Math.round((emAnalise.length / totalPosts) * 100) : 0, color: '#7C3AED' },
    { icon: '✅', value: aprovados.length,   label: 'Aprovados',  pct: totalPosts > 0 ? Math.round((aprovados.length / totalPosts) * 100) : 0, color: '#22C55E' },
    { icon: '❌', value: rejeitados.length,  label: 'Rejeitados', pct: totalPosts > 0 ? Math.round((rejeitados.length / totalPosts) * 100) : 0, color: '#EF4444' },
  ];

  // ── Gráfico de engajamento: real se Meta conectada, mock se não ───────────
  const engagementData = metaInsights?.chartData?.length
    ? metaInsights.chartData.map((d) => ({
        name:      d.name,
        instagram: d.engajamento,
        impressoes: d.impressoes,
      }))
    : MOCK_ENGAGEMENT;

  // ── Mix de plataformas baseado nos posts reais ────────────────────────────
  const mixColors: Record<string, string> = {
    instagram: '#E1306C', facebook: '#1877F2', youtube: '#FF0000',
    tiktok: '#010101', linkedin: '#0A66C2', threads: '#000000',
  };
  const mixRaw: Record<string, number> = {};
  posts.forEach((p) => (p.platforms ?? []).forEach((pl) => { mixRaw[pl] = (mixRaw[pl] ?? 0) + 1; }));
  const mixData = Object.keys(mixRaw).length > 0
    ? Object.entries(mixRaw).map(([name, value]) => ({ name, value, color: mixColors[name] ?? '#FF5C00' }))
    : [
        { name: 'Instagram', value: 45, color: '#E1306C' },
        { name: 'Facebook',  value: 25, color: '#1877F2' },
        { name: 'YouTube',   value: 15, color: '#FF0000' },
        { name: 'TikTok',    value: 10, color: '#010101' },
        { name: 'LinkedIn',  value: 5,  color: '#0A66C2' },
      ];

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Banner Meta (quando não conectado) */}
      {!hasMetaConnected && <MetaConnectBanner />}

      {/* Barra de filtros + botão Sync */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider">PERÍODO:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
          >
            {PERIOD_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider">PLATAFORMA:</label>
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-1.5 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
          >
            {PLATFORM_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        {hasMetaConnected && (
          <button
            onClick={handleSyncMeta}
            disabled={syncingMeta || loadingMeta}
            className="ml-auto flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {syncingMeta ? '🔄 Atualizando...' : '🔄 Atualizar da Meta'}
          </button>
        )}
      </div>

      {/* Cards de plataforma */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {platformKpis.map((p) => (
          <PlatformKPICard key={p.platform} {...p} />
        ))}
        <div className="rounded-2xl p-4 text-white flex-1 min-w-0" style={{ background: 'linear-gradient(135deg,#FF5C00 0%,#FFB800 100%)' }}>
          <p className="text-[11px] font-bold opacity-70 tracking-wider mb-2">🚀 TOTAL DE POSTS</p>
          <p className="text-[26px] font-bold leading-none mb-1">{posts.length}</p>
          <p className="text-[11px] opacity-70 uppercase tracking-wider mb-1">NO PERÍODO</p>
          <p className="text-[12px] font-semibold text-white">↑ real-time</p>
        </div>
      </div>

      {/* KPI Cards brancos */}
      <div className="flex gap-4">
        <KPICard label="Total de Posts"  value={posts.length}      variation={18}  iconKey="posts"      borderColor="#FF5C00" />
        <KPICard label="Aprovados"       value={aprovados.length}  variation={24}  iconKey="aprovados"  borderColor="#22C55E" />
        <KPICard label="Em Análise"      value={emAnalise.length}  variation={3}   iconKey="analise"    borderColor="#3B82F6" />
        <KPICard label="Rejeitados"      value={rejeitados.length} variation={-5}  iconKey="rejeitados" borderColor="#EF4444" />
      </div>

      {/* Insights Meta (quando conectado) */}
      {hasMetaConnected && metaInsights && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Fãs / Seguidores', value: metaInsights.totals.fans,           icon: '👥', color: '#1877F2' },
            { label: 'Impressões',        value: metaInsights.totals.impressions,    icon: '👁️', color: '#7C3AED' },
            { label: 'Engajamento',       value: metaInsights.totals.engagement,     icon: '❤️', color: '#EF4444' },
            { label: 'Eng. em Posts',     value: metaInsights.totals.postEngagement, icon: '💬', color: '#FF5C00' },
            { label: 'Visualizações',     value: metaInsights.totals.pageViews,      icon: '🔍', color: '#22C55E' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-center">
              <div className="text-2xl mb-1">{item.icon}</div>
              <p className="text-[20px] font-bold text-gray-900">{formatNum(item.value)}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{item.label}</p>
              <div className="w-full h-1 rounded-full mt-2" style={{ background: `${item.color}30` }}>
                <div className="h-1 rounded-full" style={{ width: '60%', background: item.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Funil de conteúdo */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Funil de Conteúdo</h3>
            <p className="text-[12px] text-gray-500">Ciclo de vida dos posts — dados reais</p>
          </div>
          <Link href="/workflow" className="text-[13px] font-semibold text-[#FF5C00] hover:underline">
            Ver Workflow →
          </Link>
        </div>
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {funnelSteps.map((step, i) => (
            <FunnelStep key={step.label} {...step} isLast={i === funnelSteps.length - 1} />
          ))}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-[15px] font-semibold text-gray-900">Engajamento por Plataforma</h3>
              <p className="text-[12px] text-gray-500 mb-4">
                {hasMetaConnected ? 'Dados reais da Meta API' : 'Dados simulados — conecte a Meta para dados reais'}
              </p>
            </div>
            {loadingMeta && <span className="text-xs text-blue-500 animate-pulse">Carregando...</span>}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={engagementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              {hasMetaConnected ? (
                <>
                  <Line type="monotone" dataKey="instagram"  stroke="#E1306C" strokeWidth={2} dot={{ r: 2 }} name="Engajamento" />
                  <Line type="monotone" dataKey="impressoes" stroke="#1877F2" strokeWidth={2} dot={{ r: 2 }} name="Impressões" />
                </>
              ) : (
                <>
                  <Line type="monotone" dataKey="instagram" stroke="#E1306C" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="facebook"  stroke="#1877F2" strokeWidth={2} dot={{ r: 2 }} />
                  <Line type="monotone" dataKey="tiktok"    stroke="#010101" strokeWidth={2} dot={{ r: 2 }} />
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Mix de Plataformas</h3>
          <p className="text-[12px] text-gray-500 mb-4">Distribuição de posts</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={mixData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {mixData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
