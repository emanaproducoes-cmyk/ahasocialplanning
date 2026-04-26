import { useState, useMemo } from "react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";
import { X, Settings2, TrendingUp, TrendingDown, Users, MapPin, Globe, Zap, Target, Clock, ChevronRight, Info, Sparkles, BarChart2, Layout } from "lucide-react";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  orange: "#F97316",
  orangeLight: "#FED7AA",
  orangeSoft: "#FFF7ED",
  purple: "#7C3AED",
  purpleLight: "#C4B5FD",
  green: "#10B981",
  blue: "#3B82F6",
  red: "#EF4444",
  yellow: "#F59E0B",
  dark: "#111827",
  gray: "#6B7280",
  grayLight: "#F3F4F6",
  border: "#E5E7EB",
  white: "#FFFFFF",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const KPI_DATA = [
  { id: "curtidas", label: "Curtidas", value: "184.3K", change: +12.4, unit: "", peak: "Quinta · 20h", sector: "Top 12%", daily: "6.1K", sparkline: [120,145,132,160,155,178,184], color: C.orange, icon: "❤️" },
  { id: "comentarios", label: "Comentários", value: "23.7K", change: +8.2, unit: "", peak: "Ter · 19h", sector: "Top 18%", daily: "789", sparkline: [80,92,88,105,98,115,118], color: C.purple, icon: "💬" },
  { id: "alcance", label: "Alcance", value: "1.17M", change: +5.6, unit: "", peak: "Seg · 21h", sector: "Top 9%", daily: "39K", sparkline: [900,1020,980,1080,1050,1120,1170], color: C.blue, icon: "📡" },
  { id: "impressoes", label: "Impressões", value: "3.4M", change: +3.1, unit: "", peak: "Dom · 20h", sector: "Top 15%", daily: "113K", sparkline: [2800,3000,2950,3100,3050,3250,3400], color: C.green, icon: "👁️" },
  { id: "engajamento", label: "Eng. Médio", value: "6.24%", change: +0.8, unit: "%", peak: "Qui · 19h", sector: "Top 7%", daily: "—", sparkline: [5.1,5.4,5.3,5.8,5.7,6.0,6.24], color: C.yellow, icon: "⚡" },
  { id: "salvamentos", label: "Salvamentos", value: "41.2K", change: +18.9, unit: "", peak: "Sex · 20h", sector: "Top 5%", daily: "1.4K", sparkline: [25,28,30,35,36,39,41], color: "#EC4899", icon: "🔖" },
  { id: "compartilhamentos", label: "Compart.", value: "29.8K", change: +14.2, unit: "", peak: "Qui · 18h", sector: "Top 11%", daily: "993", sparkline: [18,21,20,25,24,27,29], color: "#06B6D4", icon: "🔄" },
  { id: "seguidores", label: "Seguidores", value: "+8.4K", change: +22.1, unit: "", peak: "Seg · 20h", sector: "Top 6%", daily: "+280", sparkline: [5,6,6.5,7,7.2,7.9,8.4], color: C.orange, icon: "👥" },
  { id: "cliques", label: "Cliques Link", value: "12.1K", change: -2.3, unit: "", peak: "Ter · 12h", sector: "Top 22%", daily: "403", sparkline: [14,13.5,13,12.8,12.5,12.2,12.1], color: C.red, icon: "🔗" },
  { id: "receita", label: "Receita Attr.", value: "R$ 118", change: +31.4, unit: "K", peak: "Qui · 19h", sector: "Top 4%", daily: "R$ 3.9K", sparkline: [70,80,85,95,100,110,118], color: C.green, icon: "💰" },
];

const TIMELINE_DATA = [
  { mes: "Jan", curtidas: 120, comentarios: 45, alcance: 820, salvamentos: 28 },
  { mes: "Fev", curtidas: 145, comentarios: 52, alcance: 950, salvamentos: 32 },
  { mes: "Mar", curtidas: 132, comentarios: 48, alcance: 880, salvamentos: 29 },
  { mes: "Abr", curtidas: 168, comentarios: 61, alcance: 1040, salvamentos: 38 },
  { mes: "Mai", curtidas: 155, comentarios: 58, alcance: 990, salvamentos: 35 },
  { mes: "Jun", curtidas: 178, comentarios: 67, alcance: 1120, salvamentos: 42 },
  { mes: "Jul", curtidas: 192, comentarios: 72, alcance: 1200, salvamentos: 46 },
  { mes: "Ago", curtidas: 184, comentarios: 69, alcance: 1150, salvamentos: 44 },
  { mes: "Set", curtidas: 201, comentarios: 76, alcance: 1280, salvamentos: 50 },
  { mes: "Out", curtidas: 218, comentarios: 82, alcance: 1380, salvamentos: 55 },
  { mes: "Nov", curtidas: 235, comentarios: 89, alcance: 1490, salvamentos: 61 },
  { mes: "Dez", curtidas: 248, comentarios: 94, alcance: 1570, salvamentos: 65 },
];

const FUNNEL_DATA = [
  { label: "Visitantes", value: 420000, pct: 100, color: C.orange },
  { label: "Engajados", value: 89400, pct: 21.3, color: "#FB923C" },
  { label: "Leads", value: 12600, pct: 3.0, color: C.purple },
  { label: "Vendas", value: 2100, pct: 0.5, color: C.green },
];

const HEATMAP_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) => i);

function generateHeatmapData() {
  const data = {};
  HEATMAP_DAYS.forEach((day, di) => {
    HEATMAP_HOURS.forEach((h) => {
      const isGolden = (di >= 1 && di <= 4) && (h >= 19 && h <= 21);
      const isPeak = (h >= 6 && h <= 8) || (h >= 19 && h <= 22);
      const isWeekend = di === 0 || di === 6;
      let base = isPeak ? 55 : 20;
      if (isWeekend) base *= 0.85;
      if (isGolden) base = 85 + Math.random() * 15;
      base += (Math.random() - 0.5) * 20;
      data[`${day}-${h}`] = Math.max(5, Math.min(100, Math.round(base)));
    });
  });
  return data;
}
const HEATMAP_DATA = generateHeatmapData();

const AGE_DATA = [
  { faixa: "13-17", f: 3, m: 2, total: 5 },
  { faixa: "18-24", f: 14, m: 10, total: 24 },
  { faixa: "25-34", f: 18, m: 14, total: 32 },
  { faixa: "35-44", f: 14, m: 11, total: 26 },
  { faixa: "45-54", f: 5, m: 4, total: 9 },
  { faixa: "55-64", f: 2, m: 2, total: 4 },
  { faixa: "65+",   f: 0, m: 0, total: 0 },
];

const GENDER_DATA = [
  { name: "Feminino", value: 54, color: C.orange },
  { name: "Masculino", value: 41, color: C.purple },
  { name: "N/I", value: 5, color: "#D1D5DB" },
];

const LOCATIONS = {
  cidades: [
    { name: "São Paulo, SP", pct: 28.4, engLocal: "7.6%", cpm: "R$ 11", pico: "20h" },
    { name: "Rio de Janeiro, RJ", pct: 14.1, engLocal: "6.9%", cpm: "R$ 13", pico: "21h" },
    { name: "Belo Horizonte, MG", pct: 7.6, engLocal: "6.1%", cpm: "R$ 9", pico: "20h" },
    { name: "Porto Alegre, RS", pct: 5.8, engLocal: "5.8%", cpm: "R$ 8", pico: "19h" },
    { name: "Curitiba, PR", pct: 5.2, engLocal: "5.5%", cpm: "R$ 8", pico: "20h" },
    { name: "Brasília, DF", pct: 4.7, engLocal: "7.1%", cpm: "R$ 12", pico: "19h" },
    { name: "Salvador, BA", pct: 4.1, engLocal: "5.2%", cpm: "R$ 7", pico: "21h" },
  ],
  regioes: [
    { name: "Sudeste", pct: 58.2, engLocal: "7.1%", cpm: "R$ 11", pico: "20h" },
    { name: "Sul", pct: 14.1, engLocal: "5.9%", cpm: "R$ 9", pico: "19h" },
    { name: "Nordeste", pct: 12.8, engLocal: "5.4%", cpm: "R$ 7", pico: "21h" },
    { name: "Centro-Oeste", pct: 8.3, engLocal: "6.3%", cpm: "R$ 10", pico: "19h" },
    { name: "Norte", pct: 6.6, engLocal: "4.8%", cpm: "R$ 6", pico: "20h" },
  ],
  paises: [
    { name: "Brasil", pct: 87.4, engLocal: "6.5%", cpm: "R$ 10", pico: "20h" },
    { name: "Portugal", pct: 4.2, engLocal: "5.1%", cpm: "R$ 14", pico: "21h" },
    { name: "EUA", pct: 3.1, engLocal: "4.8%", cpm: "R$ 18", pico: "18h" },
    { name: "Angola", pct: 1.8, engLocal: "4.2%", cpm: "R$ 5", pico: "19h" },
    { name: "Outros", pct: 3.5, engLocal: "4.0%", cpm: "—", pico: "—" },
  ],
};

const PLATFORM_RADAR = [
  { metric: "Alcance", Instagram: 72, TikTok: 88, LinkedIn: 45, YouTube: 80 },
  { metric: "Engajamento", Instagram: 68, TikTok: 91, LinkedIn: 52, YouTube: 74 },
  { metric: "Conversão", Instagram: 58, TikTok: 42, LinkedIn: 78, YouTube: 65 },
  { metric: "Crescimento", Instagram: 62, TikTok: 94, LinkedIn: 40, YouTube: 71 },
  { metric: "CTR", Instagram: 55, TikTok: 48, LinkedIn: 82, YouTube: 60 },
  { metric: "Retenção", Instagram: 50, TikTok: 85, LinkedIn: 60, YouTube: 88 },
];

const CONTENT_TYPES = [
  { type: "Reels", posts: 38, alcance: "560K", eng: 7.2, color: "#EC4899" },
  { type: "Carrossel", posts: 26, alcance: "320K", eng: 5.8, color: C.orange },
  { type: "Vídeo", posts: 12, alcance: "410K", eng: 6.1, color: C.blue },
  { type: "Stories", posts: 84, alcance: "240K", eng: 4.6, color: C.purple },
  { type: "Imagem", posts: 22, alcance: "180K", eng: 3.4, color: C.yellow },
];

const PLATFORM_COLORS = { Instagram: C.orange, TikTok: "#000", LinkedIn: C.blue, YouTube: C.red };

const SECTIONS = [
  { id: "kpis", label: "KPIs principais", desc: "Curtidas, comentários, mensagens, alcance..." },
  { id: "timeline", label: "Evolução de engajamento", desc: "Linha do tempo com 4 séries" },
  { id: "funnel", label: "Funil de conversão", desc: "Visitantes → Leads → Vendas" },
  { id: "heatmap", label: "Heatmap de horários", desc: "Densidade 7×24" },
  { id: "demo", label: "Demografia da audiência", desc: "Idade × gênero" },
  { id: "geo", label: "Alcance geográfico", desc: "Cidades, regiões e países" },
  { id: "platforms", label: "Performance por plataforma", desc: "Radar comparativo" },
  { id: "content", label: "Tipos de conteúdo", desc: "Reels, Carrossel, Stories..." },
  { id: "roi", label: "Calculadora de ROI", desc: "ROAS · CPA · Hook Rate" },
];

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────
function Sparkline({ data, color }) {
  const max = Math.max(...data), min = Math.min(...data);
  const w = 80, h = 28, pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} opacity="0.8" />
      <polyline fill={color} fillOpacity="0.12" stroke="none"
        points={`0,${h} ${pts} ${w},${h}`} />
    </svg>
  );
}

function Badge({ children, color = C.orange, light = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 10px", borderRadius: 20,
      background: light ? color + "18" : color,
      color: light ? color : "#fff",
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3
    }}>{children}</span>
  );
}

function InsightIA({ text }) {
  return (
    <div style={{
      display: "flex", gap: 10, padding: "12px 14px",
      background: "linear-gradient(135deg, #FFF7ED, #FEF3C7)",
      borderRadius: 10, border: `1px solid ${C.orangeLight}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: `linear-gradient(135deg, ${C.orange}, ${C.purple})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 14
      }}>✨</div>
      <div>
        <span style={{ fontWeight: 700, color: C.orange, fontSize: 12 }}>Insight IA · </span>
        <span style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>{text}</span>
      </div>
    </div>
  );
}

function Modal({ open, onClose, width = 520, children }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: width,
        maxHeight: "88vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        animation: "modalIn 0.2s ease"
      }} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.dark }}>{title}</h3>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13, color: C.gray }}>{subtitle}</p>}
      </div>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray, padding: 4 }}>
        <X size={18} />
      </button>
    </div>
  );
}

function StatRow({ label, value, color = C.orange, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 11, color: C.gray, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.2 }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: C.gray }}>{sub}</span>}
    </div>
  );
}

function SectionCard({ id, title, subtitle, children, visible = true }) {
  if (!visible) return null;
  return (
    <div id={id} style={{
      background: "#fff", borderRadius: 16, padding: 24,
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: `1px solid ${C.border}`
    }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.dark }}>{title}</h2>
        {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12, color: C.gray }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function KpiModal({ kpi, onClose }) {
  const topPosts = [
    { title: "Bastidores do lançamento", platform: "Instagram", value: "39.8K" },
    { title: "Tutorial em 60s", platform: "TikTok", value: "28.4K" },
    { title: "Antes & depois do cliente", platform: "Instagram", value: "26.4K" },
    { title: "Reels com áudio viral", platform: "YouTube", value: "18.2K" },
  ];
  const breakdown = [
    { platform: "Instagram", value: "16.7K", change: "+13.9%" },
    { platform: "Facebook", value: "69.5K", change: "+11.9%" },
    { platform: "YouTube", value: "40.7K", change: "+15.4%" },
    { platform: "TikTok", value: "60.6K", change: "+18.5%" },
    { platform: "LinkedIn", value: "41.1K", change: "+18.5%" },
  ];
  return (
    <Modal open={!!kpi} onClose={onClose} width={620}>
      <ModalHeader
        title={`${kpi?.label} · Todas`}
        subtitle="Análise aprofundada com tendências, ranking e recomendações."
        onClose={onClose}
      />
      <div style={{ padding: "20px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
          <StatRow label="Total no período" value={kpi?.value} color={C.orange} sub={`${kpi?.change > 0 ? "+" : ""}${kpi?.change}% vs. anterior`} />
          <StatRow label="Média diária" value={kpi?.daily} color={C.dark} sub="Últimos 30 dias" />
          <StatRow label="Pico no período" value={kpi?.peak} color={C.green} />
          <StatRow label="Posição no setor" value={kpi?.sector} color={C.orange} sub="vs. perfis similares" />
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: C.gray, marginBottom: 8 }}>Comparativo Atual × Período Anterior — 12 meses</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={TIMELINE_DATA}>
              <defs>
                <linearGradient id="gOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.orange} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.orange} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="curtidas" stroke={C.orange} fill="url(#gOrange)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="comentarios" stroke="#D1D5DB" fill="none" strokeDasharray="4 2" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Quebra por Plataforma</p>
            {breakdown.map(b => (
              <div key={b.platform} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: PLATFORM_COLORS[b.platform] || C.gray }} />
                  <span style={{ fontSize: 12 }}>{b.platform}</span>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{b.value}</span>
                  <Badge color={C.green} light>{b.change}</Badge>
                </div>
              </div>
            ))}
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 10 }}>Top Posts Contribuintes</p>
            {topPosts.map((p, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: C.orangeLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: C.orange, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: C.gray }}>{p.platform}</p>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.dark }}>{p.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <InsightIA text={`${kpi?.label} está acelerando ${kpi?.change}% vs. o período anterior. Com o ritmo atual, projetamos crescimento de 12% no próximo mês. Para potencializar, replique o formato dos top 3 posts.`} />
        </div>
      </div>
    </Modal>
  );
}

function HeatmapModal({ cell, onClose }) {
  if (!cell) return null;
  const intensity = HEATMAP_DATA[`${cell.day}-${cell.hour}`] || 50;
  const isGolden = ["Seg","Ter","Qua","Qui"].includes(cell.day) && cell.hour >= 19 && cell.hour <= 21;
  return (
    <Modal open={!!cell} onClose={onClose} width={440}>
      <ModalHeader
        title={`${cell.day} · ${String(cell.hour).padStart(2,"0")}:00`}
        subtitle={`Intensidade pico · ${intensity}/100`}
        onClose={onClose}
      />
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
          <StatRow label="Intensidade" value={`${intensity}/100`} color={intensity > 70 ? C.orange : C.gray} />
          <StatRow label="Posts média" value="6" sub="por semana" color={C.dark} />
          <StatRow label="Eng. médio" value="6.1%" color={C.green} />
        </div>
        {isGolden && (
          <div style={{ padding: "10px 14px", background: "#FFF7ED", borderRadius: 10, border: `1px solid ${C.orangeLight}`, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 18 }}>🏆</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: C.orange }}>Janela de Ouro detectada</p>
              <p style={{ margin: 0, fontSize: 11, color: "#92400E" }}>Este horário entrega +47% de velocity inicial</p>
            </div>
          </div>
        )}
        <InsightIA text={isGolden ? "Este é um horário premium. Reserve seus melhores formatos (Reels, vídeos) para esta janela." : "Em relação aos demais horários, este ponto representa uma oportunidade acima da média semanal."} />
        <div style={{ marginTop: 12, padding: 12, background: C.grayLight, borderRadius: 10 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Clock size={14} color={C.gray} />
            <span style={{ fontSize: 12, color: C.gray }}>Comparação com a semana</span>
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: C.dark }}>Em relação aos demais horários, este ponto representa uma das {intensity > 65 ? "maiores" : "medianas"} oportunidades da semana.</p>
        </div>
      </div>
    </Modal>
  );
}

function AgeModal({ age, onClose }) {
  if (!age) return null;
  return (
    <Modal open={!!age} onClose={onClose} width={520}>
      <ModalHeader
        title={`Faixa etária ${age.faixa}`}
        subtitle={`${age.total}% da sua audiência total — análise comportamental e recomendações.`}
        onClose={onClose}
      />
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
          <StatRow label="Total na faixa" value={`${age.total}%`} color={C.orange} />
          <StatRow label="Feminino" value={`${Math.round(age.f/(age.f+age.m)*100)}%`} color={C.orange} sub={`${age.f}% audiência`} />
          <StatRow label="Masculino" value={`${Math.round(age.m/(age.f+age.m)*100)}%`} color={C.purple} sub={`${age.m}% audiência`} />
          <StatRow label="Eng. médio" value="10.1%" color={C.green} sub="vs 5.8% global" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Conteúdos com Melhor Performance</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["Vídeos longos", "Análises", "Conteúdo prático"].map(t => (
              <Badge key={t} color={t === "Vídeos longos" ? C.red : t === "Análises" ? C.gray : C.blue} light>{t}</Badge>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Plataformas Preferidas</p>
          <div style={{ display: "flex", gap: 8 }}>
            <Badge color={C.red}>YouTube</Badge>
            <Badge color={C.blue}>Facebook</Badge>
            <Badge color="#0077B5">LinkedIn</Badge>
          </div>
        </div>
        <InsightIA text="Lê descrição inteira, salva conteúdo. Resposta forte a CTAs claros." />
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🎙️</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Tom de voz recomendado</p>
              <p style={{ margin: 0, fontSize: 12, color: C.gray }}>Profissional mas humano. Storytelling com dados, prova social, e propósito de marca.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>🕐</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Melhores horários para esta faixa</p>
              <p style={{ margin: 0, fontSize: 12, color: C.gray }}>08h–10h e 19h–22h</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>📈</div>
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Oportunidade detectada</p>
              <p style={{ margin: 0, fontSize: 12, color: C.gray }}>Esta faixa cresceu 8.4% nos últimos 90 dias. Considere campanha segmentada com pelo menos 3 peças/semana.</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function GenderModal({ gender, onClose }) {
  if (!gender) return null;
  const platforms = [
    { name: "Instagram", pct: 39, color: C.orange },
    { name: "Facebook", pct: 64, color: C.blue },
    { name: "YouTube", pct: 59, color: C.red },
    { name: "TikTok", pct: 62, color: "#000" },
    { name: "LinkedIn", pct: 48, color: "#0077B5" },
  ];
  return (
    <Modal open={!!gender} onClose={onClose} width={480}>
      <ModalHeader
        title={`Gênero · ${gender.name}`}
        subtitle={`${gender.value}% da sua audiência — comportamento e canais preferidos`}
        onClose={onClose}
      />
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          <StatRow label="% audiência" value={`${gender.value}%`} color={C.orange} />
          <StatRow label="Eng. médio" value="7.4%" color={C.green} sub="vs 5.8% global" />
          <StatRow label="Tempo na tela" value="2m 38s" color={C.dark} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Distribuição por Plataforma</p>
        {platforms.map(p => (
          <div key={p.name} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>{p.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{p.pct}%</span>
            </div>
            <div style={{ height: 6, background: C.border, borderRadius: 3 }}>
              <div style={{ height: "100%", width: `${p.pct}%`, background: p.color, borderRadius: 3 }} />
            </div>
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <InsightIA text={`Sua audiência ${gender.name.toLowerCase()} engaja 28% mais em conteúdos com narrativa pessoal e bastidores. Recomendado intensificar Reels com storytelling autoral.`} />
        </div>
      </div>
    </Modal>
  );
}

function LocationModal({ loc, onClose }) {
  if (!loc) return null;
  const platforms = [
    { name: "Instagram", pct: 10, color: C.orange },
    { name: "Facebook", pct: 31, color: C.blue },
    { name: "YouTube", pct: 20, color: C.red },
    { name: "TikTok", pct: 23, color: "#000" },
    { name: "LinkedIn", pct: 15, color: "#0077B5" },
  ];
  return (
    <Modal open={!!loc} onClose={onClose} width={500}>
      <ModalHeader
        title={loc.name}
        subtitle={`${loc.pct}% da sua audiência total · cidade`}
        onClose={onClose}
      />
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          <StatRow label="% audiência" value={`${loc.pct}%`} color={C.orange} />
          <StatRow label="Eng. local" value={loc.engLocal} color={C.green} sub="vs 5.8% global" />
          <StatRow label="Pico de hora" value={loc.pico} sub="Horário local" color={C.dark} />
          <StatRow label="CPM esperado" value={loc.cpm} sub="Tráfego pago" color={C.orange} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Mix de Plataformas Nesta Localização</p>
        {platforms.map(p => (
          <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: p.color }} />
              <span style={{ fontSize: 12 }}>{p.name}</span>
            </div>
            <div style={{ flex: 1, margin: "0 12px" }}>
              <div style={{ height: 5, background: C.border, borderRadius: 3 }}>
                <div style={{ height: "100%", width: `${p.pct * 3}%`, background: p.color, borderRadius: 3 }} />
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700 }}>{p.pct}%</span>
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <InsightIA text="Concentração de seguidores nesta cidade indica oportunidade de eventos presenciais, lives geo-segmentadas e parcerias com influenciadores locais." />
        </div>
        <div style={{ marginTop: 12, padding: "10px 14px", background: C.grayLight, borderRadius: 10 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Recomendação de campanha</p>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: C.gray }}>Para esta localização, criativos verticais (9:16) com legenda em português e CTA "saiba mais" performam 23% melhor.</p>
        </div>
      </div>
    </Modal>
  );
}

function ContentModal({ content, onClose }) {
  if (!content) return null;
  const playbooks = {
    Reels: ["Hook nos primeiros 3s", "Áudio trending", "CTA verbal no meio", "Legenda com emojis"],
    Carrossel: ["Slide 1 = gancho visual", "7–10 slides ideais", "Último slide = CTA", "Salve para depois"],
    Vídeo: ["Thumbnail clara", "Descrição completa SEO", "Cards e telas finais", "Legendas automáticas"],
    Stories: ["3–5 stories por série", "Enquetes geram +28%", "Link sticker acima da dobra", "Destaques organizados"],
    Imagem: ["Fundo contrastante", "Texto ≤ 20% da área", "Paleta consistente", "Alt text otimizado"],
  };
  return (
    <Modal open={!!content} onClose={onClose} width={500}>
      <ModalHeader
        title={`Performance · ${content.type}`}
        subtitle={`${content.posts} posts publicados · alcance ${content.alcance}`}
        onClose={onClose}
      />
      <div style={{ padding: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
          <StatRow label="Engajamento" value={`${content.eng}%`} color={content.color} />
          <StatRow label="Posts" value={content.posts} color={C.dark} />
          <StatRow label="Alcance" value={content.alcance} color={C.blue} />
        </div>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Playbook de Performance</p>
        {(playbooks[content.type] || []).map((tip, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: content.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: content.color, flexShrink: 0 }}>{i + 1}</div>
            <span style={{ fontSize: 13 }}>{tip}</span>
          </div>
        ))}
        <div style={{ marginTop: 16 }}>
          <InsightIA text={`${content.type} é o seu formato com maior potencial de crescimento. Aumentar frequência para ${content.posts + 5} posts/mês pode gerar +15% de alcance total.`} />
        </div>
      </div>
    </Modal>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [activeKpi, setActiveKpi] = useState(null);
  const [activeHeatCell, setActiveHeatCell] = useState(null);
  const [activeAge, setActiveAge] = useState(null);
  const [activeGender, setActiveGender] = useState(null);
  const [activeLocation, setActiveLocation] = useState(null);
  const [activeContent, setActiveContent] = useState(null);
  const [geoTab, setGeoTab] = useState("cidades");
  const [roiMode, setRoiMode] = useState("pago");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [visibleSections, setVisibleSections] = useState(
    Object.fromEntries(SECTIONS.map(s => [s.id, true]))
  );
  const [roi, setRoi] = useState({ receita: 48000, investimento: 8500, criativo: 2400, conversoes: 612, horas: 36, taxa: 180 });

  const roiCalc = useMemo(() => {
    const total = roi.investimento + roi.criativo + roi.horas * roi.taxa;
    const r = ((roi.receita - total) / total) * 100;
    const roas = roi.receita / roi.investimento;
    const cpa = roi.investimento / Math.max(roi.conversoes, 1);
    const hook = (roi.conversoes / Math.max(roi.receita / 100, 1));
    return { total, roi: r, roas, cpa, hook };
  }, [roi]);

  const toggleSection = (id) => setVisibleSections(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ fontFamily: "'DM Sans', 'Outfit', sans-serif", background: "#F9FAFB", minHeight: "100vh", color: C.dark }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        button { font-family: inherit; }
        input { font-family: inherit; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: #F3F4F6; }
        ::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 3px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: "#fff", borderBottom: `1px solid ${C.border}`, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.dark }}>Analytics</h1>
          <p style={{ margin: 0, fontSize: 12, color: C.gray }}>Dados em tempo real via Firebase · Atribuição UTM + Lead Scoring habilitados</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select style={{ fontSize: 12, padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer" }}>
            <option>Últimos 90 dias</option>
            <option>Últimos 30 dias</option>
            <option>Este mês</option>
            <option>Este ano</option>
          </select>
          <button
            onClick={() => setCustomizeOpen(true)}
            style={{ display: "flex", gap: 6, alignItems: "center", padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            <Layout size={14} /> Personalizar visão
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ padding: "24px", maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── KPIs ── */}
        {visibleSections.kpis && (
          <div>
            <h2 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700 }}>KPIs Principais</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {KPI_DATA.map(kpi => (
                <div key={kpi.id}
                  onClick={() => setActiveKpi(kpi)}
                  style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", border: `1px solid ${C.border}`, cursor: "pointer", transition: "box-shadow 0.15s", position: "relative", overflow: "hidden" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: kpi.color, borderRadius: "12px 12px 0 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: C.gray, fontWeight: 500 }}>{kpi.label}</span>
                    <span style={{ fontSize: 16 }}>{kpi.icon}</span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: C.dark }}>{kpi.value}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: kpi.change >= 0 ? C.green : C.red, fontWeight: 600 }}>
                      {kpi.change >= 0 ? "↑" : "↓"} {Math.abs(kpi.change)}%
                    </span>
                    <Sparkline data={kpi.sparkline} color={kpi.color} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TIMELINE + FUNNEL ── */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
          {visibleSections.timeline && (
            <SectionCard title="Evolução de Engajamento" subtitle="Linha do tempo com 4 séries — últimos 12 meses">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={TIMELINE_DATA}>
                  <defs>
                    {[C.orange, C.purple, C.blue, "#EC4899"].map((col, i) => (
                      <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={col} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={col} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="curtidas" name="Curtidas" stroke={C.orange} fill="url(#grad0)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="alcance" name="Alcance (K)" stroke={C.blue} fill="url(#grad2)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="comentarios" name="Comentários" stroke={C.purple} fill="url(#grad1)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="salvamentos" name="Salvamentos" stroke="#EC4899" fill="url(#grad3)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {visibleSections.funnel && (
            <SectionCard title="Funil de Conversão" subtitle="Visitantes → Leads → Vendas">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {FUNNEL_DATA.map((f, i) => (
                  <div key={f.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{f.value.toLocaleString("pt-BR")}</span>
                        <Badge color={f.color} light>{f.pct}%</Badge>
                      </div>
                    </div>
                    <div style={{ height: 10, background: C.border, borderRadius: 5, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${f.pct}%`, background: `linear-gradient(90deg, ${f.color}, ${f.color}cc)`, borderRadius: 5, transition: "width 0.5s ease" }} />
                    </div>
                    {i < FUNNEL_DATA.length - 1 && (
                      <div style={{ textAlign: "center", fontSize: 10, color: C.gray, margin: "2px 0" }}>
                        ↓ {((FUNNEL_DATA[i+1].value / f.value) * 100).toFixed(1)}% conversão
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: "8px 12px", background: C.orangeSoft, borderRadius: 8, fontSize: 11, color: "#92400E" }}>
                💡 Melhore o funil no estágio Engajados → Leads com CTAs diretos nos Stories
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── HEATMAP ── */}
        {visibleSections.heatmap && (
          <SectionCard title="Heatmap de Engajamento" subtitle="Densidade de interações por hora e dia da semana (últimos 90 dias)">
            <div style={{ overflowX: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: `48px repeat(24, 1fr)`, gap: 3, minWidth: 700 }}>
                {/* Header hours */}
                <div />
                {HEATMAP_HOURS.map(h => (
                  <div key={h} style={{ fontSize: 9, textAlign: "center", color: C.gray, paddingBottom: 4 }}>
                    {h === 0 || h % 3 === 0 ? `${String(h).padStart(2,"0")}` : ""}
                  </div>
                ))}
                {/* Rows */}
                {HEATMAP_DAYS.map((day, di) => (
                  <>
                    <div key={`label-${day}`} style={{ fontSize: 11, color: C.gray, display: "flex", alignItems: "center", paddingRight: 8 }}>{day}</div>
                    {HEATMAP_HOURS.map(h => {
                      const val = HEATMAP_DATA[`${day}-${h}`] || 0;
                      const isGolden = ["Seg","Ter","Qua","Qui"].includes(day) && h >= 19 && h <= 21;
                      const alpha = val / 100;
                      return (
                        <div
                          key={`${day}-${h}`}
                          onClick={() => setActiveHeatCell({ day, hour: h })}
                          title={`${day} ${h}:00 · ${val}/100`}
                          style={{
                            aspectRatio: "1",
                            borderRadius: 3,
                            background: isGolden
                              ? `rgba(249,115,22,${0.3 + alpha * 0.7})`
                              : `rgba(249,115,22,${alpha * 0.85})`,
                            border: isGolden ? `1px solid ${C.orange}` : "1px solid transparent",
                            cursor: "pointer",
                            transition: "transform 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.3)"; e.currentTarget.style.zIndex = "10"; }}
                          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.zIndex = "1"; }}
                        />
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 16, padding: "10px 14px", background: "#FFF7ED", borderRadius: 10, border: `1px solid ${C.orangeLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>🏆</span>
                <div>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.orange }}>Janela de Ouro detectada</p>
                  <p style={{ margin: 0, fontSize: 12, color: "#92400E" }}>Terça a Quinta · 19h–21h entrega +47% de velocity inicial. Clique para ver insights e aplicar.</p>
                </div>
              </div>
              <button style={{ fontSize: 12, color: C.orange, background: "none", border: "none", cursor: "pointer", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                Ver insights <ChevronRight size={14} />
              </button>
            </div>
          </SectionCard>
        )}

        {/* ── DEMOGRAPHICS + GEO ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {visibleSections.demo && (
            <SectionCard title="Demografia da Audiência" subtitle="Clique em uma barra ou no donut para insights detalhados">
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={AGE_DATA} barSize={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                      <XAxis dataKey="faixa" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="f" name="Feminino" fill={C.orange} stackId="a" radius={[0,0,0,0]} cursor="pointer"
                        onClick={(d) => setActiveAge(d)} />
                      <Bar dataKey="m" name="Masculino" fill={C.purple} stackId="a" radius={[3,3,0,0]} cursor="pointer"
                        onClick={(d) => setActiveAge(d)} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{ textAlign: "center", fontSize: 10, color: C.gray, marginTop: 4 }}>Faixa etária · % da audiência · clique para detalhes</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <PieChart width={120} height={120}>
                    <Pie data={GENDER_DATA} cx={55} cy={55} innerRadius={32} outerRadius={52} dataKey="value"
                      cursor="pointer" onClick={(d) => setActiveGender(d)}>
                      {GENDER_DATA.map((g, i) => <Cell key={i} fill={g.color} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ fontSize: 11 }}>
                    {GENDER_DATA.map(g => (
                      <div key={g.name} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: g.color }} />
                        <span>{g.name} {g.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </SectionCard>
          )}

          {visibleSections.geo && (
            <SectionCard title="Alcance Geográfico" subtitle="Top localizações · clique em uma linha para insights">
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {["cidades","regioes","paises"].map(tab => (
                  <button key={tab} onClick={() => setGeoTab(tab)}
                    style={{ padding: "5px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                      background: geoTab === tab ? C.orange : C.grayLight, color: geoTab === tab ? "#fff" : C.gray }}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              {LOCATIONS[geoTab].map(loc => (
                <div key={loc.name} onClick={() => setActiveLocation(loc)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <MapPin size={12} color={C.orange} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{loc.name}</span>
                  <div style={{ width: 80, height: 5, background: C.border, borderRadius: 3 }}>
                    <div style={{ height: "100%", width: `${(loc.pct / LOCATIONS[geoTab][0].pct) * 100}%`, background: C.orange, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, width: 40, textAlign: "right" }}>{loc.pct}%</span>
                </div>
              ))}
            </SectionCard>
          )}
        </div>

        {/* ── PLATFORM RADAR + CONTENT TYPES ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {visibleSections.platforms && (
            <SectionCard title="Performance por Plataforma" subtitle="Comparativo multidimensional · clique em uma plataforma para detalhes">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={PLATFORM_RADAR}>
                  <PolarGrid stroke="#F3F4F6" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  {Object.entries(PLATFORM_COLORS).map(([p, col]) => (
                    <Radar key={p} name={p} dataKey={p} stroke={col} fill={col} fillOpacity={0.08} strokeWidth={2} />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {visibleSections.content && (
            <SectionCard title="Performance por Tipo de Conteúdo" subtitle="Engajamento médio e alcance por formato · clique para detalhes">
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {CONTENT_TYPES.sort((a, b) => b.eng - a.eng).map(ct => (
                  <div key={ct.type} onClick={() => setActiveContent(ct)}
                    style={{ cursor: "pointer", padding: "6px 10px", borderRadius: 8, transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F9FAFB"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{ct.type} </span>
                        <span style={{ fontSize: 11, color: C.gray }}>{ct.posts} posts · alcance {ct.alcance}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 800, color: ct.color }}>{ct.eng}%</span>
                    </div>
                    <div style={{ height: 8, background: C.border, borderRadius: 4 }}>
                      <div style={{ height: "100%", width: `${(ct.eng / 7.5) * 100}%`, background: ct.color, borderRadius: 4, transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── ROI CALCULATOR ── */}
        {visibleSections.roi && (
          <SectionCard title="Calculadora de ROI" subtitle="Retorno sobre investimento + ROAS, CPA, Hook Rate">
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["organico","pago"].map(m => (
                <button key={m} onClick={() => setRoiMode(m)}
                  style={{ padding: "5px 16px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                    background: roiMode === m ? C.orange : C.grayLight, color: roiMode === m ? "#fff" : C.gray }}>
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 20 }}>
              {[
                { label: "RECEITA ATRIBUÍDA (R$)", key: "receita" },
                { label: "INVESTIMENTO EM MÍDIA (R$)", key: "investimento" },
                { label: "CUSTO CRIATIVO (R$)", key: "criativo" },
                { label: "CONVERSÕES", key: "conversoes" },
                { label: "HORAS DE GESTÃO", key: "horas" },
                { label: "TAXA POR HORA (R$)", key: "taxa" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: C.gray, letterSpacing: 0.5, marginBottom: 4 }}>{f.label}</label>
                  <input
                    type="number"
                    value={roi[f.key]}
                    onChange={e => setRoi(p => ({ ...p, [f.key]: +e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, fontWeight: 600, color: C.dark, background: "#fff" }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
              {[
                { label: "INVESTIDO", value: `R$ ${roiCalc.total.toLocaleString("pt-BR")}`, color: C.dark },
                { label: "ROI", value: `${roiCalc.roi >= 0 ? "+" : ""}${roiCalc.roi.toFixed(0)}%`, color: roiCalc.roi >= 0 ? C.green : C.red },
                { label: "ROAS", value: `${roiCalc.roas.toFixed(2)}x`, color: C.blue },
                { label: "CPA", value: `R$ ${roiCalc.cpa.toFixed(0)}`, color: C.orange },
                { label: "HOOK RATE", value: `${roiCalc.hook.toFixed(1)}%`, color: C.purple },
              ].map(s => (
                <div key={s.label} style={{ textAlign: "center", padding: 14, background: C.grayLight, borderRadius: 10 }}>
                  <p style={{ margin: "0 0 6px", fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: C.gray }}>{s.label}</p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: "#9CA3AF", textAlign: "center", marginTop: 12 }}>
              ROI = (Receita − Investimento Total) ÷ Investimento Total · ROAS = Receita ÷ Mídia · CPA = Custo ÷ Conversões
            </p>
          </SectionCard>
        )}
      </div>

      {/* ── CUSTOMIZE DRAWER ── */}
      {customizeOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setCustomizeOpen(false)}>
          <div style={{
            position: "absolute", top: 0, right: 0, width: 300, height: "100vh",
            background: "#fff", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
            padding: 24, overflowY: "auto", display: "flex", flexDirection: "column"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Personalizar visão</h3>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: C.gray }}>{Object.values(visibleSections).filter(Boolean).length} de {SECTIONS.length} seções visíveis</p>
              </div>
              <button onClick={() => setCustomizeOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
              {SECTIONS.map(s => (
                <div key={s.id} onClick={() => toggleSection(s.id)}
                  style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, cursor: "pointer", background: visibleSections[s.id] ? "#FFF7ED" : "#fff" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: visibleSections[s.id] ? C.orange : "#D1D5DB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {visibleSections[s.id] && <span style={{ color: "#fff", fontSize: 14 }}>✓</span>}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{s.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: C.gray }}>{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setVisibleSections(Object.fromEntries(SECTIONS.map(s => [s.id, true])))}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", cursor: "pointer", fontSize: 13 }}>
                Mostrar todas
              </button>
              <button onClick={() => setCustomizeOpen(false)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: C.orange, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      <KpiModal kpi={activeKpi} onClose={() => setActiveKpi(null)} />
      <HeatmapModal cell={activeHeatCell} onClose={() => setActiveHeatCell(null)} />
      <AgeModal age={activeAge} onClose={() => setActiveAge(null)} />
      <GenderModal gender={activeGender} onClose={() => setActiveGender(null)} />
      <LocationModal loc={activeLocation} onClose={() => setActiveLocation(null)} />
      <ContentModal content={activeContent} onClose={() => setActiveContent(null)} />
    </div>
  );
}
