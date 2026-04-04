'use client';

import { cn } from '@/lib/utils/cn';
import { POST_STATUS_LABELS, POST_STATUS_COLORS } from '@/lib/utils/formatters';
import type { PostStatus } from '@/lib/types';

interface BadgeProps {
  children:   React.ReactNode;
  variant?:   'default' | 'orange' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';
  size?:      'sm' | 'md';
  pulse?:     boolean;
  className?: string;
}

const VARIANTS: Record<string, string> = {
  default: 'bg-gray-100 text-gray-600',
  orange:  'bg-orange-100 text-orange-700',
  green:   'bg-green-100  text-green-700',
  red:     'bg-red-100    text-red-700',
  yellow:  'bg-amber-100  text-amber-700',
  blue:    'bg-blue-100   text-blue-700',
  purple:  'bg-purple-100 text-purple-700',
  gray:    'bg-gray-100   text-gray-500',
};

export function Badge({
  children,
  variant   = 'default',
  size      = 'md',
  pulse     = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-semibold rounded-full',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5',
        VARIANTS[variant],
        pulse && 'animate-pulse-badge',
        className
      )}
    >
      {children}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full',
        POST_STATUS_COLORS[status]
      )}
    >
      {POST_STATUS_LABELS[status]}
    </span>
  );
}

// ─── Count Badge (for sidebar / topbar) ──────────────────────────────────────
export function CountBadge({
  count,
  variant = 'orange',
}: {
  count:    number;
  variant?: BadgeProps['variant'];
}) {
  if (count === 0) return null;
  return (
    <Badge variant={variant} size="sm" pulse={count > 0}>
      {count > 99 ? '99+' : count}
    </Badge>
  );
}

// ─── NEW pill ─────────────────────────────────────────────────────────────────
export function NewBadge() {
  return (
    <Badge variant="green" size="sm">
      NEW
    </Badge>
  );
}
