'use client';

import { useState }          from 'react';
import { cn }                from '@/lib/utils/cn';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import type { PaidTrafficEntry } from '@/lib/types';

const CPC_DATA = [
  { name: 'Instagram',  CPC: 1.20, CPM: 8.50  },
  { name: 'Facebook',   CPC: 0.85, CPM: 12.00 },
  { name: 'Google Ads', CPC: 2.10, CPM: 15.00 },
  { name: 'TikTok',     CPC: 0.45, CPM: 5.50  },
  { name: 'YouTube',    CPC: 1.80, CPM: 10.00 },
];

const MOCK_ENTRIES: (Omit<PaidTrafficEntry, 'id'> & { id: string; name: string })[] = [
  { id: 'a', name: 'Stories Black Friday', campaignId: '1', creativeId: 'a', platform: 'instagram', status: 'ativo',   invested: 1200, impressions: 85000, reach: 62000, clicks: 3200, conversions: 84,  cpc: 0.37, cpm: 14.1, ctr: 3.76, roas: 3.2, startDate: null, endDate: null },
  { id: 'b', name: 'Feed Promoção Natal',  campaignId: '1', creativeId: 'b', platform: 'facebook',  status: 'ativo',   invested: 800,  impressions: 54000, reach: 41000, clicks: 1900, conversions: 48,  cpc: 0.42, cpm: 14.8, ctr: 3.52, roas: 2.8, startDate: null, endDate: null },
  { id: 'c', name: 'Reels Produto X',     campaignId: '2', creativeId: 'c', platform: 'tiktok',    status: 'pausado', invested: 600,  impressions: 120000, reach: 95000, clicks: 5100, conversions: 31,  cpc: 0.11, cpm: 5.0,  ctr: 4.25, roas: 1.9, startDate: null, endDate: null },
  { id: 'd', name: 'B2B Awareness',       campaignId: '2', creativeId: 'd', platform: 'linkedin',  status: 'ativo',   invested: 1500, impressions: 28000, reach: 22000, clicks: 980,  conversions: 62,  cpc: 1.53, cpm: 53.5, ctr: 3.50, roas: 4.1, startDate: null, endDate: null },
];

const PLATFORM_CONFIG: Record<string, { icon: string; bg: string }> = {
  instagram:  { icon: '📸', bg: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  facebook:   { icon: '👤', bg: 'bg-blue-600' },
  google_ads: { icon: 'G',  bg: 'bg-green-600' },
  tiktok:     { icon: '🎵', bg: 'bg-black' },
  youtube:    { icon: '▶',  bg: 'bg-red-600' },
  linkedin:   { icon: 'in', bg: 'bg-blue-700' },
};

const INVEST_COLORS = ['#E1306C','#1877F2','#010101','#0A66C2'];

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5 text-center shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={cn('text-2xl font-extrabold', color ?? 'text-gray-900')}>{value}</p>
    </div>
  );
}

function AddCreativeModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', platform: 'instagram', investment: '', ctr: '', roas: '', cpc: '' });
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[16px]">Novo Criativo</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-xl">×</button>
        </div>
        <div className="p-5 space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#FF5C00]/20 outline-none"
            placeholder="Nome do criativo" />
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#FF5C00]/20 outline-none bg-white">
            {Object.keys(PLATFORM_CONFIG).map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            {(['investment','ctr','roas','cpc'] as const).map((k) => (
              <input key={k} type="number" placeholder={k.toUpperCase()}
                value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#FF5C00]/20 outline-none" />
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
            <button onClick={onClose} className="flex-1 py-2 bg-[#FF5C00] text-white text-sm font-semibold rounded-lg hover:bg-[#E54E00]">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

type SortKey = 'invested' | 'impressions' | 'clicks' | 'conversions' | 'cpc' | 'cpm' | 'ctr' | 'roas';

export default function TrafegoPagoPage() {
  const [sortKey, setSortKey] = useState<SortKey>('roas');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc');
  const [showAdd, setShowAdd] = useState(false);

  const entries = [...MOCK_ENTRIES].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortDir === 'desc' ? -diff : diff;
  });

  const total = entries.reduce(
    (acc, e) => ({ invested: acc.invested + e.invested, impressions: acc.impressions + e.impressions, clicks: acc.clicks + e.clicks, conversions: acc.conversions + e.conversions }),
    { invested: 0, impressions: 0, clicks: 0, conversions: 0 }
  );
  const avgCtr  = total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0;
  const avgCpc  = total.clicks > 0 ? total.invested / total.clicks : 0;
  const avgRoas = entries.length > 0 ? entries.reduce((a, e) => a + e.roas, 0) / entries.length : 0;

  const investData = entries.map((e, i) => ({ name: e.platform, value: e.invested, color: INVEST_COLORS[i % INVEST_COLORS.length] }));

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tráfego Pago</h2>
          <p className="text-sm text-gray-500 mt-0.5">Performance de anúncios pagos</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5C00] text-white text-sm font-semibold rounded-lg hover:bg-[#E54E00] transition-colors shadow-lg shadow-[#FF5C00]/25">
          + Nova Entrada
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Investimento" value={formatCurrency(total.invested)} />
        <KpiCard label="CPC Médio"    value={formatCurrency(avgCpc)} />
        <KpiCard label="CTR"          value={formatPercent(avgCtr)}  color="text-green-600" />
        <KpiCard label="ROAS"         value={`${avgRoas.toFixed(1)}x`} color="text-green-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-bold text-[15px] mb-4">CPC & CPM por Plataforma</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={CPC_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="CPC" fill="#FF5C00" radius={[4,4,0,0]} name="CPC (R$)" />
              <Bar dataKey="CPM" fill="#3B82F6" radius={[4,4,0,0]} name="CPM (R$)" />
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
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Creatives Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-[15px]">Criativos em Tráfego</h3>
          <span className="text-xs text-gray-400">{entries.length} criativos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Criativo</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase text-left">Plataforma</th>
                <th className="px-3 py-3 text-[11px] font-semibold text-gray-400 uppercase text-left">Status</th>
                {COLS.map((col) => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className="px-3 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-[#FF5C00] transition-colors whitespace-nowrap select-none">
                    {col.label}{sortKey === col.key && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => {
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
                      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold', plat.bg)}>{plat.icon}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={cn('flex items-center gap-1.5', entry.status === 'ativo' ? 'text-green-600' : 'text-gray-400')}>
                        <span className={cn('w-2 h-2 rounded-full', entry.status === 'ativo' ? 'bg-green-500' : 'bg-gray-300')} />
                        {entry.status === 'ativo' ? 'Ativo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatCurrency(entry.invested)}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatNumber(entry.impressions)}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatNumber(entry.clicks)}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatNumber(entry.conversions)}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatCurrency(entry.cpc)}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatCurrency(entry.cpm)}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={cn('font-semibold', entry.ctr > 3.5 ? 'text-blue-600' : 'text-gray-700')}>{formatPercent(entry.ctr)}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={cn('font-bold', entry.roas >= 3 ? 'text-green-600' : entry.roas >= 2 ? 'text-amber-600' : 'text-red-500')}>{entry.roas.toFixed(1)}x</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <AddCreativeModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
