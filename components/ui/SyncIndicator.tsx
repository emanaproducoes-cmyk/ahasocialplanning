'use client';

import { cn } from '@/lib/utils/cn';
import type { SyncStatus } from '@/lib/types';

const CONFIG: Record<SyncStatus, { dot: string; label: string; text: string }> = {
  online:  { dot: 'bg-green-400',  label: 'Sincronizado',         text: 'text-green-600'  },
  syncing: { dot: 'bg-amber-400 animate-pulse', label: 'Sincronizando...', text: 'text-amber-600' },
  offline: { dot: 'bg-red-400',    label: 'Offline',              text: 'text-red-600'    },
};

interface SyncIndicatorProps {
  status:     SyncStatus;
  showLabel?: boolean;
  className?: string;
}

export function SyncIndicator({
  status,
  showLabel = false,
  className,
}: SyncIndicatorProps) {
  const { dot, label, text } = CONFIG[status];

  return (
    <div
      title={label}
      aria-label={label}
      className={cn('flex items-center gap-1.5', className)}
    >
      <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
      {showLabel && (
        <span className={cn('text-xs font-medium', text)}>{label}</span>
      )}
    </div>
  );
}
