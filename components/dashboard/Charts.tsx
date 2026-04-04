'use client';

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const currentMonth = new Date().getMonth();
const LAST_6 = MONTHS.slice(Math.max(0, currentMonth - 5), currentMonth + 1);

export function EngagementChart() {
  const data = {
    labels: LAST_6,
    datasets: [
      { label: 'Instagram', data: [1200,1900,1700,2400,2100,2800], borderColor: '#E1306C', backgroundColor: 'rgba(225,48,108,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
      { label: 'Facebook',  data: [800,1200,900,1100,1400,1300],   borderColor: '#1877F2', backgroundColor: 'rgba(24,119,242,0.05)',  fill: true, tension: 0.4, pointRadius: 3 },
      { label: 'TikTok',    data: [400,700,1200,1800,2200,3100],   borderColor: '#010101', backgroundColor: 'rgba(1,1,1,0.04)',        fill: true, tension: 0.4, pointRadius: 3 },
    ],
  };
  return (
    <div className="bg-white rounded-xl p-5 shadow-card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Engajamento por Plataforma</h3>
          <p className="text-xs text-gray-500">Crescimento mensal</p>
        </div>
        <span className="text-xs text-gray-400">Últimos 6 meses</span>
      </div>
      <div style={{ height: '200px', position: 'relative' }}>
        <Line data={data} options={{
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { mode: 'index', intersect: false } },
          scales: { x: { grid: { display: false }, ticks: { font: { size: 11 } } }, y: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 } } } },
        }} />
      </div>
    </div>
  );
}

export function PlatformMixChart({ data: raw }: { data?: Record<string, number> }) {
  const resolved = raw ?? { Instagram: 40, Facebook: 25, TikTok: 20, LinkedIn: 15 };
  const data = {
    labels: Object.keys(resolved),
    datasets: [{ data: Object.values(resolved), backgroundColor: ['#E1306C','#1877F2','#010101','#0A66C2','#FF0000','#E60023'], borderWidth: 2, borderColor: '#fff' }],
  };
  return (
    <div className="bg-white rounded-xl p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Mix de Plataformas</h3>
        <p className="text-xs text-gray-500">Distribuição de posts</p>
      </div>
      <div style={{ height: '200px', position: 'relative' }}>
        <Doughnut data={data} options={{
          responsive: true, maintainAspectRatio: false, cutout: '65%',
          plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } } },
        }} />
      </div>
    </div>
  );
}

export function StatusBarChart() {
  const data = {
    labels: ['Instagram','Facebook','YouTube','TikTok','LinkedIn'],
    datasets: [
      { label: 'Aprovados',  data: [12,8,5,9,4],  backgroundColor: '#22C55E', borderRadius: 4 },
      { label: 'Em Análise', data: [4,3,2,5,1],   backgroundColor: '#F59E0B', borderRadius: 4 },
      { label: 'Rejeitados', data: [1,2,0,1,0],   backgroundColor: '#EF4444', borderRadius: 4 },
    ],
  };
  return (
    <div className="bg-white rounded-xl p-5 shadow-card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">Posts por Status e Plataforma</h3>
        <p className="text-xs text-gray-500">Distribuição atual</p>
      </div>
      <div style={{ height: '200px', position: 'relative' }}>
        <Bar data={data} options={{
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
          scales: { x: { grid: { display: false } }, y: { grid: { color: '#f3f4f6' } } },
        }} />
      </div>
    </div>
  );
}
