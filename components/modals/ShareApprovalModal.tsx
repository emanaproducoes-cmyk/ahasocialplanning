'use client';

/**
 * components/modals/ShareApprovalModal.tsx
 *
 * Modal bonito para compartilhar o link de aprovação via:
 *  - 📱 WhatsApp
 *  - ✉️ E-mail
 *  - 🔗 Copiar Link
 *
 * Uso:
 *   <ShareApprovalModal
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     approvalUrl="https://..."
 *     postTitle="Nome do post"
 *     responsavelEmail="cliente@email.com"  // opcional
 *   />
 */

import { useRef, useEffect }               from 'react';
import { buildWhatsAppLink, buildMailtoLink, copyToClipboard } from '@/lib/utils/approval';
import { showToast }                        from '@/components/ui/Toast';

interface ShareApprovalModalProps {
  isOpen:            boolean;
  onClose:           () => void;
  approvalUrl:       string;
  postTitle:         string;
  responsavelEmail?: string;
}

const OPTIONS = [
  {
    id:      'whatsapp',
    icon:    '📱',
    label:   'WhatsApp',
    sublabel: 'Abrir conversa',
    gradient: 'from-green-500 to-green-400',
    ring:     'ring-green-300',
  },
  {
    id:      'email',
    icon:    '✉️',
    label:   'E-mail',
    sublabel: 'Abrir cliente',
    gradient: 'from-blue-500 to-blue-400',
    ring:     'ring-blue-300',
  },
  {
    id:      'copy',
    icon:    '🔗',
    label:   'Copiar link',
    sublabel: 'Para qualquer canal',
    gradient: 'from-[#7C3AED] to-[#9F67F5]',
    ring:     'ring-purple-300',
  },
] as const;

export function ShareApprovalModal({
  isOpen,
  onClose,
  approvalUrl,
  postTitle,
  responsavelEmail,
}: ShareApprovalModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Fecha ao pressionar Esc
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOption = async (id: typeof OPTIONS[number]['id']) => {
    if (id === 'whatsapp') {
      window.open(buildWhatsAppLink(approvalUrl, postTitle), '_blank', 'noopener');
      onClose();
    } else if (id === 'email') {
      window.location.href = buildMailtoLink(approvalUrl, postTitle, responsavelEmail);
      onClose();
    } else {
      const ok = await copyToClipboard(approvalUrl);
      if (ok) {
        showToast('✅ Link copiado!', 'success');
      } else {
        showToast('Não foi possível copiar. Copie manualmente.', 'error');
      }
      onClose();
    }
  };

  return (
    /* Backdrop */
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Painel */}
      <div className="w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-200">

        {/* Header */}
        <div
          className="px-6 pt-6 pb-5 text-center"
          style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FFB800 100%)' }}
        >
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" />
            </svg>
          </div>
          <h3 className="text-white font-bold text-lg">Compartilhar link</h3>
          <p className="text-white/75 text-xs mt-1 truncate px-4">
            &ldquo;{postTitle}&rdquo;
          </p>
        </div>

        {/* Opções */}
        <div className="p-5 space-y-3">
          {OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleOption(opt.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${opt.gradient} text-white font-semibold shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all ring-0 hover:ring-4 ${opt.ring}`}
            >
              <span className="text-2xl leading-none flex-shrink-0">{opt.icon}</span>
              <div className="text-left">
                <p className="text-[15px] font-bold leading-tight">{opt.label}</p>
                <p className="text-white/75 text-xs font-normal">{opt.sublabel}</p>
              </div>
              <svg className="w-4 h-4 ml-auto opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </button>
          ))}
        </div>

        {/* URL preview + fechar */}
        <div className="px-5 pb-5 space-y-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            <p className="text-xs text-gray-500 truncate flex-1 select-all">{approvalUrl}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
