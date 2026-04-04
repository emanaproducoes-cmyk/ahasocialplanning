'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps {
  isOpen:        boolean;
  onClose:       () => void;
  title:         string;
  children:      React.ReactNode;
  size?:         'sm' | 'md' | 'lg' | 'xl' | 'full';
  footer?:       React.ReactNode;
  hideCloseBtn?: boolean;
  className?:    string;
}

const SIZE_CLASSES: Record<string, string> = {
  sm:   'max-w-md',
  md:   'max-w-lg',
  lg:   'max-w-2xl',
  xl:   'max-w-4xl',
  full: 'max-w-[90vw]',
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size        = 'md',
  footer,
  hideCloseBtn = false,
  className,
}: ModalProps) {
  const [visible, setVisible] = useState(false);
  const dialogRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setTimeout(() => setVisible(false), 200);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, handleKey]);

  // Trap focus inside modal
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable[0]?.focus();
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        'bg-black/40 backdrop-blur-sm transition-opacity duration-200',
        isOpen ? 'opacity-100' : 'opacity-0'
      )}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label={title}
    >
      <div
        ref={dialogRef}
        className={cn(
          'relative w-full bg-white rounded-xl shadow-modal',
          'flex flex-col max-h-[90vh] transition-all duration-200',
          isOpen ? 'modal-enter' : 'opacity-0 scale-95',
          SIZE_CLASSES[size],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {!hideCloseBtn && (
            <button
              onClick={onClose}
              aria-label="Fechar modal"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xl leading-none"
            >
              ×
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  danger       = false,
}: {
  isOpen:        boolean;
  onClose:       () => void;
  onConfirm:     () => Promise<void> | void;
  title:         string;
  message:       string;
  confirmLabel?: string;
  danger?:       boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try { await onConfirm(); onClose(); }
    finally { setLoading(false); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-60',
              danger
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]'
            )}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
    </Modal>
  );
}
