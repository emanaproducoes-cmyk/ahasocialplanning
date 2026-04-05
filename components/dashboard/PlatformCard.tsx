'use client';

import { formatNumber, formatVariation } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import type { Platform } from '@/lib/types';

const PLATFORM_CONFIG: Record<Platform, { label: string; gradient: string; textColor: string; icon: string }> = {
  instagram:       { label: 'Instagram',          gradient: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #F77737 100%)', textColor: 'text-white', icon: '/icons/instagram.png'       },
  facebook:        { label: 'Facebook',           gradient: 'linear-gradient(135deg, #1877F2 0%, #0C5FD6 100%)',             textColor: 'text-white', icon: '/icons/facebook.png'        },
  youtube:         { label: 'YouTube',            gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',             textColor: 'text-white', icon: '/icons/youtube.png'         },
  tiktok:          { label: 'TikTok',             gradient: 'linear-gradient(135deg, #69C9D0 0%, #EE1D52 50%, #010101 100%)', textColor: 'text-white', icon: '/icons/tiktok.png'         },
  linkedin:        { label: 'LinkedIn',           gradient: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',             textColor: 'text-white', icon: '/icons/linkedin.png'        },
  threads:         { label: 'Threads',            gradient: 'linear-gradient(135deg, #1C1C1C 0%, #3D3D3D 100%)',            textColor: 'text-white', icon: '/icons/threads.png'         },
  pinterest:       { label: 'Pinterest',          gradient: 'linear-gradient(135deg, #E60023 0%, #C8001A 100%)',            textColor: 'text-white', icon: '/icons/pinterest.png'       },
  google_business: { label: 'Google Meu Negócio', gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 100%)',            textColor: 'text-white', icon: '/icons/google.png'          },
};

const PLATFORM_EMOJI: Record<Platform, string> = {
  instagram:       '📸',
  facebook:        '👍',
  youtube:         '▶️',
  tiktok:          '🎵',
  linkedin:        '💼',
  threads:         '🧵',
  pinterest:       '📌',
  google_business: '🏢',
};

interface PlatformCardProps {
  platform:  Platform;
  followers: number;
  variation: number;
  metric:    string;
}

export function PlatformCard({ platform, followers, variation, metric }: PlatformCardProps) {
  const cfg      = PLATFORM_CONFIG[platform];
  const positive = variation >= 0;

  return (
    <div
      className="rounded-xl p-4 text-white shadow-card hover:shadow-hover transition-all hover:-translate-y-0.5 cursor-default"
      style={{ background: cfg.gradient }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{PLATFORM_EMOJI[platform]}</span>
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full bg-white/20',
          positive ? 'text-white' : 'text-red-200'
        )}>
          {formatVariation(variation)}
        </span>
      </div>
      <p className="text-2xl font-bold">{formatNumber(followers)}</p>
      <p className="text-xs text-white/70 uppercase tracking-wider mt-1">{metric}</p>
      <p className="text-sm font-semibold mt-1">{cfg.label}</p>
    </div>
  );
}
