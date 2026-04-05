'use client';

import { useState }            from 'react';
import Link                    from 'next/link';
import { useAuth }             from '@/lib/hooks/useAuth';
import { useUserCollection }   from '@/lib/hooks/useCollection';
import { orderBy }             from 'firebase/firestore';
import type { Post, Platform } from '@/lib/types';

// ─── Platform KPI Card ────────────────────────────────────────────────────────
const PLATFORM_DATA: {
  platform: Platform;
  prefix: string;
  label: string;
  metric: string;
  gradient: string;
  value: number;
  variation: number;
}[] = [
  { platform: 'instagram', prefix: 'IG', label: 'INSTAGRAM', metric: 'SEGUIDORES', gradient: 'linear-gradient(135deg,#833AB4 0%,#FD1D1D 50%,#F77737 100%)', value: 48200, variation: 1.8 },
  { platform: 'facebook',  prefix: 'FB', label: 'FACEBOOK',  metric: 'CURTIDAS',   gradient: 'linear-gradient(135deg,#1877F2 0%,#0C5FD6 100%)',             value: 12400, variation: 1.6 },
  { platform: 'youtube',   prefix: 'YT', label: 'YOUTUBE',   metric: 'INSCRITOS',  gradient: 'linear-gradient(135deg,#FF0000 0%,#CC0000 100%)',             value: 8900,  variation: -0.5 },
  { platform: 'tiktok',    prefix: 'TT', label: 'TIKTOK',    metric: 'SEGUIDORES', gradient: 'linear-gradient(135deg,#006994 0%,#00CED1 50%,#40E0D0 100%)', value: 22100, variation: 8.4 },
  { platform: 'linkedin',  prefix: 'LI', label: 'LINKEDIN',  metric: 'CONEXÕES',   gradient: 'linear-gradient(135deg,#0A66C2 0%,#004182 100%)',             value: 3600,  variation: 2.1 },
];

function formatNum(n: number) {
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000)    return `${(n/1000).toFixed(1)}K`;
  return String(n);
}

function PlatformKPICard({ prefix, label, metric, gradient, value, variation }: typeof PLATFORM_DATA[0]) {
  const positive = variation >= 0;
  return (
    <div
      className="rounded-2xl p-4 text-white flex-1 min-w-0"
      style={{ background: gradient }}
    >
      <p className="text-[11px] font-bold opacity-70 tracking-wider mb-2">
        {prefix} {label}
      </p>
      <p className="text-[26px] font-bold leading-none mb-1">{formatNum(value)}</p>
      <p className="text-[11px] opacity-70 uppercase tracking-wider mb-1">{metric}</p>
      <p className={`text-[12px] font-semibold ${positive ? 'text-white' : 'text-red-200'}`}>
        {positive ? '↑' : '↓'} {Math.abs(variation)}%
      </p>
    </div>
  );
}

// ─── KPI Card (white) ─────────────────────────────────────────────────────────
function KPICard({
  label, value, variation, icon, borderColor,
}: {
  label: string; value: number; variation: number; icon: string; borderColor: string;
}) {
  const positive = variation >= 0;
  return (
    <div className="bg-white rounded-2xl p-5 flex-1 min-w-0 flex items-center justify-between border border-gray-100 shadow-sm">
      <div>
        <p className="text-[12px] text-gray-500 uppercase tracking-wider font-medium mb-2">{label}</p>
        <p className="text-[32px] font-bold text-gray-900 leading-none mb-1">{value}</p>
        <p className={`text-[12px] font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
          {positive ? '↑' : '↓'} {Math.abs(variation)}% vs mês anterior
        </p>
      </div>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `${borderColor}15` }}
      >
        {icon}
      </div>
    </div>
  );
}

// ─── Funnel Step ──────────────────────────────────────────────────────────────
function FunnelStep({
  icon, value, label, pct, color, isLast,
}: {
  icon: string; value: number; label: string; pct: number; color: string; isLast: boolean;
}) {
  return (
    <div className="flex items-center gap-0">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl mb-2" style={{ background: `${color}15` }}>
          {icon}
        </div>
        <p className="text-[22px] font-bold text-gray-900">{value}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</p>
        <p className="text-[11px] text-gray-400">{pct}%</p>
      </div>
      {!isLast && (
        <div className="flex items-center mx-3 mb-4">
          <div className="w-6 h-px bg-gray-200"/>
          <svg width="8" height="12" viewBox="0 0 8 12" className="text-gray-300">
            <polyline points="0,0 8,6 0,12" fill="none" stroke="currentColor" strokeWidth="1.5"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ─── Filters ──────────────────────────────────────────────────────────────────
const PERIOD_OPTIONS  = ['Hoje','Esta semana','Este mês','Últimos 30 dias','Últimos 3 meses'];
const PLATFORM_OPTIONS= ['Todas','Instagram','Facebook','YouTube','TikTok','LinkedIn'];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user }    = useAuth();
  const [period,    setPeriod]    = useState('Últimos 30 dias');
  const [platform,  setPlatform]  = useState('Todas');

  const { data: posts     } = useUserCollection<Post>(user?.uid ?? null, 'posts',     [orderBy('createdAt','desc')]);
  const { data: aprovados } = useUserCollection<Post>(user?.uid ?? null, 'aprovados');
  const { data: emAnalise } = useUserCollection<Post>(user?.uid ?? null, 'emAnalise');
  const { data: rejeitados} = useUserCollection<Post>(user?.uid ?? null, 'rejeitados');

  const funnelSteps = [
    { icon: '✏️', value: 48, label: 'Criados',    pct: 100, color: '#FF5C00' },
    { icon: '📤', value: 42, label: 'Enviados',   pct: 87,  color: '#7C3AED' },
    { icon: '👁️', value: 38, label: 'Revisão',    pct: 79,  color: '#3B82F6' },
    { icon: '✅', value: 35, label: 'Aprovados',  pct: 73,  color: '#22C55E' },
    { icon: '🚀', value: 30, label: 'Publicados', pct: 62,  color: '#F59E0B' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Filters row */}
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
      </div>

      {/* Platform KPI cards — horizontal row */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {PLATFORM_DATA.map((p) => (
          <PlatformKPICard key={p.platform} {...p} />
        ))}
        {/* Total posts card */}
        <div className="rounded-2xl p-4 text-white flex-1 min-w-0" style={{ background: 'linear-gradient(135deg,#FF5C00 0%,#FFB800 100%)' }}>
          <p className="text-[11px] font-bold opacity-70 tracking-wider mb-2">🚀 TOTAL DE POSTS</p>
          <p className="text-[26px] font-bold leading-none mb-1">{posts.length}</p>
          <p className="text-[11px] opacity-70 uppercase tracking-wider mb-1">ESTE MÊS</p>
          <p className="text-[12px] font-semibold text-white">↑ 18%</p>
        </div>
      </div>

      {/* White KPI cards */}
      <div className="flex gap-4">
        <KPICard label="Total de Posts"  value={posts.length}      variation={18}  icon="📋" borderColor="#FF5C00" />
        <KPICard label="Aprovados"       value={aprovados.length}  variation={24}  icon="✅" borderColor="#22C55E" />
        <KPICard label="Em Análise"      value={emAnalise.length}  variation={3}   icon="⏳" borderColor="#F59E0B" />
        <KPICard label="Rejeitados"      value={rejeitados.length} variation={-5}  icon="❌" borderColor="#EF4444" />
      </div>

      {/* Funnel */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-[15px] font-semibold text-gray-900">Funil de Conteúdo</h3>
            <p className="text-[12px] text-gray-500">Ciclo de vida dos posts</p>
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

      {/* Charts placeholder row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Engajamento por Plataforma</h3>
          <p className="text-[12px] text-gray-500 mb-4">Crescimento mensal</p>
          <div className="h-48 flex items-center justify-center text-gray-300 bg-gray-50 rounded-xl">
            <p className="text-sm">Gráfico de linha</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-[15px] font-semibold text-gray-900 mb-1">Mix de Plataformas</h3>
          <p className="text-[12px] text-gray-500 mb-4">Distribuição de posts</p>
          <div className="h-48 flex items-center justify-center text-gray-300 bg-gray-50 rounded-xl">
            <p className="text-sm">Gráfico donut</p>
          </div>
        </div>
      </div>
    </div>
  );
}
