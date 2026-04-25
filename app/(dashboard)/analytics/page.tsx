'use client';

import { useState, useMemo }     from 'react';
import { useAuth }               from '@/lib/hooks/useAuth';
import { useUserCollection }     from '@/lib/hooks/useCollection';
import { orderBy }               from 'firebase/firestore';
import { cn }                    from '@/lib/utils/cn';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area,
} from 'recharts';
import type { Post, ConnectedAccount } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse bg-gray-100 rounded-xl', className)} />
  );
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: <span className="font-bold">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, variation, icon, color, sublabel, loading,
}: {
  label: string; value: string; variation?: number; icon: string;
  color: string; sublabel?: string; loading?: boolean;
}) {
  if (loading) return <Skeleton className="h-32" />;
  const positive = (variation ?? 0) >= 0;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}18` }}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[32px] font-black text-gray-900 leading-none" style={{ fontFamily: "'Aileron', sans-serif" }}>
          {value}
        </p>
        {sublabel && <p className="text-[11px] text-gray-400 mt-1">{sublabel}</p>}
      </div>
      {variation !== undefined && (
        <p className={cn('text-[12px] font-semibold flex items-center gap-1', positive ? 'text-green-600' : 'text-red-500')}>
          <span>{positive ? '↑' : '↓'}</span>
          <span>{Math.abs(variation)}% vs mês anterior</span>
        </p>
      )}
    </div>
  );
}

// ─── Heatmap de Horários ──────────────────────────────────────────────────────

const HOURS   = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`);
const DAYS    = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Mock engagement data por hora/dia (simulado — substituível por dados reais)
function generateHeatmapData() {
  const data: number[][] = [];
  for (let d = 0; d < 7; d++) {
    const row: number[] = [];
    for (let h = 0; h < 24; h++) {
      // Picos: manhã (8-11), almoço (12-14), noite (19-21)
      let base = 0;
      if (h >= 8  && h <= 11) base = 60 + Math.random() * 40;
      else if (h >= 12 && h <= 14) base = 50 + Math.random() * 35;
      else if (h >= 19 && h <= 21) base = 70 + Math.random() * 30;
      else if (h >= 22 || h <= 6)  base = Math.random() * 15;
      else base = 15 + Math.random() * 30;
      // Fim de semana reduz B2B mas mantém lifestyle
      if (d === 0 || d === 6) base *= 0.75;
      row.push(Math.round(base));
    }
    data.push(row);
  }
  return data;
}

const HEATMAP_DATA = generateHeatmapData();

function HeatmapCell({ value }: { value: number }) {
  const intensity = value / 100;
  const bg = intensity > 0.7
    ? `rgba(255, 92, 0, ${0.5 + intensity * 0.5})`
    : intensity > 0.4
    ? `rgba(255, 184, 0, ${0.3 + intensity * 0.5})`
    : `rgba(229, 231, 235, ${0.3 + intensity * 0.7})`;

  return (
    <div
      className="rounded-sm transition-all duration-200 hover:scale-110 cursor-pointer relative group"
      style={{ background: bg, width: '100%', paddingBottom: '100%' }}
      title={`Engajamento: ${value}%`}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[8px] font-bold text-white drop-shadow">{value}%</span>
      </div>
    </div>
  );
}

function EngagementHeatmap() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Heatmap de Engajamento</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">Intensidade de atividade por hora e dia da semana</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-200" />
            <span>Baixo</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-amber-400" />
            <span>Médio</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-[#FF5C00]" />
            <span>Alto</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: 640 }}>
          {/* Header horas */}
          <div className="flex mb-1">
            <div style={{ width: 36 }} />
            {HOURS.map((h, i) => (
              <div key={h} className="flex-1 text-center text-[8px] text-gray-300 font-medium">
                {i % 3 === 0 ? h : ''}
              </div>
            ))}
          </div>

          {/* Rows */}
          {DAYS.map((day, d) => (
            <div key={day} className="flex items-center mb-1 gap-1">
              <div className="text-[10px] text-gray-400 font-medium text-right" style={{ width: 28 }}>
                {day}
              </div>
              <div className="flex flex-1 gap-0.5">
                {HEATMAP_DATA[d].map((val, h) => (
                  <div key={h} className="flex-1">
                    <HeatmapCell value={val} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sugestão de horário */}
      <div className="mt-4 flex items-center gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
        <span className="text-xl">⭐</span>
        <div>
          <p className="text-[12px] font-bold text-orange-800">Melhor janela de postagem</p>
          <p className="text-[11px] text-orange-600">Terça a Quinta, das 19h às 21h — maior density de engajamento</p>
        </div>
        <button className="ml-auto text-[11px] font-semibold text-[#FF5C00] hover:underline whitespace-nowrap">
          Aplicar ao agendamento →
        </button>
      </div>
    </div>
  );
}

// ─── Funil de Conversão ───────────────────────────────────────────────────────

function ConversionFunnel({ posts, aprovados, emAnalise, rejeitados }: {
  posts: Post[]; aprovados: Post[]; emAnalise: Post[]; rejeitados: Post[];
}) {
  const total = posts.length || 1;

  const steps = [
    { label: 'Posts Criados',   value: posts.length,      color: '#FF5C00', icon: '✏️',  desc: 'Total de conteúdos produzidos' },
    { label: 'Em Análise',      value: emAnalise.length,  color: '#7C3AED', icon: '🔍',  desc: 'Aguardando revisão ou aprovação' },
    { label: 'Aprovados',       value: aprovados.length,  color: '#22C55E', icon: '✅',  desc: 'Aprovados pelo cliente' },
    { label: 'Rejeitados',      value: rejeitados.length, color: '#EF4444', icon: '❌',  desc: 'Necessitam revisão' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-5">
        <h3 className="text-[15px] font-bold text-gray-900">Funil de Aprovação</h3>
        <p className="text-[12px] text-gray-400 mt-0.5">Conversão de conteúdo em cada etapa do workflow</p>
      </div>

      <div className="space-y-3">
        {steps.map((step, i) => {
          const pct = Math.round((step.value / total) * 100);
          const dropoff = i > 0 ? Math.round(((steps[i-1].value - step.value) / Math.max(steps[i-1].value, 1)) * 100) : 0;
          return (
            <div key={step.label}>
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-lg w-7 text-center">{step.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-semibold text-gray-800">{step.label}</span>
                    <div className="flex items-center gap-3">
                      {i > 0 && dropoff > 0 && (
                        <span className="text-[11px] text-red-400 font-medium">-{dropoff}% drop-off</span>
                      )}
                      <span className="text-[13px] font-bold" style={{ color: step.color }}>{step.value}</span>
                      <span className="text-[11px] text-gray-400 w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: step.color }}
                    />
                  </div>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="ml-10 text-[10px] text-gray-300 pl-3 border-l border-gray-100 py-0.5">
                  {step.desc}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Taxa de aprovação */}
      <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Taxa de Aprovação</p>
          <p className="text-[28px] font-black text-green-600 leading-tight">
            {posts.length > 0 ? Math.round((aprovados.length / posts.length) * 100) : 0}%
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Taxa de Rejeição</p>
          <p className="text-[28px] font-black text-red-500 leading-tight">
            {posts.length > 0 ? Math.round((rejeitados.length / posts.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── ROI Calculator ───────────────────────────────────────────────────────────

function ROICalculator() {
  const [revenue,  setRevenue]  = useState(15000);
  const [adSpend,  setAdSpend]  = useState(3000);
  const [creative, setCreative] = useState(1500);
  const [hours,    setHours]    = useState(20);
  const [hourRate, setHourRate] = useState(150);
  const [mode,     setMode]     = useState<'organico' | 'pago'>('pago');

  const totalCost = adSpend + creative + hours * hourRate;
  const roi       = totalCost > 0 ? ((revenue - totalCost) / totalCost) * 100 : 0;
  const roas      = adSpend > 0 ? revenue / adSpend : 0;
  const cpa       = revenue > 0 ? totalCost / (revenue / 500) : 0; // estimativa

  const roiColor = roi >= 100 ? '#22C55E' : roi >= 0 ? '#FFB800' : '#EF4444';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Calculadora de ROI</h3>
          <p className="text-[12px] text-gray-400 mt-0.5">Retorno sobre investimento em marketing social</p>
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {(['organico', 'pago'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                mode === m ? 'bg-white text-[#FF5C00] shadow-sm' : 'text-gray-400 hover:text-gray-600'
              )}
            >
              {m === 'organico' ? '🌱 Orgânico' : '💰 Pago'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Receita Atribuída (R$)
          </label>
          <input
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
          />
        </div>
        {mode === 'pago' && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Investimento em Mídia (R$)
            </label>
            <input
              type="number"
              value={adSpend}
              onChange={(e) => setAdSpend(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
            />
          </div>
        )}
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Custo Criativo (R$)
          </label>
          <input
            type="number"
            value={creative}
            onChange={(e) => setCreative(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Horas de Gestão × Taxa/h
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              className="w-1/2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
              placeholder="Horas"
            />
            <input
              type="number"
              value={hourRate}
              onChange={(e) => setHourRate(Number(e.target.value))}
              className="w-1/2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
              placeholder="R$/h"
            />
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Investimento Total</p>
          <p className="text-[20px] font-black text-gray-900">{fmtCurrency(totalCost)}</p>
        </div>
        <div className="rounded-xl p-4 text-center" style={{ background: `${roiColor}12` }}>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: roiColor }}>ROI</p>
          <p className="text-[24px] font-black" style={{ color: roiColor }}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
          </p>
        </div>
        {mode === 'pago' ? (
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">ROAS</p>
            <p className="text-[20px] font-black text-blue-700">{roas.toFixed(1)}x</p>
          </div>
        ) : (
          <div className="bg-purple-50 rounded-xl p-4 text-center">
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">Lucro Líquido</p>
            <p className="text-[20px] font-black text-purple-700">{fmtCurrency(revenue - totalCost)}</p>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-300 mt-3 text-center">
        Fórmula: ROI = (Receita − Investimento Total) / Investimento Total × 100
      </p>
    </div>
  );
}

// ─── Radar de Plataformas ──────────────────────────────────────────────────────

const MOCK_RADAR_DATA = [
  { metric: 'Alcance',     instagram: 90, facebook: 60, tiktok: 80, linkedin: 40 },
  { metric: 'Engajamento', instagram: 75, facebook: 55, tiktok: 95, linkedin: 65 },
  { metric: 'Conversão',   instagram: 60, facebook: 70, tiktok: 45, linkedin: 85 },
  { metric: 'Crescimento', instagram: 65, facebook: 40, tiktok: 90, linkedin: 55 },
  { metric: 'CTR',         instagram: 55, facebook: 65, tiktok: 70, linkedin: 75 },
  { metric: 'Retenção',    instagram: 70, facebook: 50, tiktok: 85, linkedin: 60 },
];

function PlatformRadar() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-gray-900">Performance por Plataforma</h3>
        <p className="text-[12px] text-gray-400 mt-0.5">Comparativo multidimensional de métricas</p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={MOCK_RADAR_DATA}>
          <PolarGrid stroke="#f0f0f0" />
          <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
          <Radar name="Instagram" dataKey="instagram" stroke="#E1306C" fill="#E1306C" fillOpacity={0.15} strokeWidth={2} />
          <Radar name="TikTok"    dataKey="tiktok"    stroke="#00CED1" fill="#00CED1" fillOpacity={0.15} strokeWidth={2} />
          <Radar name="LinkedIn"  dataKey="linkedin"  stroke="#0A66C2" fill="#0A66C2" fillOpacity={0.15} strokeWidth={2} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
      <p className="text-[10px] text-gray-300 text-center mt-2">Dados simulados — conecte contas para dados reais</p>
    </div>
  );
}

// ─── Tendência de Posts ────────────────────────────────────────────────────────

const MOCK_TREND = [
  { mes: 'Jan', criados: 12, aprovados: 8,  rejeitados: 2 },
  { mes: 'Fev', criados: 18, aprovados: 14, rejeitados: 3 },
  { mes: 'Mar', criados: 15, aprovados: 11, rejeitados: 1 },
  { mes: 'Abr', criados: 22, aprovados: 18, rejeitados: 4 },
  { mes: 'Mai', criados: 20, aprovados: 16, rejeitados: 2 },
  { mes: 'Jun', criados: 28, aprovados: 24, rejeitados: 3 },
];

function PostTrend({ posts, aprovados, rejeitados }: { posts: Post[]; aprovados: Post[]; rejeitados: Post[] }) {
  // Agrupa posts reais por mês se existirem, senão usa mock
  const data = posts.length > 5 ? (() => {
    const byMonth: Record<string, { criados: number; aprovados: number; rejeitados: number }> = {};
    posts.forEach(p => {
      if (!p.createdAt) return;
      const d = (p.createdAt as any).toDate?.() ?? new Date(p.createdAt as any);
      const key = d.toLocaleString('pt-BR', { month: 'short' });
      if (!byMonth[key]) byMonth[key] = { criados: 0, aprovados: 0, rejeitados: 0 };
      byMonth[key].criados++;
      if (p.status === 'aprovado')  byMonth[key].aprovados++;
      if (p.status === 'rejeitado') byMonth[key].rejeitados++;
    });
    return Object.entries(byMonth).map(([mes, v]) => ({ mes, ...v }));
  })() : MOCK_TREND;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-gray-900">Tendência de Conteúdo</h3>
        <p className="text-[12px] text-gray-400 mt-0.5">
          {posts.length > 5 ? 'Baseado nos seus posts reais' : 'Dados simulados — crie mais posts para ver dados reais'}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="gradCriados"    x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#FF5C00" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#FF5C00" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradAprovados" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '11px' }} />
          <Area type="monotone" dataKey="criados"    stroke="#FF5C00" fill="url(#gradCriados)"    strokeWidth={2} name="Criados" />
          <Area type="monotone" dataKey="aprovados"  stroke="#22C55E" fill="url(#gradAprovados)"  strokeWidth={2} name="Aprovados" />
          <Area type="monotone" dataKey="rejeitados" stroke="#EF4444" fill="none"                 strokeWidth={1.5} strokeDasharray="4 4" name="Rejeitados" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const PERIOD_OPTS = ['Este mês', 'Últimos 30 dias', 'Últimos 90 dias'] as const;

export default function AnalyticsPage() {
  const { user }   = useAuth();
  const [period, setPeriod] = useState<typeof PERIOD_OPTS[number]>('Últimos 30 dias');

  const { data: posts,      loading: lPosts }      = useUserCollection<Post>(user?.uid ?? null, 'posts',     [orderBy('createdAt', 'desc')]);
  const { data: aprovados,  loading: lAprovados }  = useUserCollection<Post>(user?.uid ?? null, 'aprovados');
  const { data: emAnalise,  loading: lAnalise }    = useUserCollection<Post>(user?.uid ?? null, 'emAnalise');
  const { data: rejeitados, loading: lRejeitados } = useUserCollection<Post>(user?.uid ?? null, 'rejeitados');
  const { data: contas }                           = useUserCollection<ConnectedAccount>(user?.uid ?? null, 'connectedAccounts');

  const loading = lPosts || lAprovados || lAnalise || lRejeitados;

  const totalFollowers = contas.reduce((a, c) => a + (c.followers ?? 0), 0);
  const taxaAprovacao  = posts.length > 0 ? Math.round((aprovados.length / posts.length) * 100) : 0;
  const engMedio       = contas.reduce((a, c) => a + (c.engagement ?? 0), 0) / Math.max(contas.length, 1);

  // Mix de plataformas para exibição
  const mixByPlatform = useMemo(() => {
    const acc: Record<string, number> = {};
    posts.forEach(p => (p.platforms ?? []).forEach(pl => { acc[pl] = (acc[pl] ?? 0) + 1; }));
    return acc;
  }, [posts]);

  const topPlatform = Object.entries(mixByPlatform).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'instagram';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
          <p className="text-sm text-gray-500 mt-0.5">Inteligência de conteúdo e performance</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            {PERIOD_OPTS.map((opt) => (
              <button
                key={opt}
                onClick={() => setPeriod(opt)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all whitespace-nowrap',
                  period === opt ? 'bg-white text-[#FF5C00] shadow-sm' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Posts Criados" value={String(posts.length)}
          variation={18} icon="✏️" color="#FF5C00"
          sublabel="no período selecionado" loading={loading}
        />
        <KpiCard
          label="Taxa de Aprovação" value={`${taxaAprovacao}%`}
          variation={taxaAprovacao > 70 ? 5 : -3} icon="✅" color="#22C55E"
          sublabel={`${aprovados.length} aprovados`} loading={loading}
        />
        <KpiCard
          label="Seguidores Totais" value={totalFollowers > 0 ? fmt(totalFollowers) : '—'}
          icon="👥" color="#7C3AED"
          sublabel={contas.length > 0 ? `${contas.length} contas conectadas` : 'Conecte suas contas'} loading={loading}
        />
        <KpiCard
          label="Engajamento Médio" value={engMedio > 0 ? `${engMedio.toFixed(1)}%` : '—'}
          icon="❤️" color="#EF4444"
          sublabel="média das contas conectadas" loading={loading}
        />
      </div>

      {/* Funil + Tendência */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ConversionFunnel
          posts={posts} aprovados={aprovados}
          emAnalise={emAnalise} rejeitados={rejeitados}
        />
        <PostTrend posts={posts} aprovados={aprovados} rejeitados={rejeitados} />
      </div>

      {/* Heatmap */}
      <EngagementHeatmap />

      {/* Radar + ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PlatformRadar />
        <ROICalculator />
      </div>

      {/* Resumo de plataformas */}
      {Object.keys(mixByPlatform).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-[15px] font-bold text-gray-900 mb-4">Distribuição por Plataforma</h3>
          <div className="space-y-3">
            {Object.entries(mixByPlatform)
              .sort((a, b) => b[1] - a[1])
              .map(([platform, count]) => {
                const pct = Math.round((count / posts.length) * 100);
                const colors: Record<string, string> = {
                  instagram: '#E1306C', facebook: '#1877F2', youtube: '#FF0000',
                  tiktok: '#010101', linkedin: '#0A66C2', threads: '#000000',
                  pinterest: '#E60023', google_business: '#4285F4',
                };
                const color = colors[platform] ?? '#FF5C00';
                return (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="text-[12px] font-semibold text-gray-600 capitalize w-28">{platform}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-gray-700 w-10 text-right">{count}</span>
                    <span className="text-[11px] text-gray-400 w-10 text-right">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

    </div>
  );
}
