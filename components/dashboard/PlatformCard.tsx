'use client';

import { formatNumber, formatVariation } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Platform } from '@/lib/types';

const PLATFORM_CONFIG: Record<Platform, { label: string; gradient: string; emoji: string }> = {
  instagram:       { label: 'Instagram',          gradient: 'linear-gradient(135deg, #833AB4, #FD1D1D, #F77737)', emoji: '📸' },
  facebook:        { label: 'Facebook',           gradient: 'linear-gradient(135deg, #1877F2, #0C5FD6)',          emoji: '👍' },
  youtube:         { label: 'YouTube',            gradient: 'linear-gradient(135deg, #FF0000, #FF6B00)',          emoji: '▶️' },
  tiktok:          { label: 'TikTok',             gradient: 'linear-gradient(135deg, #010101, #2E2E2E)',          emoji: '🎵' },
  linkedin:        { label: 'LinkedIn',           gradient: 'linear-gradient(135deg, #0A66C2, #004182)',          emoji: '💼' },
  threads:         { label: 'Threads',            gradient: 'linear-gradient(135deg, #1C1C1C, #3D3D3D)',          emoji: '🧵' },
  pinterest:       { label: 'Pinterest',          gradient: 'linear-gradient(135deg, #E60023, #C8001A)',          emoji: '📌' },
  google_business: { label: 'Google Meu Negócio', gradient: 'linear-gradient(135deg, #4285F4, #34A853)',          emoji: '🏢' },
};

interface PlatformCardProps {
  platform:  Platform;
  followers: number;
  variation: number;
  metric:    string; // e.g. "SEGUIDORES", "INSCRITOS"
}

export function PlatformCard({ platform, followers, variation, metric }: PlatformCardProps) {
  const cfg = PLATFORM_CONFIG[platform];
  const positive = variation >= 0;

  return (
    <div
      className="rounded-xl p-4 text-white shadow-card hover:shadow-hover transition-all hover:-translate-y-0.5 cursor-default"
      style={{ background: cfg.gradient }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{cfg.emoji}</span>
        <span
          className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20',
            positive ? 'text-white' : 'text-red-200'
          )}
        >
          {formatVariation(variation)}
        </span>
      </div>
      <p className="text-2xl font-bold">{formatNumber(followers)}</p>
      <p className="text-xs text-white/70 uppercase tracking-wider mt-1">{metric}</p>
      <p className="text-sm font-semibold mt-1">{cfg.label}</p>
    </div>
  );
}
