'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth }           from '@/lib/hooks/useAuth';
import { useUserCollection } from '@/lib/hooks/useCollection';
import { orderBy }           from 'firebase/firestore';
import { cn }                from '@/lib/utils/cn';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend,
  BarChart, Bar, Cell,
} from 'recharts';
import type { Post, ConnectedAccount } from '@/lib/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtCurrency(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type KpiKey =
  | 'curtidas' | 'comentarios' | 'compartilhamentos' | 'envios' | 'mensagens'
  | 'mencoes' | 'remix' | 'salvamentos' | 'alcance' | 'impressoes';

type PlatformFilter = 'todas' | 'instagram' | 'facebook' | 'youtube' | 'tiktok' | 'linkedin';
type CategoryFilter = 'engajamento' | 'alcance' | 'conversao' | 'crescimento';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_KPIS: Record<KpiKey, { value: number; variation: number; sublabel?: string }> = {
  curtidas:         { value: 184300, variation: 12.4 },
  comentarios:      { value: 12500,  variation: 8.1  },
  compartilhamentos:{ value: 8900,   variation: 18.6 },
  envios:           { value: 6200,   variation: 5.2  },
  mensagens:        { value: 2200,   variation: 3.4  },
  mencoes:          { value: 1500,   variation: 22.8 },
  remix:            { value: 932,    variation: 14.0 },
  salvamentos:      { value: 15900,  variation: 9.7  },
  alcance:          { value: 1200000,variation: 16.2, sublabel: 'Pessoas únicas' },
  impressoes:       { value: 2200000,variation: 11.4, sublabel: 'Total de exibições' },
};

const KPI_META: Record<KpiKey, { label: string; icon: string; color: string }> = {
  curtidas:          { label: 'CURTIDAS',          icon: '♡',  color: '#FF5C00' },
  comentarios:       { label: 'COMENTÁRIOS',        icon: '💬', color: '#7C3AED' },
  compartilhamentos: { label: 'COMPARTILHAMENTOS',  icon: '↗',  color: '#3B82F6' },
  envios:            { label: 'ENVIOS',             icon: '✉',  color: '#F59E0B' },
  mensagens:         { label: 'MENSAGENS',          icon: '💬', color: '#10B981' },
  mencoes:           { label: 'MENÇÕES',            icon: '@',  color: '#06B6D4' },
  remix:             { label: 'REMIX',              icon: '🔄', color: '#F43F5E' },
  salvamentos:       { label: 'SALVAMENTOS',        icon: '🔖', color: '#8B5CF6' },
  alcance:           { label: 'ALCANCE',            icon: '👁', color: '#0EA5E9' },
  impressoes:        { label: 'IMPRESSÕES',         icon: '📊', color: '#64748B' },
};

const ENGAGEMENT_KPIS: KpiKey[] = ['curtidas', 'comentarios', 'compartilhamentos', 'envios', 'mensagens'];
const REACH_KPIS: KpiKey[]      = ['alcance', 'impressoes', 'mencoes', 'remix', 'salvamentos'];

// Mock daily engagement data (30 days)
function generateEngagementData() {
  const data = [];
  for (let i = 1; i <= 30; i++) {
    data.push({
      dia: i,
      curtidas:          Math.round(4000 + Math.random() * 2000 + Math.sin(i * 0.4) * 1500),
      comentarios:       Math.round(300 + Math.random() * 600 + Math.sin(i * 0.3) * 200),
      compartilhamentos: Math.round(200 + Math.random() * 400 + Math.sin(i * 0.5) * 150),
      salvamentos:       Math.round(300 + Math.random() * 500 + Math.sin(i * 0.35) * 100),
    });
  }
  return data;
}
const ENGAGEMENT_DATA = generateEngagementData();

// Heatmap 7 days × 24 hours
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function generateHeatmap(): number[][] {
  return Array.from({ length: 7 }, (_, d) =>
    Array.from({ length: 24 }, (_, h) => {
      let base = 0;
      if (h >= 8  && h <= 11) base = 55 + Math.random() * 45;
      else if (h >= 12 && h <= 14) base = 45 + Math.random() * 40;
      else if (h >= 19 && h <= 21) base = 65 + Math.random() * 35;
      else if (h >= 22 || h <= 5)  base = Math.random() * 12;
      else base = 15 + Math.random() * 30;
      if (d === 0 || d === 6) base *= 0.75;
      return Math.round(base);
    })
  );
}
const HEATMAP = generateHeatmap();

// Curtidas modal data
const CURTIDAS_MODAL = {
  total: 184300, variation: 12.4, daily: 6100, peak: 14700, peakLabel: 'Quinta · 20h',
  position: 'Top 12%',
  platformBreakdown: [
    { name: 'Instagram', value: 16700, variation: 13.9, color: '#E1306C' },
    { name: 'Facebook',  value: 69500, variation: 11.8, color: '#1877F2' },
    { name: 'YouTube',   value: 40700, variation: 15.4, color: '#FF0000' },
    { name: 'TikTok',    value: 60600, variation: 18.5, color: '#010101' },
    { name: 'LinkedIn',  value: 41000, variation: 18.5, color: '#0A66C2' },
  ],
  topPosts: [
    { rank: 1, title: 'Bastidores do lançamento', platform: 'Instagram', value: 39800 },
    { rank: 2, title: 'Tutorial em 60s',          platform: 'TikTok',    value: 28400 },
    { rank: 3, title: 'Antes & depois do cliente', platform: 'Instagram', value: 26400 },
    { rank: 4, title: 'Reels com áudio viral',    platform: 'YouTube',   value: 18200 },
  ],
  trend12m: Array.from({ length: 12 }, (_, i) => ({
    mes: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i],
    atual:    Math.round(10000 + i * 800 + Math.sin(i * 0.7) * 2000),
    anterior: Math.round(9000  + i * 400 + Math.sin(i * 0.5) * 1500),
  })),
};

// Golden window data
const GOLDEN_WINDOW = {
  velocidade: '+47%', engMedio: '9.2%', alcance: '+38%', tempoTela: '2m 47s',
  top5: [
    { pos: 1, label: 'Terça · 20h', posts: 14, eng: 9.8, lift: '+52%' },
    { pos: 2, label: 'Quarta · 19h', posts: 12, eng: 9.1, lift: '+48%' },
    { pos: 3, label: 'Quinta · 20h', posts: 11, eng: 8.7, lift: '+45%' },
    { pos: 4, label: 'Quarta · 12h', posts: 9,  eng: 7.4, lift: '+38%' },
    { pos: 5, label: 'Sexta · 11h',  posts: 8,  eng: 6.9, lift: '+32%' },
  ],
  byPlatform: [
    { platform: 'Instagram', color: '#E1306C', window: '19h–21h', tip: 'Reels têm pico às 20h' },
    { platform: 'TikTok',    color: '#010101', window: '21h–23h', tip: 'Audiência noturna ativa' },
    { platform: 'LinkedIn',  color: '#0A66C2', window: '08h–10h', tip: 'B2B em horário comercial' },
    { platform: 'YouTube',   color: '#FF0000', window: '19h–22h', tip: 'Sessões longas no fim do dia' },
    { platform: 'Facebook',  color: '#1877F2', window: '12h–14h', tip: 'Pausa do almoço' },
  ],
};

// Conversion funnel
const FUNNEL = [
  { label: 'Visitantes',  sublabel: 'Alcance + impressões totais', value: 248300, pct: 100,  color: '#FF5C00',  dropLabel: '' },
  { label: 'Engajamento', sublabel: 'Interações qualificadas',      value: 86100,  pct: 34.7, color: '#7C3AED',  dropLabel: '-65% drop' },
  { label: 'Cliques',     sublabel: 'CTR no link da bio + UTM',    value: 18400,  pct: 7.4,  color: '#3B82F6',  dropLabel: '-79% drop' },
  { label: 'Leads',       sublabel: 'Formulários e DMs qualificados',value: 4200,  pct: 1.7,  color: '#F59E0B',  dropLabel: '-77% drop' },
  { label: 'Vendas',      sublabel: 'Conversões atribuídas',        value: 612,    pct: 0.25, color: '#22C55E',  dropLabel: '-85% drop' },
];

// Radar data
const RADAR_DATA = [
  { metric: 'Alcance',     instagram: 90, facebook: 60, tiktok: 80, linkedin: 40 },
  { metric: 'Engajamento', instagram: 75, facebook: 55, tiktok: 95, linkedin: 65 },
  { metric: 'Conversão',   instagram: 60, facebook: 70, tiktok: 45, linkedin: 85 },
  { metric: 'Crescimento', instagram: 65, facebook: 40, tiktok: 90, linkedin: 55 },
  { metric: 'CTR',         instagram: 55, facebook: 65, tiktok: 70, linkedin: 75 },
  { metric: 'Retenção',    instagram: 70, facebook: 50, tiktok: 85, linkedin: 60 },
];

// Geographic data
const GEO_DATA = [
  { city: 'São Paulo, SP',      pct: 28.4, eng: 7.6, peak: '20h', cpm: 11,
    platforms: { Instagram: 10, Facebook: 31, YouTube: 20, TikTok: 23, LinkedIn: 15 },
    color: '#FF5C00' },
  { city: 'Rio de Janeiro, RJ', pct: 14.1, eng: 6.8, peak: '19h', cpm: 12, platforms: {}, color: '#7C3AED' },
  { city: 'Belo Horizonte, MG', pct: 7.6,  eng: 5.9, peak: '20h', cpm: 9,  platforms: {}, color: '#3B82F6' },
  { city: 'Porto Alegre, RS',   pct: 5.8,  eng: 5.2, peak: '18h', cpm: 8,  platforms: {}, color: '#10B981' },
  { city: 'Curitiba, PR',       pct: 5.2,  eng: 4.7, peak: '21h', cpm: 7,  platforms: {}, color: '#F59E0B' },
  { city: 'Brasília, DF',       pct: 4.7,  eng: 4.3, peak: '19h', cpm: 9,  platforms: {}, color: '#06B6D4' },
  { city: 'Salvador, BA',       pct: 4.1,  eng: 4.0, peak: '20h', cpm: 7,  platforms: {}, color: '#F43F5E' },
];

// Content types
const CONTENT_TYPES = [
  { type: 'Reels',     icon: '🎬', posts: 18, eng: 7.2, reach: 520000, roi: 'Alto',   color: '#FF5C00' },
  { type: 'Carrossel', icon: '🃏', posts: 24, eng: 5.8, reach: 380000, roi: 'Alto',   color: '#7C3AED' },
  { type: 'Vídeo',     icon: '▶️', posts: 12, eng: 6.1, reach: 410000, roi: 'Alto',   color: '#3B82F6' },
  { type: 'Foto',      icon: '🖼',  posts: 31, eng: 3.9, reach: 290000, roi: 'Médio', color: '#F59E0B' },
  { type: 'Stories',   icon: '⭕', posts: 45, eng: 2.8, reach: 180000, roi: 'Médio', color: '#10B981' },
];

// ─── Audience / Demographics Data ─────────────────────────────────────────────

const AGE_GROUPS = [
  { range: '13-17', feminino: 3,  masculino: 4,  total: 7  },
  { range: '18-24', feminino: 11, masculino: 8,  total: 19 },
  { range: '25-34', feminino: 27, masculino: 22, total: 49 },
  { range: '35-44', feminino: 8,  masculino: 7,  total: 15 },
  { range: '45-54', feminino: 3,  masculino: 3,  total: 6  },
  { range: '55-64', feminino: 1,  masculino: 1,  total: 2  },
  { range: '65+',   feminino: 1,  masculino: 1,  total: 2  },
];

const AGE_DETAIL: Record<string, {
  total: number; feminino: number; masculino: number; engMedio: number;
  contents: string[]; platforms: string[];
  insight: string; tom: string; horarios: string; oportunidade: string;
}> = {
  '13-17': {
    total: 7, feminino: 4, masculino: 3, engMedio: 6.2,
    contents: ['Trends virais', 'Memes', 'Desafios'],
    platforms: ['TikTok', 'Instagram'],
    insight: 'Faixa em crescimento — foco em formatos curtos e virais.',
    tom: 'Descontraído e autêntico. Humor e cultura pop.',
    horarios: '15h–18h, 21h–23h',
    oportunidade: 'Esta faixa cresceu 12% nos últimos 90 dias. Aposte em trends e desafios.',
  },
  '18-24': {
    total: 19, feminino: 11, masculino: 8, engMedio: 8.4,
    contents: ['Reels', 'Bastidores', 'Tendências'],
    platforms: ['Instagram', 'TikTok', 'YouTube'],
    insight: 'Alta receptividade a conteúdo autêntico e interativo.',
    tom: 'Casual e próximo. Linguagem direta e moderna.',
    horarios: '12h–14h, 20h–23h',
    oportunidade: 'Esta faixa cresceu 9.1% nos últimos 90 dias. Considere lives interativas.',
  },
  '25-34': {
    total: 49, feminino: 49, masculino: 45, engMedio: 10.1,
    contents: ['Bastidores', 'Carrosséis educativos', 'Estudos de caso'],
    platforms: ['Instagram', 'Linkedin', 'YouTube'],
    insight: 'Faixa de maior poder de compra. Decide com base em prova social e ROI claro.',
    tom: 'Profissional mas humano. Storytelling com dados, prova social, e propósito de marca.',
    horarios: '08h, 12h–13h, 19h–21h',
    oportunidade: 'Esta faixa cresceu 8.4% nos últimos 90 dias. Considere campanha segmentada com pelo menos 3 peças/semana.',
  },
  '35-44': {
    total: 15, feminino: 8, masculino: 7, engMedio: 7.8,
    contents: ['Artigos', 'Webinars', 'Comparativos'],
    platforms: ['LinkedIn', 'Facebook', 'YouTube'],
    insight: 'Consome conteúdo longo e aprofundado. Alta taxa de conversão.',
    tom: 'Profissional e orientado a resultados. Dados e cases reais.',
    horarios: '07h–09h, 12h–13h, 18h–20h',
    oportunidade: 'Esta faixa cresceu 5.3% nos últimos 90 dias. Invista em webinars e conteúdo educativo.',
  },
  '45-54': {
    total: 6, feminino: 3, masculino: 3, engMedio: 5.6,
    contents: ['Tutoriais', 'Reviews', 'Notícias'],
    platforms: ['Facebook', 'YouTube', 'LinkedIn'],
    insight: 'Público fiel com alta taxa de retorno. Prefere conteúdo detalhado.',
    tom: 'Formal e informativo. Clareza acima de criatividade.',
    horarios: '08h–10h, 19h–21h',
    oportunidade: 'Esta faixa cresceu 2.1% nos últimos 90 dias. Foque em tutoriais passo a passo.',
  },
  '55-64': {
    total: 2, feminino: 1, masculino: 1, engMedio: 4.2,
    contents: ['Notícias', 'Reviews', 'Dicas práticas'],
    platforms: ['Facebook', 'YouTube'],
    insight: 'Engajamento sólido mas menor volume. Valoriza confiança e autoridade.',
    tom: 'Claro, direto e respeitoso. Evite gírias e referências muito recentes.',
    horarios: '09h–11h, 19h–20h',
    oportunidade: 'Faixa estável. Mantenha conteúdo consistente sem mudanças bruscas de estilo.',
  },
  '65+': {
    total: 2, feminino: 1, masculino: 1, engMedio: 3.8,
    contents: ['Notícias', 'Saúde e bem-estar', 'Dicas práticas'],
    platforms: ['Facebook', 'YouTube'],
    insight: 'Público crescente nas redes. Fidelidade alta quando conquistada.',
    tom: 'Simples, acessível e acolhedor. Textos maiores e linguagem clara.',
    horarios: '10h–12h, 20h–21h',
    oportunidade: 'Faixa cresceu 4.5% no último trimestre. Oportunidade de nicho pouco explorada.',
  },
};

const GENDER_DATA = {
  feminino: {
    pct: 54, engMedio: 8.9, tempoNaTela: '3m 12s',
    platforms: { Instagram: 68, Facebook: 45, YouTube: 38, TikTok: 55, LinkedIn: 28 },
    insight: 'Sua audiência feminina engaja mais em conteúdos inspiracionais, tutoriais e histórias de transformação. Considere séries de antes & depois.',
  },
  masculino: {
    pct: 41, engMedio: 7.4, tempoNaTela: '2m 38s',
    platforms: { Instagram: 52, Facebook: 42, YouTube: 32, TikTok: 35, LinkedIn: 32 },
    insight: 'Sua audiência masculina engaja mais em comparativos, dados e conteúdo técnico. Considere séries de carrosséis com estatísticas.',
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-gray-100 rounded-xl', className)} />;
}

// ─── Sync Indicator ───────────────────────────────────────────────────────────

function SyncDot() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      <span className="text-green-600 font-semibold">Sincronizado</span>
      <span>· há 2 min</span>
    </div>
  );
}

// ─── KPI Mini Sparkline ────────────────────────────────────────────────────────

function Sparkline({ color, positive }: { color: string; positive: boolean }) {
  const points = Array.from({ length: 10 }, () => 20 + Math.random() * 30);
  if (positive) points[points.length - 1] = Math.max(...points) * 0.95;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const norm = points.map(p => ((p - min) / (max - min + 0.01)) * 35);
  const path = norm.map((y, i) => `${i === 0 ? 'M' : 'L'}${(i / 9) * 100},${40 - y}`).join(' ');
  const area = `${path} L100,40 L0,40 Z`;
  return (
    <svg viewBox="0 0 100 40" className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`spark-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${color.replace('#','')})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  kpiKey, onClick, loading,
}: { kpiKey: KpiKey; onClick: () => void; loading?: boolean }) {
  if (loading) return <Skeleton className="h-28" />;
  const { value, variation, sublabel } = MOCK_KPIS[kpiKey];
  const { label, icon, color } = KPI_META[kpiKey];
  const positive = variation >= 0;
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2 text-left hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        <div className="text-base opacity-60 group-hover:opacity-100 transition-opacity">{icon}</div>
      </div>
      <div>
        <p className="text-[26px] font-black text-gray-900 leading-none" style={{ fontFamily: "'Aileron', sans-serif" }}>
          {fmt(value)}
        </p>
        {sublabel && <p className="text-[10px] text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className={cn('text-[11px] font-semibold', positive ? 'text-green-500' : 'text-red-500')}>
          {positive ? '↑' : '↓'} {Math.abs(variation)}%
        </p>
        <div className="flex-1 max-w-[80px]">
          <Sparkline color={color} positive={positive} />
        </div>
      </div>
    </button>
  );
}

// ─── Curtidas Modal ───────────────────────────────────────────────────────────

function KpiDetailModal({ kpiKey, onClose }: { kpiKey: KpiKey; onClose: () => void }) {
  const d = CURTIDAS_MODAL;
  const { label } = KPI_META[kpiKey];
  const maxPlatform = Math.max(...d.platformBreakdown.map(p => p.value));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">{label} · Todas</h3>
            <p className="text-[12px] text-gray-400">Análise aprofundada com tendências, ranking e recomendações</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'TOTAL NO PERÍODO', value: fmt(d.total), color: '#FF5C00', sub: `+${d.variation}% vs anterior` },
              { label: 'MÉDIA DIÁRIA',     value: fmt(d.daily), color: '#374151', sub: `Últimos 30 dias` },
              { label: 'PICO NO PERÍODO',  value: fmt(d.peak),  color: '#22C55E', sub: d.peakLabel },
              { label: 'POSIÇÃO NO SETOR', value: d.position,   color: '#7C3AED', sub: 'vs perfis similares' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[18px] font-black leading-none" style={{ color }}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[13px] font-bold text-gray-800">Comparativo Atual × Período Anterior</p>
              <span className="text-[11px] text-gray-400">12 meses</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={d.trend12m}>
                <defs>
                  <linearGradient id="gradAtual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#FF5C00" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#FF5C00" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(v) => v === 'atual' ? 'Atual' : 'Anterior'} />
                <Area type="monotone" dataKey="anterior" stroke="#D1D5DB" fill="none" strokeWidth={1.5} strokeDasharray="4 4" name="anterior" />
                <Area type="monotone" dataKey="atual"    stroke="#FF5C00" fill="url(#gradAtual)" strokeWidth={2} name="atual" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-[13px] font-bold text-gray-800 mb-3">Quebra por Plataforma</p>
              <div className="space-y-2.5">
                {d.platformBreakdown.map(p => (
                  <div key={p.name}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="font-medium text-gray-700">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{fmt(p.value)}</span>
                        <span className="text-green-500 font-semibold">+{p.variation}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(p.value / maxPlatform) * 100}%`, background: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-800 mb-3">Top Posts Contribuintes</p>
              <div className="space-y-2.5">
                {d.topPosts.map(post => (
                  <div key={post.rank} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0" style={{ background: post.rank === 1 ? '#FF5C00' : post.rank === 2 ? '#7C3AED' : post.rank === 3 ? '#3B82F6' : '#9CA3AF' }}>
                      {post.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-gray-800 truncate">{post.title}</p>
                      <p className="text-[10px] text-gray-400">{post.platform}</p>
                    </div>
                    <span className="text-[12px] font-bold text-gray-700">{fmt(post.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-gray-800 mb-3">Insights & Recomendações</p>
            <div className="space-y-2">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px]">✨</span>
                </div>
                <p className="text-[12px] text-purple-900">
                  <span className="font-bold text-purple-700">Insight IA</span> · curtidas está acelerando {d.variation}% vs. o período anterior. Com o ritmo atual, projetamos <span className="font-bold">207.2K</span> no próximo mês. Para potencializar, replique o formato dos top 3 posts em <span className="font-bold">Instagram</span>.
                </p>
              </div>
              {[
                { icon: '🎯', label: 'Maior contribuição', desc: 'Facebook representa 30% do total — concentre 40% do seu cronograma aqui.', color: 'green' },
                { icon: '🕐', label: 'Janela ótima', desc: 'Posts publicados entre Ter–Qui das 19h às 21h geram +47% deste KPI no primeiro dia.', color: 'blue' },
                { icon: '⚡', label: 'Hipótese a testar', desc: 'Adicionar CTA explícito ("salve para depois" / "marque alguém") pode elevar curtidas em 15–22% segundo benchmarks AHA.', color: 'amber' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="p-3 bg-gray-50 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-[12px] font-bold text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button onClick={onClose} className="text-[13px] text-gray-500 hover:text-gray-700 font-medium">Fechar</button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: '#FF5C00' }}>
              <span>⬇</span> Exportar relatório
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Golden Window Modal ───────────────────────────────────────────────────────

function GoldenWindowModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[600px] max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">Janela de Ouro · Insights de Horário</h3>
            <p className="text-[12px] text-gray-400">Análise dos melhores momentos para postar com base nos últimos 90 dias</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'VELOCITY INICIAL', value: GOLDEN_WINDOW.velocidade, color: '#22C55E', sub: 'Primeiras 4h' },
              { label: 'ENG. MÉDIO',        value: GOLDEN_WINDOW.engMedio,   color: '#374151', sub: 'vs 5.8% fora janela' },
              { label: 'ALCANCE ORGÂNICO',  value: GOLDEN_WINDOW.alcance,    color: '#3B82F6', sub: 'Boost algorítmico' },
              { label: 'TEMPO NA TELA',     value: GOLDEN_WINDOW.tempoTela,  color: '#374151', sub: '+1m 12s vs. média' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[18px] font-black leading-none" style={{ color }}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-1">{sub}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-[13px] font-bold text-gray-800 mb-3">Top 5 Horários · Maior Lift</p>
            <div className="space-y-2">
              {GOLDEN_WINDOW.top5.map(({ pos, label, posts, eng, lift }) => (
                <div key={pos} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: pos === 1 ? '#FFF7F0' : '#F9FAFB' }}>
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[13px] font-black text-white shrink-0" style={{ background: pos <= 3 ? '#FF5C00' : '#9CA3AF' }}>
                    {pos}
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-bold text-gray-900">{label}</p>
                    <p className="text-[11px] text-gray-400">{posts} posts publicados · engajamento médio {eng}%</p>
                  </div>
                  <span className="text-[13px] font-bold text-green-500">↗ {lift}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-gray-800 mb-3">Melhor Horário por Plataforma</p>
            <div className="grid grid-cols-2 gap-2">
              {GOLDEN_WINDOW.byPlatform.map(({ platform, color, window, tip }) => (
                <div key={platform} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white text-[11px] font-bold" style={{ background: color }}>
                    {platform[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-800">{platform}</p>
                    <p className="text-[10px] text-gray-400 truncate">{tip}</p>
                  </div>
                  <span className="text-[12px] font-bold text-gray-700 whitespace-nowrap">{window}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[13px] font-bold text-gray-800 mb-3">Recomendações para Social Media Manager</p>
            <div className="space-y-2">
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0 text-[10px] mt-0.5">✨</span>
                <p className="text-[12px] text-purple-900">
                  <span className="font-bold text-purple-700">Insight IA</span> · Concentre <span className="font-bold">60% do cronograma semanal</span> entre Terça e Quinta nas faixas 12h–14h e 19h–21h. Reservas para conteúdos B2B (LinkedIn) devem ir nas manhãs (08h–10h). Evite postar entre 0h–6h, exceto stories.
                </p>
              </div>
              {[
                { icon: '⚡', label: 'Por que "velocity inicial" importa', desc: 'O algoritmo do Instagram e TikTok decide nas primeiras 4h se vai distribuir o post para mais pessoas. Postar na janela ótima multiplica o alcance final em 2–3×.' },
                { icon: '🚫', label: 'Evite madrugada (0h–6h)', desc: 'Engajamento médio cai para 0.8% — o conteúdo "queima" sem distribuição. Use stories nesse horário, nunca feed.' },
                { icon: '📊', label: 'Padrão de comportamento', desc: 'Sua audiência abre o app principalmente nas pausas: café (08h), almoço (12h–14h) e descompressão noturna (19h–22h).' },
                { icon: '🔬', label: 'Teste A/B sugerido', desc: 'Publique o mesmo carrossel Terça 20h vs. Sábado 11h por 2 semanas. Compare alcance e taxa de salvamento.' },
              ].map(({ icon, label, desc }) => (
                <div key={label} className="p-3 bg-gray-50 rounded-xl flex items-start gap-3">
                  <span className="w-6 h-6 flex items-center justify-center shrink-0">{icon}</span>
                  <div>
                    <p className="text-[12px] font-bold text-gray-800">{label}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <button onClick={onClose} className="text-[13px] text-gray-500 font-medium">Fechar</button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: '#FF5C00' }}>
              Aplicar ao agendamento →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────

function HeatCell({ value, day, hour, onClick }: { value: number; day: number; hour: number; onClick: () => void }) {
  const intensity = value / 100;

  // Color scale from light salmon/pink → medium orange → deep orange-red
  const getColor = (v: number) => {
    if (v <= 0) return 'rgba(254, 226, 226, 0.3)';
    if (v < 15) return `rgba(254, 205, 170, ${0.3 + v * 0.01})`;
    if (v < 30) return `rgba(253, 165, 110, ${0.4 + v * 0.008})`;
    if (v < 50) return `rgba(251, 120, 70, ${0.5 + v * 0.005})`;
    if (v < 70) return `rgba(239, 90, 40, ${0.65 + v * 0.003})`;
    return `rgba(220, 60, 20, ${0.8 + (v - 70) * 0.006})`;
  };

  return (
    <div
      onClick={onClick}
      className="rounded-sm cursor-pointer hover:scale-125 hover:z-10 relative transition-transform duration-150"
      style={{ background: getColor(value), width: '100%', paddingBottom: '100%' }}
      title={`${DAYS_SHORT[day]} ${String(hour).padStart(2,'0')}h — ${value}%`}
    />
  );
}

// ─── Heatmap Cell Detail Modal ─────────────────────────────────────────────────

function HeatCellModal({ day, hour, value, onClose }: { day: number; hour: number; value: number; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[360px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[15px] font-bold text-gray-900">{DAYS_SHORT[day]} · {String(hour).padStart(2,'0')}:00</h3>
            <p className="text-[11px] text-gray-400">Intensidade pico · {value}/100</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">INTENSIDADE</p>
            <p className="text-[20px] font-black text-green-500">{value}/100</p>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">POSTS MÉDIA</p>
            <p className="text-[20px] font-black text-gray-900">7</p>
            <p className="text-[9px] text-gray-400">por semana</p>
          </div>
          <div className="text-center bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">ENG. MÉDIO</p>
            <p className="text-[20px] font-black text-blue-500">7.3%</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-2">
            <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0 text-[9px]">✨</span>
            <p className="text-[11px] text-purple-900">
              <span className="font-bold text-purple-700">Insight IA</span> · Este é um horário <span className="font-bold">premium</span>. Reserve seus melhores formatos (Reels, vídeos) para esta janela.
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl flex items-start gap-2">
            <span className="text-sm">🕐</span>
            <div>
              <p className="text-[11px] font-bold text-gray-800">Comparação com a semana</p>
              <p className="text-[10px] text-gray-500">Em relação aos demais horários, este ponto representa uma das maiores oportunidades da semana.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Content Type Modal ────────────────────────────────────────────────────────

function ContentTypeModal({ type, onClose }: { type: typeof CONTENT_TYPES[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">Conteúdo · {type.type}</h3>
            <p className="text-[12px] text-gray-400">{type.posts} publicações · alcance acumulado {fmt(type.reach)} · análise de formato</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-5">
          <div className="text-center">
            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">ENG. MÉDIO</p>
            <p className="text-[18px] font-black" style={{ color: type.color }}>{type.eng}%</p>
            <p className="text-[9px] text-gray-400">vs 5.8% global</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">ALCANCE TOTAL</p>
            <p className="text-[18px] font-black text-gray-900">{fmt(type.reach)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">POSTS</p>
            <p className="text-[18px] font-black text-gray-900">{type.posts}</p>
            <p className="text-[9px] text-gray-400">no período</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">ROI RELATIVO</p>
            <p className="text-[18px] font-black text-green-500">{type.roi}</p>
          </div>
        </div>
        <div className="mb-4">
          <p className="text-[13px] font-bold text-gray-800 mb-3">Playbook de Boas Práticas</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: '⚡', label: 'Hook', desc: 'Resolva uma dor nos primeiros 8 segundos' },
              { icon: '🎯', label: 'Formato ideal', desc: '60s–3min · legenda burnedin · capa A/B' },
              { icon: '📢', label: 'CTA recomendado', desc: '"Inscreva-se"/"Veja completo no YouTube"' },
              { icon: '💡', label: 'Dica AHA', desc: 'Vídeos com capa personalizada têm CTR 2.4× maior que thumbnail automática.' },
            ].map(({ icon, label, desc }) => (
              <div key={label} className="p-3 bg-gray-50 rounded-xl flex items-start gap-2">
                <span className="text-sm shrink-0">{icon}</span>
                <div>
                  <p className="text-[11px] font-bold text-gray-800">{label}</p>
                  <p className="text-[10px] text-gray-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0 text-[10px]">✨</span>
          <p className="text-[12px] text-purple-900">
            <span className="font-bold text-purple-700">Insight IA</span> · {type.type} rende {type.eng}% de engajamento médio na sua conta — performance acima da média. Considere um teste de {type.posts} peças no próximo mês usando o playbook acima.
          </p>
        </div>
        <div className="flex items-center justify-end mt-4">
          <button onClick={onClose} className="text-[13px] text-gray-500 font-medium">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Geo Modal ────────────────────────────────────────────────────────────────

function GeoModal({ city, onClose }: { city: typeof GEO_DATA[0]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[420px] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">{city.city}</h3>
            <p className="text-[11px] text-gray-400">{city.pct}% da sua audiência total · cidade</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: '% AUDIÊNCIA', value: `${city.pct}%`, color: '#FF5C00' },
            { label: 'ENG. LOCAL',  value: `${city.eng}%`, color: '#374151', sub: 'vs 5.8% global' },
            { label: 'PICO DE HORA',value: `${city.peak}h`, color: '#374151', sub: 'Horário local' },
            { label: 'CPM ESPERADO',value: `R$ ${city.cpm}`, color: '#374151', sub: 'Tráfego pago' },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="text-center">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1">{label}</p>
              <p className="text-[16px] font-black leading-none" style={{ color }}>{value}</p>
              {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
          ))}
        </div>
        {Object.keys(city.platforms).length > 0 && (
          <div className="mb-4">
            <p className="text-[12px] font-bold text-gray-800 mb-2">Mix de Plataformas Nesta Localização</p>
            <div className="space-y-1.5">
              {Object.entries(city.platforms).map(([plat, pct]) => {
                const colors: Record<string, string> = { Instagram:'#E1306C', Facebook:'#1877F2', YouTube:'#FF0000', TikTok:'#010101', LinkedIn:'#0A66C2' };
                return (
                  <div key={plat} className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-600 w-20">{plat}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[plat] ?? '#FF5C00' }} />
                    </div>
                    <span className="text-[11px] font-bold text-gray-700 w-8 text-right">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-2">
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-2">
            <span className="w-5 h-5 rounded-lg bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0 text-[9px]">✨</span>
            <p className="text-[11px] text-purple-900"><span className="font-bold">Insight IA</span> · Concentração de seguidores nesta cidade indica oportunidade de eventos presenciais, lives geo-segmentadas e parcerias com influenciadores locais.</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl flex items-start gap-2">
            <span className="text-sm">🎯</span>
            <div>
              <p className="text-[11px] font-bold text-gray-800">Recomendação de campanha</p>
              <p className="text-[10px] text-gray-500">Para esta localização, criativos verticais (9:16) com legenda em português e CTA "saiba mais" performam 23% melhor.</p>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl flex items-start gap-2">
            <span className="text-sm">🌐</span>
            <div>
              <p className="text-[11px] font-bold text-gray-800">Comparação com top 3</p>
              <p className="text-[10px] text-gray-500">Esta é uma das suas localizações líderes. Mantenha frequência atual.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Age Group Modal ──────────────────────────────────────────────────────────

function AgeGroupModal({ range, onClose }: { range: string; onClose: () => void }) {
  const d = AGE_DETAIL[range];
  if (!d) return null;
  const PLATFORM_COLORS: Record<string, string> = { Instagram:'#E1306C', Linkedin:'#0A66C2', YouTube:'#FF0000', TikTok:'#010101', Facebook:'#1877F2' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">Faixa etária {range}</h3>
            <p className="text-[12px] text-gray-400">{d.total}% de sua audiência total — análise comportamental e recomendações</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'TOTAL NA FAIXA', value: `${d.total}%`, color: '#FF5C00' },
              { label: 'FEMININO',       value: `${d.feminino}%`, color: '#E1306C', sub: `${Math.round(d.feminino / 2)}% audiência` },
              { label: 'MASCULINO',      value: `${d.masculino}%`, color: '#7C3AED', sub: `${Math.round(d.masculino / 2)}% audiência` },
              { label: 'ENG. MÉDIO',     value: `${d.engMedio}%`, color: '#374151', sub: 'vs 5.8% global' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[18px] font-black leading-none" style={{ color }}>{value}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Contents & Platforms */}
          <div>
            <p className="text-[12px] font-bold text-gray-800 mb-2">Conteúdos com Melhor Performance</p>
            <div className="flex flex-wrap gap-2">
              {d.contents.map(c => (
                <span key={c} className="px-3 py-1 rounded-full text-[12px] font-semibold text-white" style={{ background: '#FF5C00' }}>{c}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] font-bold text-gray-800 mb-2">Plataformas Preferidas</p>
            <div className="flex flex-wrap gap-2">
              {d.platforms.map(p => (
                <span key={p} className="px-3 py-1 rounded-full text-[12px] font-semibold text-white" style={{ background: PLATFORM_COLORS[p] ?? '#374151' }}>{p}</span>
              ))}
            </div>
          </div>

          {/* AI Insight */}
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">✨</span>
            <p className="text-[12px] text-purple-900">
              <span className="font-bold text-purple-700">Insight IA</span> · {d.insight}
            </p>
          </div>

          {/* Recommendations */}
          {[
            { icon: '💬', label: 'Tom de voz recomendado', desc: d.tom },
            { icon: '🕐', label: 'Melhores horários para esta faixa', desc: d.horarios },
            { icon: '📈', label: 'Oportunidade detectada', desc: d.oportunidade },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="p-3 bg-gray-50 rounded-xl flex items-start gap-3">
              <span className="w-6 h-6 flex items-center justify-center shrink-0">{icon}</span>
              <div>
                <p className="text-[12px] font-bold text-gray-800">{label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={onClose} className="text-[13px] text-gray-500 font-medium">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gender Modal ─────────────────────────────────────────────────────────────

function GenderModal({ gender, onClose }: { gender: 'feminino' | 'masculino'; onClose: () => void }) {
  const d = GENDER_DATA[gender];
  const label = gender === 'feminino' ? 'Feminino' : 'Masculino';
  const platformColors: Record<string, string> = { Instagram:'#E1306C', Facebook:'#1877F2', YouTube:'#FF0000', TikTok:'#010101', LinkedIn:'#0A66C2' };
  const maxPlatform = Math.max(...Object.values(d.platforms));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-[16px] font-bold text-gray-900">Gênero · {label}</h3>
            <p className="text-[12px] text-gray-400">{d.pct}% da sua audiência — comportamento e canais preferidos</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: '% AUDIÊNCIA', value: `${d.pct}%`, color: '#FF5C00' },
              { label: 'ENG. MÉDIO',  value: `${d.engMedio}%`, color: '#374151', sub: 'vs 5.8% global' },
              { label: 'TEMPO NA TELA', value: d.tempoNaTela, color: '#374151' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-[20px] font-black leading-none" style={{ color }}>{value}</p>
                {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
              </div>
            ))}
          </div>

          {/* Platform distribution */}
          <div>
            <p className="text-[13px] font-bold text-gray-800 mb-3">Distribuição por Plataforma</p>
            <div className="space-y-2">
              {Object.entries(d.platforms).map(([plat, pct]) => (
                <div key={plat} className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-gray-600 w-20">{plat}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(pct / maxPlatform) * 100}%`,
                        background: platformColors[plat] ?? '#FF5C00',
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-gray-700 w-8 text-right">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insight */}
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex items-start gap-3">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-orange-400 flex items-center justify-center shrink-0 mt-0.5 text-[10px]">✨</span>
            <p className="text-[12px] text-purple-900">
              <span className="font-bold text-purple-700">Insight IA</span> · {d.insight}
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={onClose} className="text-[13px] text-gray-500 font-medium">Fechar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Customize View Panel ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'kpis',        label: 'KPIs principais',         desc: 'Curtidas, comentários, mensagens, alcance...' },
  { id: 'engagement',  label: 'Evolução de engajamento', desc: 'Linha do tempo com 4 séries' },
  { id: 'funnel',      label: 'Funil de conversão',      desc: 'Visitantes → Leads → Vendas' },
  { id: 'heatmap',     label: 'Heatmap de horários',     desc: 'Densidade 7×24' },
  { id: 'audience',    label: 'Demografia da audiência', desc: 'Idade + gênero' },
  { id: 'geo',         label: 'Alcance geográfico',      desc: 'Cidades, regiões e países' },
  { id: 'platforms',   label: 'Performance por plataforma', desc: 'Radar comparativo' },
  { id: 'contenttypes',label: 'Tipos de conteúdo',       desc: 'Reels, Carrossel, Stories...' },
  { id: 'roi',         label: 'Calculadora de ROI',      desc: 'ROAS · CPA · Hook Rate' },
];

function CustomizePanel({ visible, onClose, enabled, onToggle }: {
  visible: boolean; onClose: () => void;
  enabled: Record<string, boolean>; onToggle: (id: string) => void;
}) {
  if (!visible) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-[300px] bg-white border-l border-gray-200 shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-bold text-gray-900">Personalizar visão</p>
            <p className="text-[11px] text-gray-400">{Object.values(enabled).filter(Boolean).length} de {SECTIONS.length} seções visíveis</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {SECTIONS.map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => onToggle(id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0 border-2 transition-colors', enabled[id] ? 'border-[#FF5C00] bg-[#FF5C00]' : 'border-gray-200')}>
                {enabled[id] && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-gray-800">{label}</p>
                <p className="text-[10px] text-gray-400">{desc}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <button onClick={() => SECTIONS.forEach(s => !enabled[s.id] && onToggle(s.id))} className="text-[12px] text-gray-500 font-medium hover:text-gray-700">Mostrar todas</button>
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-[13px] font-semibold text-white" style={{ background: '#FF5C00' }}>Aplicar</button>
        </div>
      </div>
    </>
  );
}

// ─── Main Engagement Chart ────────────────────────────────────────────────────

function EngagementChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Evolução de Engajamento</h3>
          <p className="text-[12px] text-gray-400">Curtidas, comentários, compartilhamentos e salvamentos por dia</p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-600 font-semibold">Atualizado agora</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={ENGAGEMENT_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            {[
              { id: 'gCurtidas',          color: '#FF5C00' },
              { id: 'gComentarios',       color: '#7C3AED' },
              { id: 'gCompartilhamentos', color: '#3B82F6' },
              { id: 'gSalvamentos',       color: '#F59E0B' },
            ].map(({ id, color }) => (
              <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => fmt(v)} />
          <Tooltip
            formatter={(v: number, name: string) => [fmt(v), name.charAt(0).toUpperCase() + name.slice(1)]}
            contentStyle={{ borderRadius: 12, border: '1px solid #f0f0f0', fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: '11px' }} formatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)} />
          <Area type="monotone" dataKey="curtidas"          stroke="#FF5C00" fill="url(#gCurtidas)"          strokeWidth={2} name="curtidas" />
          <Area type="monotone" dataKey="comentarios"       stroke="#7C3AED" fill="url(#gComentarios)"       strokeWidth={1.5} name="comentarios" />
          <Area type="monotone" dataKey="compartilhamentos" stroke="#3B82F6" fill="url(#gCompartilhamentos)" strokeWidth={1.5} name="compartilhamentos" />
          <Area type="monotone" dataKey="salvamentos"       stroke="#F59E0B" fill="url(#gSalvamentos)"       strokeWidth={1.5} name="salvamentos" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Conversion Funnel ────────────────────────────────────────────────────────

function ConversionFunnel() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-gray-900">Funil de Conversão</h3>
        <p className="text-[12px] text-gray-400">Visitantes → Leads → Vendas (atribuição UTM + Firebase)</p>
      </div>
      <div className="space-y-2.5">
        {FUNNEL.map((step) => (
          <div key={step.label}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <div>
                <span className="font-semibold text-gray-800">{step.label}</span>
                <span className="text-gray-400 ml-2 text-[11px]">{step.sublabel}</span>
              </div>
              <div className="flex items-center gap-2">
                {step.dropLabel && <span className="text-red-400 font-semibold text-[10px]">{step.dropLabel}</span>}
                <span className="font-bold text-gray-900">{fmt(step.value)}</span>
              </div>
            </div>
            <div className="h-5 bg-gray-100 rounded-lg overflow-hidden">
              <div className="h-full rounded-lg transition-all duration-700 flex items-center px-2" style={{ width: `${Math.max(step.pct, 2)}%`, background: step.color }}>
                {step.pct >= 10 && <span className="text-[10px] font-bold text-white">{step.pct.toFixed(1)}%</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">CONV. LEAD</p>
          <p className="text-[18px] font-black text-gray-900">1.70%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">CONV. VENDA</p>
          <p className="text-[18px] font-black text-gray-900">0.246%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">CAC MÉDIO</p>
          <p className="text-[18px] font-black text-gray-900">R$ 118</p>
        </div>
      </div>
    </div>
  );
}

// ─── Audience Demographics Section ────────────────────────────────────────────

function AudienceDemographics({
  onAgeClick,
  onGenderClick,
}: {
  onAgeClick: (range: string) => void;
  onGenderClick: (gender: 'feminino' | 'masculino') => void;
}) {
  // Donut chart via SVG
  const donutData = [
    { label: 'Feminino', value: 54, color: '#FF5C00' },
    { label: 'Masculino', value: 41, color: '#7C3AED' },
    { label: 'Não informado', value: 5, color: '#E5E7EB' },
  ];
  const total = donutData.reduce((a, b) => a + b.value, 0);
  let cumulative = 0;
  const cx = 50; const cy = 50; const r = 38; const innerR = 24;
  const segments = donutData.map(d => {
    const startAngle = (cumulative / total) * 360 - 90;
    cumulative += d.value;
    const endAngle = (cumulative / total) * 360 - 90;
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
    const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
    return {
      ...d,
      path: `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y} Z`,
    };
  });

  const maxAge = Math.max(...AGE_GROUPS.map(g => g.total));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Demografia da Audiência</h3>
          <p className="text-[12px] text-gray-400">Clique em uma barra ou no donut para insights detalhados</p>
        </div>
        <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 text-[12px]">
          👤
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Bar chart - age groups */}
        <div className="flex-1 w-full">
          <div className="flex items-end gap-2 h-44">
            {AGE_GROUPS.map(group => (
              <div key={group.range} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col items-center gap-0.5 justify-end" style={{ height: '140px' }}>
                  {/* Feminino bar */}
                  <button
                    onClick={() => onAgeClick(group.range)}
                    className="w-full rounded-t-sm hover:opacity-80 transition-opacity"
                    style={{
                      height: `${(group.feminino / maxAge) * 120}px`,
                      background: '#FF5C00',
                      minHeight: 4,
                    }}
                    title={`Feminino ${group.feminino}%`}
                  />
                  {/* Masculino bar */}
                  <button
                    onClick={() => onAgeClick(group.range)}
                    className="w-full hover:opacity-80 transition-opacity"
                    style={{
                      height: `${(group.masculino / maxAge) * 120}px`,
                      background: '#7C3AED',
                      minHeight: 4,
                    }}
                    title={`Masculino ${group.masculino}%`}
                  />
                </div>
                <p className="text-[9px] text-gray-400 whitespace-nowrap">{group.range}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">Faixa etária = % de audiência · clique para detalhes</p>
        </div>

        {/* Donut */}
        <div className="flex items-center gap-5 shrink-0">
          <svg viewBox="0 0 100 100" className="w-28 h-28">
            {segments.map(s => (
              <path
                key={s.label}
                d={s.path}
                fill={s.color}
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  if (s.label === 'Feminino') onGenderClick('feminino');
                  else if (s.label === 'Masculino') onGenderClick('masculino');
                }}
              />
            ))}
          </svg>
          <div className="space-y-2">
            {donutData.map(d => (
              <button
                key={d.label}
                onClick={() => {
                  if (d.label === 'Feminino') onGenderClick('feminino');
                  else if (d.label === 'Masculino') onGenderClick('masculino');
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[12px] text-gray-700">{d.label}</span>
                <span className="text-[12px] font-bold text-gray-900">{d.value}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Geographic Reach Section ─────────────────────────────────────────────────

type GeoTab = 'Cidades' | 'Regiões' | 'Países';

function GeoSection({ onCityClick }: { onCityClick: (city: typeof GEO_DATA[0]) => void }) {
  const [tab, setTab] = useState<GeoTab>('Cidades');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[#FF5C00]">📍</span>
            <h3 className="text-[15px] font-bold text-gray-900">Alcance Geográfico</h3>
          </div>
          <p className="text-[12px] text-gray-400">Top localizações · clique em uma linha para insights</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
          {(['Cidades', 'Regiões', 'Países'] as GeoTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-3 py-1 rounded-lg text-[11px] font-semibold transition-all',
                tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {GEO_DATA.map(city => (
          <button
            key={city.city}
            onClick={() => onCityClick(city)}
            className="w-full flex items-center gap-3 hover:bg-gray-50 rounded-xl px-2 py-2 transition-colors text-left group"
          >
            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: city.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-800 group-hover:text-gray-900">{city.city}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(city.pct / GEO_DATA[0].pct) * 100}%`, background: city.color }}
                />
              </div>
              <span className="text-[13px] font-bold text-gray-700 w-10 text-right">{city.pct}%</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ROI Calculator ───────────────────────────────────────────────────────────

function RoiCalculator() {
  const [mode, setMode] = useState<'Orgânico' | 'Pago'>('Pago');
  const [values, setValues] = useState({
    receita: 48000,
    midia: 8500,
    criativo: 2400,
    conversoes: 612,
    horas: 36,
    taxaPorHora: 180,
  });

  const investimentoTotal = values.midia + values.criativo + (values.horas * values.taxaPorHora);
  const roi = investimentoTotal > 0 ? ((values.receita - investimentoTotal) / investimentoTotal) * 100 : 0;
  const roas = values.midia > 0 ? values.receita / values.midia : 0;
  const cpa = values.conversoes > 0 ? investimentoTotal / values.conversoes : 0;
  const hookRate = 24.6; // mock

  const handleChange = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value.replace(/[^0-9.]/g, '')) || 0;
    setValues(prev => ({ ...prev, [key]: v }));
  };

  const inputClass = "w-full border-0 border-b border-gray-200 py-2 text-[14px] font-semibold text-gray-900 bg-transparent focus:outline-none focus:border-[#FF5C00] transition-colors";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-[15px] font-bold text-gray-900">Calculadora de ROI</h3>
          <p className="text-[12px] text-gray-400">Retorno sobre investimento + ROAS, CPA, Hook Rate</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
          {(['Orgânico', 'Pago'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all',
                mode === m ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Inputs grid */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6">
        {[
          { label: 'RECEITA ATRIBUÍDA (R$)', key: 'receita' as const },
          { label: 'INVESTIMENTO EM MÍDIA (R$)', key: 'midia' as const },
          { label: 'CUSTO CRIATIVO (R$)', key: 'criativo' as const },
          { label: 'CONVERSÕES', key: 'conversoes' as const },
          { label: 'HORAS DE GESTÃO', key: 'horas' as const },
          { label: 'TAXA POR HORA (R$)', key: 'taxaPorHora' as const },
        ].map(({ label, key }) => (
          <div key={key}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <input
              type="text"
              className={inputClass}
              value={values[key]}
              onChange={handleChange(key)}
            />
          </div>
        ))}
      </div>

      {/* Results bar */}
      <div className="grid grid-cols-5 gap-2 pt-4 border-t border-gray-100">
        <div className="text-center bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">INVESTIDO</p>
          <p className="text-[16px] font-black text-gray-900">{fmtCurrency(investimentoTotal)}</p>
        </div>
        <div className="text-center bg-green-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ROI</p>
          <p className="text-[20px] font-black" style={{ color: roi >= 0 ? '#22C55E' : '#EF4444' }}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(0)}%
          </p>
        </div>
        <div className="text-center bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">ROAS</p>
          <p className="text-[16px] font-black text-gray-900">{roas.toFixed(2)}x</p>
        </div>
        <div className="text-center bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">CPA</p>
          <p className="text-[16px] font-black text-gray-900">{fmtCurrency(cpa)}</p>
        </div>
        <div className="text-center bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">HOOK</p>
          <p className="text-[16px] font-black" style={{ color: '#FF5C00' }}>{hookRate}%</p>
          <p className="text-[9px] text-gray-400">3s/imp</p>
        </div>
      </div>

      {/* Formula footer */}
      <p className="text-center text-[10px] text-gray-300 mt-3">
        ROI = (Receita − Investimento Total) ÷ Investimento Total × 100 · ROAS = Receita ÷ Mídia · CPA = Custo ÷ Conversões
      </p>

      {/* Footer tag */}
      <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-gray-50">
        <span className="text-[10px] text-gray-400">⚡ Dados em tempo real via Firebase · Atribuição UTM + Lead Scoring habilitados</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ModalState =
  | { type: 'kpi'; key: KpiKey }
  | { type: 'golden' }
  | { type: 'heatcell'; day: number; hour: number; value: number }
  | { type: 'content'; item: typeof CONTENT_TYPES[0] }
  | { type: 'geo'; city: typeof GEO_DATA[0] }
  | { type: 'age'; range: string }
  | { type: 'gender'; gender: 'feminino' | 'masculino' }
  | null;

const PLATFORM_FILTERS: { key: PlatformFilter; label: string; color: string }[] = [
  { key: 'todas',     label: 'Todas',    color: '' },
  { key: 'instagram', label: 'Instagram', color: '#E1306C' },
  { key: 'facebook',  label: 'Facebook',  color: '#1877F2' },
  { key: 'youtube',   label: 'YouTube',   color: '#FF0000' },
  { key: 'tiktok',    label: 'TikTok',    color: '#010101' },
  { key: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2' },
];

const CATEGORY_FILTERS: { key: CategoryFilter; label: string }[] = [
  { key: 'engajamento', label: 'Engajamento' },
  { key: 'alcance',     label: 'Alcance'     },
  { key: 'conversao',   label: 'Conversão'   },
  { key: 'crescimento', label: 'Crescimento' },
];

const DEFAULT_SECTIONS = Object.fromEntries(SECTIONS.map(s => [s.id, true]));

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [modal,          setModal]          = useState<ModalState>(null);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('todas');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('engajamento');
  const [period,         setPeriod]         = useState('30 dias');
  const [showCustomize,  setShowCustomize]  = useState(false);
  const [sections,       setSections]       = useState<Record<string, boolean>>(DEFAULT_SECTIONS);

  const { data: contas } = useUserCollection<ConnectedAccount>(user?.uid ?? null, 'connectedAccounts');

  const toggleSection = (id: string) => setSections(s => ({ ...s, [id]: !s[id] }));

  const activeKpis: KpiKey[] = categoryFilter === 'alcance'
    ? REACH_KPIS
    : ENGAGEMENT_KPIS;

  return (
    <div className="space-y-5 animate-fade-in pb-10">

      {/* Modals */}
      {modal?.type === 'kpi'      && <KpiDetailModal kpiKey={modal.key} onClose={() => setModal(null)} />}
      {modal?.type === 'golden'   && <GoldenWindowModal onClose={() => setModal(null)} />}
      {modal?.type === 'heatcell' && <HeatCellModal day={modal.day} hour={modal.hour} value={modal.value} onClose={() => setModal(null)} />}
      {modal?.type === 'content'  && <ContentTypeModal type={modal.item} onClose={() => setModal(null)} />}
      {modal?.type === 'geo'      && <GeoModal city={modal.city} onClose={() => setModal(null)} />}
      {modal?.type === 'age'      && <AgeGroupModal range={modal.range} onClose={() => setModal(null)} />}
      {modal?.type === 'gender'   && <GenderModal gender={modal.gender} onClose={() => setModal(null)} />}

      {/* Customize Panel */}
      <CustomizePanel
        visible={showCustomize}
        onClose={() => setShowCustomize(false)}
        enabled={sections}
        onToggle={toggleSection}
      />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-black text-gray-900" style={{ fontFamily: "'Aileron', sans-serif" }}>
            Analytics & Inteligência
          </h2>
          <p className="text-[13px] text-gray-500 mt-0.5">Performance unificada das suas contas conectadas · atualização em tempo real</p>
        </div>
        <SyncDot />
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {PLATFORM_FILTERS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => setPlatformFilter(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all',
                platformFilter === key
                  ? key === 'todas' ? 'bg-[#FF5C00] text-white' : 'text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              )}
              style={platformFilter === key && key !== 'todas' ? { background: color } : {}}
            >
              {key !== 'todas' && (
                <span className="w-2 h-2 rounded-full" style={{ background: platformFilter === key ? 'rgba(255,255,255,0.8)' : color }} />
              )}
              {label}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-gray-200" />

        <div className="flex items-center gap-1">
          {CATEGORY_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all',
                categoryFilter === key ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none"
          >
            {['7 dias', '30 dias', '90 dias'].map(p => <option key={p}>{p}</option>)}
          </select>

          <button
            onClick={() => setShowCustomize(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300 transition-all"
          >
            <span>⊞</span> Personalizar visão
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-300">
            <span>⬇</span> Exportar
          </button>

          <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[12px] font-semibold text-white shadow-sm" style={{ background: '#FF5C00' }}>
            ✨ Insights IA
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      {sections.kpis && (
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">
            KPIS · {platformFilter === 'todas' ? 'TODAS' : platformFilter.toUpperCase()} · {period.toUpperCase()}
            <span className="ml-2 text-gray-300 normal-case font-normal">↑ vs. período anterior</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeKpis.map(key => (
              <KpiCard key={key} kpiKey={key} onClick={() => setModal({ type: 'kpi', key })} />
            ))}
          </div>
        </div>
      )}

      {/* ── Engagement Chart + Conversion Funnel ── */}
      {(sections.engagement || sections.funnel) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {sections.engagement && (
            <div className="lg:col-span-2">
              <EngagementChart />
            </div>
          )}
          {sections.funnel && (
            <div className="lg:col-span-1">
              <ConversionFunnel />
            </div>
          )}
        </div>
      )}

      {/* ── Heatmap ── */}
      {sections.heatmap && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 pb-4">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-[15px] font-bold text-gray-900">Heatmap de Engajamento</h3>
                <p className="text-[12px] text-gray-400">Densidade de interações por hora e dia da semana (últimos 90 dias)</p>
              </div>
              <div className="flex items-center gap-4">
                {/* Legend */}
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <span className="text-gray-400">Baixo</span>
                  <div className="flex gap-0.5">
                    {['rgba(254,226,226,0.5)', 'rgba(254,180,150,0.7)', 'rgba(251,120,70,0.8)', 'rgba(239,80,30,0.9)', 'rgba(210,50,10,1)'].map((c, i) => (
                      <span key={i} className="w-4 h-2.5 rounded-sm inline-block" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-gray-400">Alto</span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div style={{ minWidth: 700 }}>
                {/* Hour labels */}
                <div className="flex mb-1 ml-9">
                  {HOURS.map(h => (
                    <div key={h} className="flex-1 text-center text-[8px] text-gray-300 font-medium">
                      {h % 3 === 0 ? `${String(h).padStart(2,'0')}` : ''}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {DAYS_SHORT.map((day, d) => (
                  <div key={day} className="flex items-center mb-0.5 gap-0.5">
                    <div className="text-[10px] text-gray-400 font-medium w-8 text-right pr-1 shrink-0">{day}</div>
                    {HOURS.map(h => (
                      <div key={h} className="flex-1">
                        <HeatCell
                          value={HEATMAP[d][h]}
                          day={d} hour={h}
                          onClick={() => setModal({ type: 'heatcell', day: d, hour: h, value: HEATMAP[d][h] })}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Golden Window banner at the bottom - fidelity to screenshot */}
          <div
            className="flex items-center justify-between px-6 py-3"
            style={{ background: '#FFF7F0', borderTop: '1px solid #FFE5CC' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ background: '#FF5C00' }}
              >
                <span className="text-white text-[13px]">⭐</span>
              </div>
              <div>
                <span className="text-[13px] font-bold text-gray-900">Janela de Ouro detectada</span>
                <span className="text-[12px] text-gray-600 ml-2">
                  Terça a Quinta · <strong>19h–21h</strong> entrega{' '}
                  <span className="font-bold text-[#FF5C00]">+47%</span> de velocity inicial. Clique para ver insights e aplicar.
                </span>
              </div>
            </div>
            <button
              onClick={() => setModal({ type: 'golden' })}
              className="text-[12px] font-bold whitespace-nowrap"
              style={{ color: '#FF5C00' }}
            >
              Ver insights →
            </button>
          </div>
        </div>
      )}

      {/* ── Audience Demographics + Geographic Reach ── */}
      {(sections.audience || sections.geo) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {sections.audience && (
            <AudienceDemographics
              onAgeClick={(range) => setModal({ type: 'age', range })}
              onGenderClick={(gender) => setModal({ type: 'gender', gender })}
            />
          )}
          {sections.geo && (
            <GeoSection onCityClick={(city) => setModal({ type: 'geo', city })} />
          )}
        </div>
      )}

      {/* ── Platform Radar ── */}
      {sections.platforms && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="mb-4">
            <h3 className="text-[15px] font-bold text-gray-900">Performance por Plataforma</h3>
            <p className="text-[12px] text-gray-400">Radar comparativo multidimensional</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={RADAR_DATA}>
              <PolarGrid stroke="#f0f0f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
              <Radar name="Instagram" dataKey="instagram" stroke="#E1306C" fill="#E1306C" fillOpacity={0.12} strokeWidth={2} />
              <Radar name="TikTok"    dataKey="tiktok"    stroke="#00CED1" fill="#00CED1" fillOpacity={0.12} strokeWidth={2} />
              <Radar name="LinkedIn"  dataKey="linkedin"  stroke="#0A66C2" fill="#0A66C2" fillOpacity={0.12} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Content Types ── */}
      {sections.contenttypes && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-[15px] font-bold text-gray-900">Tipos de Conteúdo</h3>
              <p className="text-[12px] text-gray-400">Engajamento e alcance médio por formato</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CONTENT_TYPES.map((ct) => (
              <button
                key={ct.type}
                onClick={() => setModal({ type: 'content', item: ct })}
                className="p-4 rounded-2xl border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left group"
              >
                <span className="text-2xl mb-2 block">{ct.icon}</span>
                <p className="text-[13px] font-bold text-gray-900">{ct.type}</p>
                <p className="text-[11px] text-gray-400 mb-2">{ct.posts} posts</p>
                <p className="text-[20px] font-black leading-none" style={{ color: ct.color }}>{ct.eng}%</p>
                <p className="text-[10px] text-gray-400 mt-0.5">eng. médio</p>
                <div className={cn('mt-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold', ct.roi === 'Alto' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600')}>
                  {ct.roi} ROI
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── ROI Calculator ── */}
      {sections.roi && <RoiCalculator />}

    </div>
  );
}
