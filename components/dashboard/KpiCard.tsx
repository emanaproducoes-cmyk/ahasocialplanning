'use client';

import { cn }              from '@/lib/utils/cn';
import { formatNumber, formatVariation } from '@/lib/utils/formatters';

interface KpiCardProps {
  label:      string;
  value:      number;
  variation:  number;
  icon:       string;
  iconBg:     string;
  borderColor:string;
}

export function KpiCard({ label, value, variation, icon, iconBg, borderColor }: KpiCardProps) {
  const positive = variation >= 0;
  return (
    <div
      className={cn(
        'bg-white rounded-xl p-5 shadow-card border-t-4 hover:shadow-hover transition-shadow cursor-default'
      )}
      style={{ borderTopColor: borderColor }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
          style={{ background: iconBg }}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{formatNumber(value)}</p>
      <p className={cn('text-xs font-medium', positive ? 'text-green-600' : 'text-red-500')}>
        {formatVariation(variation)} vs mês anterior
      </p>
    </div>
  );
}
