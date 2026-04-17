'use client';

/**
 * app/aprovacao/[token]/aprovacao-client.tsx
 *
 * Client Component da página pública de aprovação.
 * Nome em kebab-case minúsculo para evitar problemas de case-sensitivity
 * entre macOS (case-insensitive) e Linux/Vercel (case-sensitive).
 */

import { useState, useCallback } from 'react';
import { cn }                    from '@/lib/utils/cn';
import type { Approval, ApprovalStatus } from '@/lib/types';

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
  pinterest: '📌', google_business: '🏪',
};

const ACTION_CONFIG = {
  aprovado:  { label: 'APROVAR',            icon: '✅', bg: 'bg-green-500 hover:bg-green-600' },
  correcao:  { label: 'SOLICITAR CORREÇÃO', icon: '✏️', bg: 'bg-amber-500 hover:bg-amber-600' },
  rejeitado: { label: 'REJEITAR',           icon: '❌', bg: 'bg-red-500 hover:bg-red-600'     },
} as const;

const CONFIRMATION_CONFIG: Record<ApprovalStatus, { icon: string; title: string; desc: string; color: string; bg: string }> = {
  aprovado:  { icon: '✅', title: 'Conteúdo aprovado!',   desc: 'Ótimo! A equipe foi notificada e vai publicar em breve.',  color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  rejeitado: { icon: '❌', title: 'Conteúdo rejeitado.',   desc: 'A equipe foi notificada e irá rever o conteúdo.',         color: 'text-red-700',   bg: 'bg-red-50 border-red-200'     },
  correcao:  { icon: '✏️', title: 'Correção solicitada!', desc: 'Perfeito! A equipe irá realizar os ajustes solicitados.', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  pending:   { icon: '⏳', title: 'Aguardando resposta…', desc: '',                                                         color: 'text-gray-600',  bg: 'bg-gray-50 border-gray-200'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateBR(iso: unknown): string {
  if (!iso || typeof iso !== 'string') return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

function isExpired(expiresAt: unknown): boolean {
  if (!expiresAt || typeof expiresAt !== 'string') return false;
  return new Date(expiresAt) < new Date();
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function AprovacaoHeader() {
  return (
    <header
      className="px-6 py-4 flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FFB800 100%)' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <span className="font-black text-white text-xl">A</span>
        </div>
        <div>
          <p className="font-black text-white text-sm tracking-wide">AHA SOCIAL PLANNING</p>
          <p className="text-white/75 text-[11px] font-medium">Aprovação de Conteúdo</p>
        </div>
      </div>
    </header>
  );
}

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : 'w-8 h-8 border-[3px]';
  return <div className={`${s} border-orange-200 border-t-[#FF5C00] rounded-full animate-spin`} />;
}

function ConfirmationScreen({ status }: { status: ApprovalStatus }) {
  const cfg = CONFIRMATION_CONFIG[status];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="text-7xl mb-6">{cfg.icon}</div>
      <div className={`inline-block px-6 py-5 rounded-2xl border ${cfg.bg} mb-4 max-w-xs w-full`}>
        <h2 className={`text-xl font-bold mb-2 ${cfg.color}`}>{cfg.title}</h2>
        {cfg.desc && <p className="text-sm text-gray-600 leading-relaxed">{cfg.desc}</p>}
      </div>
      <p className="mt-6 text-xs text-gray-400">Você pode fechar esta janela com segurança.</p>
    </div>
  );
}

function MediaCarousel({ creatives }: { creatives: Approval['creatives'] }) {
  const [idx, setIdx] = useState(0);
  if (!creatives?.length) return null;

  const slides   = creatives.map((c) => c.url).filter(Boolean);
  const isVideo  = creatives[idx]?.type?.startsWith('video') ?? false;
  const mediaUrl = slides[idx];
  if (!mediaUrl) return null;

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="relative bg-black">
        {isVideo ? (
          <video key={mediaUrl} src={mediaUrl} controls autoPlay muted loop
            className="w-full max-h-[420px] object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={mediaUrl} src={mediaUrl} alt={`Criativo ${idx + 1}`}
            className="w-full max-h-[420px] object-contain" />
        )}

        {slides.length > 1 && (
          <>
            <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-lg disabled:opacity-30 transition-colors"
            >‹</button>
            <button onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))} disabled={idx === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center text-lg disabled:opacity-30 transition-colors"
            >›</button>
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
              {idx + 1} / {slides.length}
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={cn('w-2 h-2 rounded-full transition-all',
                    i === idx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75')} />
              ))}
            </div>
          </>
        )}
      </div>

      {slides.length > 1 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {creatives.map((c, i) => (
            <button key={i} onClick={() => setIdx(i)}
              className={cn('flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                i === idx ? 'border-[#FF5C00] scale-105' : 'border-transparent opacity-60 hover:opacity-100')}
            >
              {c.type?.startsWith('video')
                ? <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">▶</div>
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={c.url} alt="" className="w-full h-full object-cover" />
              }
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  token:           string;
  initialApproval: (Approval & { id: string }) | null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AprovacaoInterativo({ token, initialApproval }: Props) {
  const [approval,   setApproval]   = useState(initialApproval);
  const [comentario, setComentario] = useState('');
  const [responding, setResponding] = useState<'aprovado' | 'correcao' | 'rejeitado' | null>(null);
  const [responded,  setResponded]  = useState(
    initialApproval !== null && initialApproval.status !== 'pending'
  );
  const [error, setError] = useState<string | null>(
    !initialApproval
      ? 'Link inválido ou expirado. Por favor, verifique o link e tente novamente.'
      : isExpired(initialApproval.expiresAt)
      ? 'Este link de aprovação expirou. Solicite um novo link à equipe. ⏰'
      : null
  );

  const handleRespond = useCallback(async (status: 'aprovado' | 'rejeitado' | 'correcao') => {
    if (!token || responding) return;
    setResponding(status);
    setError(null);
    try {
      const res = await fetch('/api/approval/respond', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token, status, comentario }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `Erro ${res.status}`);
      }
      setApproval((prev) => prev ? { ...prev, status } : null);
      setResponded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.');
    } finally {
      setResponding(null);
    }
  }, [token, responding, comentario]);

  // Tela de erro sem approval
  if (error && !approval) {
    return (
      <div className="min-h-screen bg-[#F8F7FF]">
        <AprovacaoHeader />
        <div className="flex items-center justify-center p-6 pt-20">
          <div className="text-center max-w-sm">
            <div className="text-6xl mb-5">😔</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Link indisponível</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <AprovacaoHeader />
      <main className="max-w-lg mx-auto px-4 py-6 pb-12">

        {responded && approval ? (
          <ConfirmationScreen status={approval.status} />
        ) : approval ? (
          <div className="space-y-4">

            {/* Card do responsável */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF5C00, #FFB800)' }}
              >
                {(approval.responsavel?.nome?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{approval.responsavel?.nome}</p>
                <p className="text-xs text-gray-500">enviou este conteúdo para sua aprovação</p>
              </div>
              {approval.createdAt && (
                <p className="text-[11px] text-gray-400 shrink-0 hidden sm:block">
                  {formatDateBR(approval.createdAt)}
                </p>
              )}
            </div>

            {/* Plataformas */}
            {(approval.platforms?.length ?? 0) > 0 && (
              <div className="flex gap-2 flex-wrap">
                {approval.platforms.map((p) => (
                  <span key={p}
                    className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm font-medium text-gray-700"
                  >
                    <span>{PLATFORM_EMOJI[p] ?? '📱'}</span>
                    <span className="capitalize">{p.replace('_', ' ')}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Carrossel */}
            <MediaCarousel creatives={approval.creatives} />

            {/* Legenda */}
            {approval.caption && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-semibold">Legenda</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{approval.caption}</p>
              </div>
            )}

            {/* Campo de comentário */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Comentários <span className="normal-case font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ex: Alterar a cor do título, ajustar a legenda…"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 transition-shadow placeholder:text-gray-300"
              />
            </div>

            {/* Erro de resposta */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                ⚠️ {error}
              </div>
            )}

            {/* Botões de ação */}
            <div className="space-y-2.5 pt-1">
              {(['aprovado', 'correcao', 'rejeitado'] as const).map((action) => {
                const cfg       = ACTION_CONFIG[action];
                const isLoading = responding === action;
                return (
                  <button
                    key={action}
                    onClick={() => handleRespond(action)}
                    disabled={!!responding}
                    className={cn(
                      'w-full py-4 text-white text-[15px] font-bold rounded-2xl transition-all',
                      'flex items-center justify-center gap-2.5 shadow-sm',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                      cfg.bg
                    )}
                  >
                    {isLoading
                      ? <Spinner size="sm" />
                      : <span className="text-lg leading-none">{cfg.icon}</span>
                    }
                    {isLoading ? 'Enviando…' : cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Validade */}
            {approval.expiresAt && (
              <p className="text-center text-[11px] text-gray-400 pt-1">
                ⏰ Link válido até {formatDateBR(approval.expiresAt)}
              </p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}
