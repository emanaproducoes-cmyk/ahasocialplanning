'use client';

/**
 * components/ui/ShareApprovalButton.tsx
 *
 * Botão reutilizável que abre o ShareApprovalModal.
 * Só renderiza se o post já tiver um approvalToken.
 * Também pode gerar o link se ainda não existir (modo auto-gerar).
 *
 * Variantes de exibição:
 *  - 'button'   → botão completo com texto  (padrão)
 *  - 'icon'     → apenas ícone (para menus compactos)
 *  - 'menuItem' → item de menu com ícone + texto
 *
 * Uso:
 *   <ShareApprovalButton
 *     post={post}
 *     uid={uid}
 *     responsavel={responsavel}
 *     variant="button"
 *   />
 */

import { useState }                              from 'react';
import { ShareApprovalModal }                    from '@/components/modals/ShareApprovalModal';
import { generateApprovalLink }                  from '@/lib/utils/approval';
import { showToast }                             from '@/components/ui/Toast';
import { cn }                                    from '@/lib/utils/cn';
import type { Post, Responsavel }                from '@/lib/types';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ShareApprovalButtonProps {
  post:               Post;
  uid:                string;
  responsavel:        Responsavel;
  variant?:           'button' | 'icon' | 'menuItem';
  className?:         string;
  /** E-mail do cliente para preencher o mailto automaticamente */
  clienteEmail?:      string;
  /** Callback chamado após gerar ou compartilhar */
  onShared?:          (url: string) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ShareApprovalButton({
  post,
  uid,
  responsavel,
  variant    = 'button',
  className,
  clienteEmail,
  onShared,
}: ShareApprovalButtonProps) {
  const [modalOpen,    setModalOpen]    = useState(false);
  const [generating,   setGenerating]   = useState(false);
  const [approvalUrl,  setApprovalUrl]  = useState<string | null>(
    post.approvalToken
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/aprovacao/${post.approvalToken}`
      : null
  );

  // ── Garante que exista um link antes de abrir o modal ─────────────────────
  const handleClick = async () => {
    if (approvalUrl) {
      setModalOpen(true);
      return;
    }

    setGenerating(true);
    try {
      const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
      // Converte de query-string para rota dinâmica
      const tokenMatch = url.match(/token=([^&]+)/);
      const token = tokenMatch ? tokenMatch[1] : null;
      const finalUrl = token
        ? `${window.location.origin}/aprovacao/${token}`
        : url;
      setApprovalUrl(finalUrl);
      onShared?.(finalUrl);
      setModalOpen(true);
    } catch {
      showToast('Erro ao gerar link de aprovação.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  // ── Renders por variante ──────────────────────────────────────────────────

  const isLoading = generating;

  return (
    <>
      {variant === 'button' && (
        <button
          onClick={handleClick}
          disabled={isLoading}
          title="Compartilhar para aprovação"
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
            'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-sm hover:shadow-md',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            className
          )}
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <ShareIcon className="w-4 h-4" />
          )}
          {isLoading ? 'Gerando…' : 'Compartilhar'}
        </button>
      )}

      {variant === 'icon' && (
        <button
          onClick={handleClick}
          disabled={isLoading}
          title="Compartilhar para aprovação"
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            'text-[#7C3AED] hover:bg-purple-50',
            'disabled:opacity-50',
            className
          )}
        >
          {isLoading
            ? <span className="w-4 h-4 border-2 border-purple-300 border-t-[#7C3AED] rounded-full animate-spin" />
            : <ShareIcon className="w-4 h-4" />
          }
        </button>
      )}

      {variant === 'menuItem' && (
        <button
          onClick={handleClick}
          disabled={isLoading}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-lg',
            'hover:bg-purple-50 hover:text-[#7C3AED] transition-colors text-left',
            'disabled:opacity-50',
            className
          )}
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-purple-300 border-t-[#7C3AED] rounded-full animate-spin shrink-0" />
          ) : (
            <ShareIcon className="w-4 h-4 shrink-0 text-[#7C3AED]" />
          )}
          <span>{isLoading ? 'Gerando link…' : 'Compartilhar para aprovação'}</span>
        </button>
      )}

      {/* Modal de compartilhamento */}
      {approvalUrl && (
        <ShareApprovalModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          approvalUrl={approvalUrl}
          postTitle={post.title}
          responsavelEmail={clienteEmail}
        />
      )}
    </>
  );
}

// ─── Ícone de compartilhar ────────────────────────────────────────────────────

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z"
      />
    </svg>
  );
}
