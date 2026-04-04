'use client';

import { cn } from '@/lib/utils/cn';

interface EmptyStateProps {
  icon?:       string;
  title:       string;
  subtitle?:   string;
  actionLabel?: string;
  onAction?:   () => void;
  className?:  string;
}

export function EmptyState({
  icon       = '📭',
  title,
  subtitle,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      <div className="text-5xl mb-4 animate-[fadeIn_0.3s_ease-out]">{icon}</div>
      <h3 className="text-base font-semibold text-gray-800 mb-1">{title}</h3>
      {subtitle && (
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed">{subtitle}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-5 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-sm font-medium rounded-lg transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
