'use client';

import { useState }            from 'react';
import { useAuth }             from '@/lib/hooks/useAuth';
import { useUserCollection }   from '@/lib/hooks/useCollection';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { EmptyState }          from '@/components/ui/EmptyState';
import { SkeletonKpiRow, SkeletonList } from '@/components/ui/SkeletonCard';
import { formatCurrency, formatNumber, formatPercent } from '@/lib/utils/formatters';
import { cn }                  from '@/lib/utils/cn';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import type { PaidTrafficEntry, Platform } from '@/lib/types';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️', tiktok: '🎵', linkedin: '💼',
};

// ─── KPI summary card ─────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-card border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// ─── Mock data (replaced by Firestore in production) ─────────────────────────
const MOCK_ENTRIES: Omit<PaidTrafficEntry, 'id'>[] = [
  { campaignId: '1', creativeId: 'a', platform: 'instagram', status: 'ativo',   invested: 1200, impressions: 85000, reach: 62000, clicks: 3200, conversions: 84,  cpc: 0.37, cpm: 14.1, ctr: 3.76, roas: 3.2, startDate: null, endDate: null },
  { campaignId: '1', creativeId: 'b', platform: 'facebook',  status: 'ativo',   invested: 800,  impressions: 54000, reach: 41000, clicks: 1900, conversions: 48,  cpc: 0.42, cpm: 14.8, ctr: 3.52, roas: 2.8, startDate: null, endDate: null },
  { campaignId: '2', creativeId: 'c', platform: 'tiktok',    status: 'pausado', invested: 600,  impressions: 120000,reach: 95000, clicks: 5100, conversions: 31,  cpc: 0.11, cpm: 5.0,  ctr: 4.25, roas: 1.9, startDate: null, endDate: null },
  { campaignId: '2', creativeId: 'd', platform: 'linkedin',  status: 'ativo',   invested: 1500, impressions: 28000, reach: 22000, clicks: 980,  conversions: 62,  cpc: 1.53, cpm: 53.5, ctr: 3.50, roas: 4.1, startDate: null, endDate: null },
];

// ─── Sortable table ───────────────────────────────────────────────────────────
type SortKey = 'invested' | 'impressions' | 'clicks' | 'conversions' | 'cpc' | 'cpm' | 'ctr' | 'roas';

export default function TrafegoPagoPage() {
  const { user }    = useAuth();
  const [sortKey,   setSortKey]   = useState<SortKey>('roas');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');

  const entries = [...MOCK_ENTRIES].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortDir === 'desc' ? -diff : diff;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Aggregated KPIs
  const total = entries.reduce(
    (acc, e) => ({
      invested:    acc.invested    + e.invested,
      impressions: acc.impressions + e.impressions,
      clicks:      acc.clicks      + e.clicks,
      conversions: acc.conversions + e.conversions,
    }),
    { invested: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const avgCtr  = total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0;
  const avgCpc  = total.clicks      > 0 ? total.invested / total.clicks            : 0;
  const avgRoas = total.invested    > 0
    ? entries.reduce((a, e) => a + e.roas, 0) / entries.length
    : 0;

  // Chart data
  const lineData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
    datasets: [
      { label: 'CPC', data: [0.45, 0.41, 0.38, 0.35, 0.37, 0.34], borderColor: '#FF5C00', tension: 0.4 },
      { label: 'CPM', data: [15, 14, 13.5, 14.2, 14.1, 13.8],     borderColor: '#3B82F6', tension: 0.4 },
    ],
  };

  const donutData = {
    labels: entries.map((e) => e.platform),
    datasets: [{
      data: entries.map((e) => e.invested),
      backgroundColor: ['#E1306C','#1877F2','#010101','#0A66C2'],
      borderWidth: 2, borderColor: '#fff',
    }],
  };

  const barData = {
    labels: entries.map((e) => e.platform),
    datasets: [
      { label: 'CTR (%)', data: entries.map((e) => e.ctr), backgroundColor: '#FF5C00', borderRadius: 4 },
      { label: 'ROAS',    data: entries.map((e) => e.roas), backgroundColor: '#22C55E', borderRadius: 4 },
    ],
  };

  const COLS: { key: SortKey; label: string }[] = [
    { key: 'invested',    label: 'Investido'   },
    { key: 'impressions', label: 'Impressões'  },
    { key: 'clicks',      label: 'Cliques'     },
    { key: 'conversions', label: 'Conversões'  },
    { key: 'cpc',         label: 'CPC'         },
    { key: 'cpm',         label: 'CPM'         },
    { key: 'ctr',         label: 'CTR'         },
    { key: 'roas',        label: 'ROAS'        },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tráfego Pago"
        subtitle="Métricas e performance de anúncios"
        actions={
          <PrimaryButton icon="+" onClick={() => {}}>
            Nova Entrada
          </PrimaryButton>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total Investido"  value={formatCurrency(total.invested)}           icon="💰" color="#FF5C00" />
        <MetricCard label="Impressões"       value={formatNumber(total.impressions)}           icon="👁️" color="#3B82F6" />
        <MetricCard label="CTR médio"        value={formatPercent(avgCtr)}                    icon="📊" color="#F59E0B" />
        <MetricCard label="ROAS médio"       value={`${avgRoas.toFixed(1)}x`}                 icon="💎" color="#22C55E" />
        <MetricCard label="Cliques totais"   value={formatNumber(total.clicks)}               icon="🖱️" color="#7C3AED" />
        <MetricCard label="Conversões"       value={formatNumber(total.conversions)}           icon="✅" color="#22C55E" />
        <MetricCard label="CPC médio"        value={formatCurrency(avgCpc)}                   icon="💡" color="#EF4444" />
        <MetricCard label="Alcance"          value={formatNumber(entries.reduce((a,e) => a + e.reach, 0))} icon="📡" color="#14B8A6" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Evolução CPC / CPM</h3>
          <Line data={lineData} options={{
            responsive: true,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
            scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } },
          }} />
        </div>
        <div className="bg-white rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Gasto por Plataforma</h3>
          <Doughnut data={donutData} options={{
            responsive: true, cutout: '65%',
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
          }} />
        </div>
      </div>

      {/* Performance table */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">Performance por Criativo</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Plataforma
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase">Status</th>
                {COLS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-[#FF5C00] transition-colors whitespace-nowrap"
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{PLATFORM_EMOJI[entry.platform] ?? '📱'}</span>
                      <span className="text-sm font-medium text-gray-800 capitalize">{entry.platform}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                      entry.status === 'ativo'   && 'bg-green-100 text-green-700',
                      entry.status === 'pausado' && 'bg-amber-100 text-amber-700',
                      entry.status === 'concluido' && 'bg-blue-100 text-blue-700',
                    )}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(entry.invested)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatNumber(entry.impressions)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatNumber(entry.clicks)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatNumber(entry.conversions)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(entry.cpc)}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(entry.cpm)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('font-semibold', entry.ctr > 3.5 ? 'text-green-600' : 'text-gray-700')}>
                      {formatPercent(entry.ctr)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn('font-bold', entry.roas >= 3 ? 'text-green-600' : entry.roas >= 2 ? 'text-amber-600' : 'text-red-500')}>
                      {entry.roas.toFixed(1)}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
