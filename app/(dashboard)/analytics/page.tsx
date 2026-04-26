'use client';

/**
 * Analytics & Inteligência — app/(dashboard)/analytics/page.tsx
 *
 * INSTALAÇÃO:
 *   Salve como: app/(dashboard)/analytics/page.tsx
 *
 * DADOS REAIS:
 *   • Posts       → users/{uid}/posts        (Firestore)
 *   • Contas      → users/{uid}/connectedAccounts (Firestore)
 *   • Campanhas   → users/{uid}/campanhas    (Firestore)
 *   • Meta Ads    → /api/meta/ads/{accountId} (API Route já existente)
 *   • Meta Insights → /api/meta/insights/{accountId} (API Route já existente)
 *
 * DEPENDÊNCIAS (já no package.json):
 *   recharts, lucide-react, date-fns
 */

import { useState, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie, Tooltip,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, Eye, Heart, Share2,
  FileText, CheckCircle, Clock, XCircle, BarChart2,
  ChevronDown, X, RefreshCw, Download, Filter, AlertCircle,
} from 'lucide-react';

import { useAuth }            from '@/lib/hooks/useAuth';
import { useUserCollection }  from '@/lib/hooks/useCollection';
import { useCollection }      from '@/lib/hooks/useCollection';
import { formatNumber, formatCurrency, formatPercent } from '@/lib/utils/formatters';
import { cn }                 from '@/lib/utils/cn';
import { orderBy }            from '@/lib/firebase/firestore';
import type { Post, ConnectedAccount, Campaign, Platform } from '@/lib/types';

/* ─── Constants ─────────────────────────────────────────────────── */

const PLATFORM_COLOR: Record<string, string> = {
  instagram:       '#E1306C',
  facebook:        '#1877F2',
  youtube:         '#FF0000',
  tiktok:          '#010101',
  linkedin:        '#0A66C2',
  threads:         '#000000',
  pinterest:       '#E60023',
  google_business: '#4285F4',
};

const PLATFORM_LABEL: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube',
  tiktok: 'TikTok', linkedin: 'LinkedIn', threads: 'Threads',
  pinterest: 'Pinterest', google_business: 'Google',
};

const STATUS_COLOR: Record<string, string> = {
  rascunho: '#9CA3AF', conteudo: '#7C3AED', revisao: '#F59E0B',
  aprovacao_cliente: '#3B82F6', aprovado: '#22C55E',
  rejeitado: '#EF4444', publicado: '#FF5C00', em_analise: '#F97316',
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho', conteudo: 'Conteúdo', revisao: 'Revisão',
  aprovacao_cliente: 'Aprovação', aprovado: 'Aprovado',
  rejeitado: 'Rejeitado', publicado: 'Publicado', em_analise: 'Em Análise',
};

const MONTHS_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const FORMAT_LABEL: Record<string, string> = {
  feed: 'Feed', story: 'Stories', reels: 'Reels', shorts: 'Shorts',
  photo: 'Foto', carrossel: 'Carrossel',
};

/* ─── Helpers ───────────────────────────────────────────────────── */

function tsToDate(ts: { seconds: number } | Date | null | undefined): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if ('seconds' in ts) return new Date(ts.seconds * 1000);
  return null;
}

function getMonthKey(ts: { seconds: number } | Date | null | undefined): string | null {
  const d = tsToDate(ts);
  if (!d) return null;
  return `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
}

function last6MonthKeys(): { key: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`, label: MONTHS_PT[d.getMonth()] ?? '' };
  });
}

/* ─── Sub-components ────────────────────────────────────────────── */

function KpiTile({
  label, value, sub, icon: Icon, color, trend, onClick,
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color: string; trend?: number;
  onClick?: () => void;
}) {
  const positive = (trend ?? 0) >= 0;
  return (
    <button
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-left w-full',
        'hover:shadow-md hover:-translate-y-0.5 transition-all duration-150',
        onClick && 'cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {trend !== undefined && (
          <span className={cn('text-xs font-semibold flex items-center gap-0.5', positive ? 'text-green-600' : 'text-red-500')}>
            {positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {positive ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-0.5">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </button>
  );
}

function SectionCard({ title, subtitle, children, action }: {
  title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-300 gap-2">
      <BarChart2 size={28} />
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  /* ── Firestore data ── */
  const { data: posts,    loading: loadingPosts }    = useUserCollection<Post>(uid, 'posts',             [orderBy('createdAt', 'desc')]);
  const { data: accounts, loading: loadingAccounts } = useUserCollection<ConnectedAccount>(uid, 'connectedAccounts');
  const { data: campaigns, loading: loadingCampaigns } = useUserCollection<Campaign>(uid, 'campanhas');

  /* ── UI state ── */
  const [period,       setPeriod]       = useState<'7d'|'30d'|'90d'>('30d');
  const [activeModal,  setActiveModal]  = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<Record<string, unknown>>({});

  const openModal = useCallback((id: string, payload: Record<string, unknown> = {}) => {
    setActiveModal(id);
    setModalPayload(payload);
  }, []);
  const closeModal = useCallback(() => setActiveModal(null), []);

  const loading = loadingPosts || loadingAccounts;

  /* ── Derived: Post KPIs ── */
  const postKpis = useMemo(() => {
    const total      = posts.length;
    const aprovado   = posts.filter(p => p.status === 'aprovado' || p.status === 'publicado').length;
    const emAnalise  = posts.filter(p => p.status === 'em_analise' || p.status === 'revisao' || p.status === 'aprovacao_cliente').length;
    const rejeitado  = posts.filter(p => p.status === 'rejeitado').length;
    const publicado  = posts.filter(p => p.status === 'publicado').length;
    const aprovRate  = total > 0 ? (aprovado / total) * 100 : 0;
    const rejRate    = total > 0 ? (rejeitado / total) * 100 : 0;

    // Period filter
    const now    = Date.now();
    const cutoff = now - (period === '7d' ? 7 : period === '30d' ? 30 : 90) * 86400000;
    const recent = posts.filter(p => {
      const d = tsToDate(p.createdAt);
      return d && d.getTime() > cutoff;
    });

    return { total, aprovado, emAnalise, rejeitado, publicado, aprovRate, rejRate, recent: recent.length };
  }, [posts, period]);

  /* ── Derived: Posts per month ── */
  const monthlyData = useMemo(() => {
    const months = last6MonthKeys();
    const byMonth: Record<string, { total: number; aprovado: number; rejeitado: number }> = {};
    months.forEach(m => { byMonth[m.key] = { total: 0, aprovado: 0, rejeitado: 0 }; });

    posts.forEach(p => {
      const k = getMonthKey(p.createdAt);
      if (k && byMonth[k]) {
        byMonth[k]!.total++;
        if (p.status === 'aprovado' || p.status === 'publicado') byMonth[k]!.aprovado++;
        if (p.status === 'rejeitado') byMonth[k]!.rejeitado++;
      }
    });

    return months.map(m => ({
      name: m.label,
      Total: byMonth[m.key]?.total ?? 0,
      Aprovados: byMonth[m.key]?.aprovado ?? 0,
      Rejeitados: byMonth[m.key]?.rejeitado ?? 0,
    }));
  }, [posts]);

  /* ── Derived: Platform mix ── */
  const platformMix = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => {
      (p.platforms ?? []).forEach(pl => {
        counts[pl] = (counts[pl] ?? 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([platform, count]) => ({
        platform,
        name: PLATFORM_LABEL[platform] ?? platform,
        count,
        color: PLATFORM_COLOR[platform] ?? '#9CA3AF',
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  /* ── Derived: Status distribution ── */
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return Object.entries(counts)
      .map(([status, count]) => ({
        status,
        name: STATUS_LABEL[status] ?? status,
        count,
        color: STATUS_COLOR[status] ?? '#9CA3AF',
        pct: posts.length > 0 ? (count / posts.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [posts]);

  /* ── Derived: Format performance ── */
  const formatPerf = useMemo(() => {
    const counts: Record<string, { total: number; aprovado: number }> = {};
    posts.forEach(p => {
      if (!p.format) return;
      if (!counts[p.format]) counts[p.format] = { total: 0, aprovado: 0 };
      counts[p.format]!.total++;
      if (p.status === 'aprovado' || p.status === 'publicado') counts[p.format]!.aprovado++;
    });
    return Object.entries(counts)
      .map(([fmt, v]) => ({
        format: fmt,
        name: FORMAT_LABEL[fmt] ?? fmt,
        total: v.total,
        aprovado: v.aprovado,
        taxaAprov: v.total > 0 ? Math.round((v.aprovado / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [posts]);

  /* ── Derived: Connected accounts KPIs ── */
  const accountKpis = useMemo(() => {
    const totalFollowers = accounts.reduce((s, a) => s + (a.followers ?? 0), 0);
    const avgEngagement  = accounts.length > 0
      ? accounts.reduce((s, a) => s + (a.engagement ?? 0), 0) / accounts.length
      : 0;
    const totalImpressions = accounts.reduce((s, a) => s + (a.impressions ?? 0), 0);
    const totalReach       = accounts.reduce((s, a) => s + (a.reach ?? 0), 0);
    return { totalFollowers, avgEngagement, totalImpressions, totalReach };
  }, [accounts]);

  /* ── Derived: Ads KPIs (from connectedAccounts.adsMetrics) ── */
  const adsKpis = useMemo(() => {
    const withAds = accounts.filter(a => a.adsMetrics);
    if (!withAds.length) return null;
    return {
      spend:       withAds.reduce((s, a) => s + (a.adsMetrics?.spend ?? 0), 0),
      clicks:      withAds.reduce((s, a) => s + (a.adsMetrics?.clicks ?? 0), 0),
      impressions: withAds.reduce((s, a) => s + (a.adsMetrics?.impressions ?? 0), 0),
      conversions: withAds.reduce((s, a) => s + (a.adsMetrics?.conversions ?? 0), 0),
      roas:        withAds.reduce((s, a) => s + (a.adsMetrics?.roas ?? 0), 0) / withAds.length,
      cpc:         withAds.reduce((s, a) => s + (a.adsMetrics?.cpc ?? 0), 0) / withAds.length,
    };
  }, [accounts]);

  /* ── Derived: Radar for platforms ── */
  const radarData = useMemo(() => {
    return accounts.slice(0, 6).map(a => ({
      platform: PLATFORM_LABEL[a.platform] ?? a.platform,
      Seguidores: Math.min(100, Math.round(((a.followers ?? 0) / Math.max(1, ...accounts.map(x => x.followers ?? 0))) * 100)),
      Engajamento: Math.min(100, Math.round((a.engagement ?? 0) * 10)),
      Posts: Math.min(100, Math.round(((a.posts ?? 0) / Math.max(1, ...accounts.map(x => x.posts ?? 0))) * 100)),
    }));
  }, [accounts]);

  /* ── Derived: campaign funnel ── */
  const campaignFunnel = useMemo(() => {
    const total     = campaigns.length;
    const ativa     = campaigns.filter(c => c.status === 'ativa').length;
    const concluida = campaigns.filter(c => c.status === 'concluida').length;
    const budget    = campaigns.reduce((s, c) => s + (c.budget ?? 0), 0);
    return { total, ativa, concluida, budget };
  }, [campaigns]);

  /* ── Recent posts list ── */
  const recentPosts = useMemo(() => posts.slice(0, 8), [posts]);

  /* ─────────────────────────────────────────────── Render ── */

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-100 rounded-xl w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-64 bg-gray-100 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics & Inteligência</h1>
          <p className="text-sm text-gray-400 mt-0.5">Visão completa do seu desempenho de conteúdo</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1 text-xs font-medium">
            {(['7d','30d','90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 rounded-lg transition-all', period === p ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Grid — Posts ── */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Produção de Conteúdo</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiTile label="Total de Posts" value={formatNumber(postKpis.total)} icon={FileText} color="#7C3AED"
            trend={postKpis.recent > 0 ? ((postKpis.recent / Math.max(1, postKpis.total)) * 100) : undefined}
            sub={`${postKpis.recent} no período`}
            onClick={() => openModal('posts-status', {})} />
          <KpiTile label="Aprovados" value={formatNumber(postKpis.aprovado)} icon={CheckCircle} color="#22C55E"
            trend={postKpis.aprovRate} sub={`${formatPercent(postKpis.aprovRate)} de aprovação`}
            onClick={() => openModal('posts-aprovados', {})} />
          <KpiTile label="Em Análise" value={formatNumber(postKpis.emAnalise)} icon={Clock} color="#F59E0B"
            onClick={() => openModal('posts-analise', {})} />
          <KpiTile label="Rejeitados" value={formatNumber(postKpis.rejeitado)} icon={XCircle} color="#EF4444"
            trend={-postKpis.rejRate}
            onClick={() => openModal('posts-rejeitados', {})} />
          <KpiTile label="Publicados" value={formatNumber(postKpis.publicado)} icon={Share2} color="#FF5C00"
            onClick={() => openModal('posts-publicados', {})} />
        </div>
      </div>

      {/* ── KPI Grid — Contas ── */}
      {accounts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Redes Conectadas</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiTile label="Total de Seguidores" value={formatNumber(accountKpis.totalFollowers)} icon={Users} color="#0A66C2"
              onClick={() => openModal('accounts-detail', {})} />
            <KpiTile label="Engaj. Médio" value={formatPercent(accountKpis.avgEngagement)} icon={Heart} color="#E1306C"
              onClick={() => openModal('accounts-detail', {})} />
            <KpiTile label="Impressões" value={formatNumber(accountKpis.totalImpressions)} icon={Eye} color="#7C3AED"
              sub="Meta acumulado" onClick={() => openModal('accounts-detail', {})} />
            <KpiTile label="Alcance" value={formatNumber(accountKpis.totalReach)} icon={TrendingUp} color="#22C55E"
              onClick={() => openModal('accounts-detail', {})} />
          </div>
        </div>
      )}

      {/* ── KPI Grid — Ads ── */}
      {adsKpis && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tráfego Pago (Meta)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiTile label="Investido" value={formatCurrency(adsKpis.spend)} icon={BarChart2} color="#1877F2" />
            <KpiTile label="Cliques" value={formatNumber(adsKpis.clicks)} icon={TrendingUp} color="#7C3AED" />
            <KpiTile label="Impressões" value={formatNumber(adsKpis.impressions)} icon={Eye} color="#9CA3AF" />
            <KpiTile label="Conversões" value={formatNumber(adsKpis.conversions)} icon={CheckCircle} color="#22C55E" />
            <KpiTile label="ROAS" value={`${adsKpis.roas.toFixed(2)}x`} icon={TrendingUp} color="#FF5C00" />
            <KpiTile label="CPC Médio" value={formatCurrency(adsKpis.cpc)} icon={BarChart2} color="#F59E0B" />
          </div>
        </div>
      )}

      {/* ── Charts Row 1 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Posts por mês */}
        <SectionCard title="Posts por Mês" subtitle="Criados nos últimos 6 meses">
          {monthlyData.every(m => m.Total === 0) ? (
            <EmptyChart message="Nenhum post criado ainda" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Total" fill="#7C3AED" radius={[4,4,0,0]} />
                <Bar dataKey="Aprovados" fill="#22C55E" radius={[4,4,0,0]} />
                <Bar dataKey="Rejeitados" fill="#EF4444" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Mix de plataformas */}
        <SectionCard title="Mix de Plataformas" subtitle="Distribuição de posts por rede">
          {platformMix.length === 0 ? (
            <EmptyChart message="Nenhum post com plataforma definida" />
          ) : (
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={platformMix} dataKey="count" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {platformMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {platformMix.map((p) => (
                  <div key={p.platform} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-xs text-gray-600 flex-1">{p.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{p.count}</span>
                    <span className="text-[10px] text-gray-400">
                      {posts.length > 0 ? formatPercent((p.count / posts.length) * 100, 0) : '0%'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* ── Charts Row 2 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Distribuição de status */}
        <SectionCard title="Status dos Posts" subtitle="Distribuição atual">
          {statusDist.length === 0 ? (
            <EmptyChart message="Nenhum post" />
          ) : (
            <div className="space-y-2.5">
              {statusDist.map(s => (
                <div key={s.status}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{s.name}</span>
                    <span className="text-xs font-semibold text-gray-900">{s.count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Performance por formato */}
        <SectionCard title="Por Formato" subtitle="Taxa de aprovação por tipo">
          {formatPerf.length === 0 ? (
            <EmptyChart message="Nenhum formato identificado" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={formatPerf} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
                <Bar dataKey="total" name="Total" fill="#E5E7EB" radius={[0,4,4,0]} />
                <Bar dataKey="aprovado" name="Aprovados" fill="#22C55E" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* Radar de contas / campanhas */}
        <SectionCard title="Radar de Plataformas" subtitle="Comparativo das contas conectadas">
          {radarData.length === 0 ? (
            <EmptyChart message="Conecte ao menos uma conta" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={70}>
                <PolarGrid stroke="#f3f4f6" />
                <PolarAngleAxis dataKey="platform" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="Seguidores" dataKey="Seguidores" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.15} />
                <Radar name="Engaj." dataKey="Engajamento" stroke="#E1306C" fill="#E1306C" fillOpacity={0.15} />
                <Radar name="Posts" dataKey="Posts" stroke="#FF5C00" fill="#FF5C00" fillOpacity={0.1} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ borderRadius: 10, border: 'none', fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </SectionCard>
      </div>

      {/* ── Contas conectadas ── */}
      {accounts.length > 0 && (
        <SectionCard title="Contas Conectadas" subtitle={`${accounts.length} conta(s) ativa(s)`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Plataforma</th>
                  <th className="text-right pb-2 font-medium">Seguidores</th>
                  <th className="text-right pb-2 font-medium">Engajamento</th>
                  <th className="text-right pb-2 font-medium">Impressões</th>
                  <th className="text-right pb-2 font-medium">Alcance</th>
                  <th className="text-right pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ background: PLATFORM_COLOR[a.platform] ?? '#9CA3AF' }}>
                          {(PLATFORM_LABEL[a.platform] ?? a.platform).slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{a.name || PLATFORM_LABEL[a.platform]}</p>
                          {a.handle && <p className="text-gray-400 text-[10px]">@{a.handle}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">{formatNumber(a.followers ?? 0)}</td>
                    <td className="py-2.5 text-right">
                      <span className={cn('font-semibold', (a.engagement ?? 0) > 3 ? 'text-green-600' : 'text-gray-500')}>
                        {formatPercent(a.engagement ?? 0)}
                      </span>
                    </td>
                    <td className="py-2.5 text-right text-gray-500">{a.impressions ? formatNumber(a.impressions) : '—'}</td>
                    <td className="py-2.5 text-right text-gray-500">{a.reach ? formatNumber(a.reach) : '—'}</td>
                    <td className="py-2.5 text-right">
                      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold',
                        a.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Ads metrics table ── */}
      {accounts.some(a => a.adsMetrics) && (
        <SectionCard title="Métricas de Anúncios (Meta)" subtitle="Dados sincronizados via Meta Ads API">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Conta</th>
                  <th className="text-right pb-2 font-medium">Investido</th>
                  <th className="text-right pb-2 font-medium">Cliques</th>
                  <th className="text-right pb-2 font-medium">CPC</th>
                  <th className="text-right pb-2 font-medium">CPM</th>
                  <th className="text-right pb-2 font-medium">CTR</th>
                  <th className="text-right pb-2 font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {accounts.filter(a => a.adsMetrics).map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-900">{a.name || PLATFORM_LABEL[a.platform]}</td>
                    <td className="py-2.5 text-right">{formatCurrency(a.adsMetrics!.spend)}</td>
                    <td className="py-2.5 text-right">{formatNumber(a.adsMetrics!.clicks)}</td>
                    <td className="py-2.5 text-right">{formatCurrency(a.adsMetrics!.cpc)}</td>
                    <td className="py-2.5 text-right">{formatCurrency(a.adsMetrics!.cpm)}</td>
                    <td className="py-2.5 text-right">{formatPercent(a.adsMetrics!.ctr)}</td>
                    <td className="py-2.5 text-right">
                      <span className={cn('font-semibold', (a.adsMetrics!.roas ?? 0) >= 2 ? 'text-green-600' : 'text-orange-500')}>
                        {(a.adsMetrics!.roas ?? 0).toFixed(2)}x
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 flex items-center gap-1">
            <RefreshCw size={10} /> Sincronize as contas na página Contas para atualizar os dados de anúncios.
          </p>
        </SectionCard>
      )}

      {/* ── Campanhas ── */}
      {campaigns.length > 0 && (
        <SectionCard title="Campanhas" subtitle={`${campaignFunnel.total} total · ${campaignFunnel.ativa} ativa(s)`}>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{campaignFunnel.ativa}</p>
              <p className="text-xs text-blue-500 mt-0.5">Ativas</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{campaignFunnel.concluida}</p>
              <p className="text-xs text-green-500 mt-0.5">Concluídas</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(campaignFunnel.budget)}</p>
              <p className="text-xs text-orange-500 mt-0.5">Budget total</p>
            </div>
          </div>
          <div className="space-y-2">
            {campaigns.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color ?? '#9CA3AF' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-[10px] text-gray-400">{c.platforms?.map(p => PLATFORM_LABEL[p]).join(', ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-gray-900">{formatCurrency(c.budget ?? 0)}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    c.status === 'ativa' ? 'bg-green-100 text-green-700' :
                    c.status === 'concluida' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700')}>
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Posts recentes ── */}
      <SectionCard title="Posts Recentes" subtitle="Últimos criados">
        {recentPosts.length === 0 ? (
          <EmptyChart message="Nenhum post criado ainda" />
        ) : (
          <div className="space-y-2">
            {recentPosts.map(p => {
              const thumb = p.creatives?.[0]?.url;
              const platform = p.platforms?.[0];
              const d = tsToDate(p.createdAt);
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {thumb
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">🖼️</div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{p.title}</p>
                    <p className="text-[10px] text-gray-400">
                      {platform ? (PLATFORM_LABEL[platform] ?? platform) : '—'}
                      {d ? ` · ${MONTHS_PT[d.getMonth()]} ${d.getDate()}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0"
                    style={{ background: `${STATUS_COLOR[p.status]}18`, color: STATUS_COLOR[p.status] }}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* ── Empty state se sem dados ── */}
      {posts.length === 0 && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <BarChart2 size={28} className="text-gray-300" />
          </div>
          <h3 className="text-sm font-semibold text-gray-700 mb-1">Nenhum dado ainda</h3>
          <p className="text-xs text-gray-400 max-w-xs">
            Crie posts e conecte suas contas de redes sociais para visualizar Analytics aqui.
          </p>
        </div>
      )}

      {/* ── Modals ── */}

      {activeModal === 'posts-status' && (
        <Modal title="Distribuição de Status" onClose={closeModal}>
          <div className="space-y-3">
            {statusDist.map(s => (
              <div key={s.status} className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: `${s.color}10` }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-medium text-gray-800">{s.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{s.count}</p>
                  <p className="text-xs text-gray-400">{formatPercent(s.pct)}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {(activeModal === 'posts-aprovados' || activeModal === 'posts-rejeitados' ||
        activeModal === 'posts-analise'  || activeModal === 'posts-publicados') && (
        <Modal
          title={activeModal === 'posts-aprovados' ? 'Posts Aprovados' : activeModal === 'posts-rejeitados' ? 'Posts Rejeitados' : activeModal === 'posts-analise' ? 'Em Análise' : 'Posts Publicados'}
          onClose={closeModal}
        >
          <div className="space-y-2">
            {posts.filter(p => {
              if (activeModal === 'posts-aprovados') return p.status === 'aprovado' || p.status === 'publicado';
              if (activeModal === 'posts-rejeitados') return p.status === 'rejeitado';
              if (activeModal === 'posts-analise')  return p.status === 'em_analise' || p.status === 'revisao' || p.status === 'aprovacao_cliente';
              if (activeModal === 'posts-publicados') return p.status === 'publicado';
              return false;
            }).slice(0, 20).map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
                <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {p.creatives?.[0]?.url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={p.creatives[0].url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px]">🖼️</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{p.title}</p>
                  <p className="text-[10px] text-gray-400">{p.platforms?.map(pl => PLATFORM_LABEL[pl]).join(', ')}</p>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {activeModal === 'accounts-detail' && (
        <Modal title="Detalhes das Contas" onClose={closeModal}>
          <div className="space-y-3">
            {accounts.map(a => (
              <div key={a.id} className="p-3 rounded-xl border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg text-white text-[11px] font-bold flex items-center justify-center"
                      style={{ background: PLATFORM_COLOR[a.platform] ?? '#9CA3AF' }}>
                      {(PLATFORM_LABEL[a.platform] ?? '?').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{a.name || PLATFORM_LABEL[a.platform]}</p>
                      {a.handle && <p className="text-[10px] text-gray-400">@{a.handle}</p>}
                    </div>
                  </div>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold',
                    a.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {a.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-gray-900">{formatNumber(a.followers ?? 0)}</p>
                    <p className="text-[10px] text-gray-400">Seguidores</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-gray-900">{formatPercent(a.engagement ?? 0)}</p>
                    <p className="text-[10px] text-gray-400">Engaj.</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs font-bold text-gray-900">{a.posts ?? 0}</p>
                    <p className="text-[10px] text-gray-400">Posts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

    </div>
  );
}
