'use client';

/**
 * app/aprovacao/page.tsx
 *
 * Página PÚBLICA de aprovação de conteúdo — sem layout do dashboard.
 *
 * BUG FIX #3 / #4:
 *  - handleRespond agora chama /api/approval/respond (Admin SDK) em vez de
 *    respondApproval() do client SDK. Isso contorna o erro de persistentLocalCache
 *    em abas sem autenticação e garante que o post espelho seja atualizado.
 *  - Guard adicionado em approval.createdAt antes de chamar formatDateTime.
 *
 * BUG FIX #9: formatDateTime chamado somente quando createdAt não é null.
 */

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams }  from 'next/navigation';
import { fetchApproval }    from '@/lib/firebase/firestore';
import { isApprovalExpired } from '@/lib/utils/approval';
import { formatDateTime }   from '@/lib/utils/formatters';
import { cn }               from '@/lib/utils/cn';
import type { Approval, ApprovalStatus } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

/* ─── Tela de confirmação ────────────────────────────────────────── */
function ConfirmationScreen({ status }: { status: ApprovalStatus }) {
  const config: Record<ApprovalStatus, { icon: string; title: string; desc: string; color: string }> = {
    aprovado:  { icon: '✅', title: 'Conteúdo aprovado!',    desc: 'A equipe foi notificada.',  color: 'text-green-600' },
    rejeitado: { icon: '❌', title: 'Conteúdo rejeitado.',    desc: 'A equipe foi notificada.',  color: 'text-red-600'   },
    correcao:  { icon: '🔁', title: 'Correção solicitada!',  desc: 'A equipe fará os ajustes.', color: 'text-amber-600' },
    pending:   { icon: '⏳', title: 'Aguardando resposta…',  desc: '',                          color: 'text-gray-600'  },
  };
  const { icon, title, desc, color } = config[status];
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-7xl mb-6">{icon}</div>
      <h2 className={`text-2xl font-bold mb-3 ${color}`}>{title}</h2>
      {desc && <p className="text-gray-500 text-sm max-w-xs">{desc}</p>}
      <div className="mt-8 text-xs text-gray-400">Você pode fechar esta janela.</div>
    </div>
  );
}

/* ─── Spinner centralizado ───────────────────────────────────────── */
function Spinner() {
  return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
    </div>
  );
}

/* ─── Conteúdo principal ─────────────────────────────────────────── */
function AprovacaoContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [approval,   setApproval]   = useState<(Approval & { id: string }) | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [responding, setResponding] = useState<ApprovalStatus | null>(null);
  const [responded,  setResponded]  = useState(false);
  const [slideIdx,   setSlideIdx]   = useState(0);

  useEffect(() => {
    if (!token) { setError('Link inválido.'); setLoading(false); return; }
    fetchApproval(token)
      .then((data) => {
        if (!data) { setError('Link inválido ou expirado. ❌'); return; }
        if (isApprovalExpired(data.expiresAt)) { setError('Este link expirou. ⏰'); return; }
        if (data.status !== 'pending') { setApproval(data); setResponded(true); return; }
        setApproval(data);
      })
      .catch(() => setError('Erro ao carregar. Tente novamente.'))
      .finally(() => setLoading(false));
  }, [token]);

  /**
   * BUG FIX #3 + #4: chama a API route /api/approval/respond que usa o Admin SDK.
   * Isso garante:
   *  1. Sem erros de autenticação (não requer login do cliente).
   *  2. O post `users/{uid}/posts/{postId}` é atualizado pelo servidor.
   *  3. A sub-coleção correta (aprovados / rejeitados) é espelhada.
   */
  const handleRespond = useCallback(async (status: 'aprovado' | 'rejeitado' | 'correcao') => {
    if (!token || responding) return;
    setResponding(status as ApprovalStatus);
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
      const msg = err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.';
      setError(msg);
    } finally {
      setResponding(null);
    }
  }, [token, responding, comentario]);

  const slides   = approval?.creatives?.map((c) => c.url).filter(Boolean) ?? [];
  const isVideo  = approval?.creatives?.[slideIdx]?.type?.startsWith('video') ?? false;
  const mediaUrl = slides[slideIdx] ?? null;

  if (loading) return <Spinner />;

  if (error) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl mb-4">😔</div>
        <p className="text-gray-600 font-medium mb-2">Ops!</p>
        <p className="text-gray-500 text-sm">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FFB800 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="font-bold text-white text-lg">A</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm">AHA SOCIAL PLANNING</p>
            <p className="text-white/70 text-[10px]">Aprovação de Conteúdo</p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {responded && approval ? (
          <ConfirmationScreen status={approval.status} />
        ) : approval ? (
          <div className="space-y-5">
            {/* Card do responsável */}
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF5C00] flex items-center justify-center text-white font-bold shrink-0">
                {(approval.responsavel?.nome?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{approval.responsavel?.nome}</p>
                <p className="text-xs text-gray-500">enviou este conteúdo para aprovação</p>
              </div>
              {/* BUG FIX #9: guard before calling formatDateTime */}
              {approval.createdAt && (
                <p className="text-[11px] text-gray-400 shrink-0 hidden sm:block">
                  {formatDateTime(approval.createdAt)}
                </p>
              )}
            </div>

            {/* Plataformas */}
            {(approval.platforms?.length ?? 0) > 0 && (
              <div className="flex gap-2 flex-wrap">
                {approval.platforms.map((p) => (
                  <span key={p} className="flex items-center gap-1 text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm font-medium text-gray-700">
                    <span>{PLATFORM_EMOJI[p] ?? '📱'}</span>
                    <span className="capitalize">{p}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Mídia */}
            {mediaUrl && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {isVideo ? (
                  <video
                    src={mediaUrl}
                    controls autoPlay muted loop
                    className="w-full max-h-[500px] object-contain bg-black"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt="Criativo"
                    className="w-full max-h-[500px] object-contain"
                  />
                )}
                {/* Navegação de slides */}
                {slides.length > 1 && (
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                    <button
                      onClick={() => setSlideIdx((i) => Math.max(0, i - 1))}
                      disabled={slideIdx === 0}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 transition-colors"
                    >
                      ‹ Anterior
                    </button>
                    <span className="text-xs text-gray-500">{slideIdx + 1} / {slides.length}</span>
                    <button
                      onClick={() => setSlideIdx((i) => Math.min(slides.length - 1, i + 1))}
                      disabled={slideIdx === slides.length - 1}
                      className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-30 transition-colors"
                    >
                      Próximo ›
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Legenda */}
            {approval.caption && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Legenda</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{approval.caption}</p>
              </div>
            )}

            {/* Comentários */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Comentários (opcional)
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ex: Alterar a cor do texto…"
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
              />
            </div>

            {/* Botões de ação */}
            <div className="space-y-2">
              {(['aprovado', 'correcao', 'rejeitado'] as const).map((action) => {
                const cfg = {
                  aprovado:  { label: 'APROVAR',             icon: '✅', bg: 'bg-green-500 hover:bg-green-600' },
                  correcao:  { label: 'SOLICITAR CORREÇÃO',  icon: '🔁', bg: 'bg-amber-500 hover:bg-amber-600' },
                  rejeitado: { label: 'REJEITAR',            icon: '❌', bg: 'bg-red-500   hover:bg-red-600'   },
                }[action];
                return (
                  <button
                    key={action}
                    onClick={() => handleRespond(action)}
                    disabled={!!responding}
                    className={cn(
                      `w-full py-4 ${cfg.bg} disabled:opacity-60 text-white text-base font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2`
                    )}
                  >
                    {responding === action
                      ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : cfg.icon
                    }
                    {cfg.label}
                  </button>
                );
              })}
            </div>

            {/* Validade do link */}
            {approval.expiresAt && (
              <p className="text-center text-[11px] text-gray-400">
                ⏰ Link válido até {formatDateTime(approval.expiresAt)}
              </p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  );
}

/* ─── Export público — sem dashboard layout ──────────────────────── */
export default function AprovacaoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
    </div>}>
      <AprovacaoContent />
    </Suspense>
  );
}
