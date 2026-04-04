'use client';

import { cn } from '@/lib/utils/cn';

interface PageHeaderProps {
  title:      string;
  subtitle?:  string;
  actions?:   React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Primary action button ────────────────────────────────────────────────────
export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading,
  icon,
  className,
}: {
  children:   React.ReactNode;
  onClick?:   () => void;
  disabled?:  boolean;
  loading?:   boolean;
  icon?:      string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 bg-[#FF5C00] hover:bg-[#E54E00]',
        'text-white text-sm font-medium rounded-lg transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        className
      )}
    >
      {loading ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Aguarde...
        </>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
}

// ─── Ghost button ─────────────────────────────────────────────────────────────
export function GhostButton({
  children,
  onClick,
  icon,
  className,
}: {
  children:   React.ReactNode;
  onClick?:   () => void;
  icon?:      string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600',
        'hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors',
        className
      )}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}
