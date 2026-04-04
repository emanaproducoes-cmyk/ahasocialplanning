'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Toast, ToastType } from '@/lib/types';

// ─── Global Event Bus ────────────────────────────────────────────────────────
type ToastEvent = Omit<Toast, 'id'>;
type Listener   = (toast: ToastEvent) => void;

const listeners: Listener[] = [];

export function showToast(
  message: string,
  type: ToastType = 'info',
  duration = 4000
): void {
  listeners.forEach((fn) => fn({ message, type, duration }));
}

// ─── Icons ───────────────────────────────────────────────────────────────────
const ICONS: Record<ToastType, string> = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

const COLORS: Record<ToastType, string> = {
  success: 'border-l-green-500  bg-green-50  text-green-900',
  error:   'border-l-red-500    bg-red-50    text-red-900',
  warning: 'border-l-amber-500  bg-amber-50  text-amber-900',
  info:    'border-l-blue-500   bg-blue-50   text-blue-900',
};

// ─── Single Toast Item ────────────────────────────────────────────────────────
function ToastItem({
  toast,
  onRemove,
}: {
  toast:    Toast;
  onRemove: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);

  const remove = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  }, [onRemove, toast.id]);

  useEffect(() => {
    const t = setTimeout(remove, toast.duration);
    return () => clearTimeout(t);
  }, [remove, toast.duration]);

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 shadow-hover',
        'min-w-[280px] max-w-[380px] transition-all duration-200',
        COLORS[toast.type],
        exiting ? 'toast-exit' : 'toast-enter'
      )}
    >
      <span className="text-base shrink-0 mt-0.5">{ICONS[toast.type]}</span>
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        onClick={remove}
        aria-label="Fechar notificação"
        className="shrink-0 text-current opacity-50 hover:opacity-100 transition-opacity text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}

// ─── Provider (mounts once in root layout) ────────────────────────────────────
export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef          = useRef(0);

  const add = useCallback((event: ToastEvent) => {
    const id = String(++counterRef.current);
    setToasts((prev) => {
      const next = [...prev, { id, ...event }];
      // Max 3 simultaneous
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    listeners.push(add);
    return () => {
      const idx = listeners.indexOf(add);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }, [add]);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={remove} />
        </div>
      ))}
    </div>
  );
}
