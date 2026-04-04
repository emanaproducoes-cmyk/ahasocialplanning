'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams }  from 'next/navigation';
import { fetchApproval, respondApproval } from '@/lib/firebase/firestore';
import { isApprovalExpired } from '@/lib/utils/approval';
import { formatDateTime }    from '@/lib/utils/formatters';
import { cn }                from '@/lib/utils/cn';
import type { Approval, ApprovalStatus } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

// ─── Confirmation screen ──────────────────────────────────────────────────────
function ConfirmationScreen({ status }: { status: ApprovalStatus }) {
  const config: Record<ApprovalStatus, { icon: string; title: string; desc: string; color: string }> = {
    aprovado:  { icon: '✅', title: 'Conteúdo aprovado!',           desc: 'A equipe foi notificada e o conteúdo será publicado conforme agendado.', color: 'text-green-600' },
    rejeitado: { icon: '❌', title: 'Conteúdo rejeitado.',           desc: 'A equipe foi notificada e realizará os ajustes necessários.',           color: 'text-red-600'   },
    correcao:  { icon: '🔁', title: 'Correção solicitada!',         desc: 'Sua solicitação foi enviada. A equipe fará os ajustes necessários.',    color: 'text-amber-600' },
    pending:   { icon: '⏳', title: 'Aguardando resposta...',       desc: '',                                                                       color: 'text-gray-600'  },
  };
  const { icon, title, desc, color } = config[status];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="text-7xl mb-6 animate-[fadeIn_0.5s_ease-out]">{icon}</div>
      <h2 className={cn('text-2xl font-bold mb-3', color)}>{title}</h2>
      {desc && <p className="text-gray-500 text-sm max-w-xs leading-relaxed">{desc}</p>}
      <div className="mt-8 text-xs text-gray-400">
        Você pode fechar esta janela.
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AprovacaoPage() {
  const searchParams    = useSearchParams();
  const token           = searchParams.get('token');

  const [approval,      setApproval]      = useState<(Approval & { id: string }) | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [comentario,    setComentario]    = useState('');
  const [responding,    setResponding]    = useState<ApprovalStatus | null>(null);
  const [responded,     setResponded]     = useState(false);
  const [expandCaption, setExpandCaption] = useState(false);

  useEffect(() => {
    if (!token) { setError('Link inválido ou expirado.'); setLoading(false); return; }

    fetchApproval(token)
      .then((data) => {
        if (!data) { setError('Link inválido ou expirado. ❌'); return; }
        if (isApprovalExpired(data.expiresAt)) { setError('Este link de aprovação expirou. ⏰'); return; }
        if (data.status !== 'pending') { setApproval(data); setResponded(true); return; }
        setApproval(data);
      })
      .catch(() => setError('Erro ao carregar aprovação. Tente novamente.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleRespond = useCallback(async (status: 'aprovado' | 'rejeitado' | 'correcao') => {
    if (!token || responding) return;
    setResponding(status);
    try {
      await respondApproval(token, status, comentario);
      setApproval((prev) => prev ? { ...prev, status } : null);
      setResponded(true);
    } catch {
      setError('Erro ao enviar resposta. Tente novamente.');
    } finally {
      setResponding(null);
    }
  }, [token, responding, comentario]);

  const thumbnail = approval?.creatives?.[0]?.url;
  const isVideo   = approval?.creatives?.[0]?.type?.startsWith('video');

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando aprovação...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">😔</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ops!</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FF8C00 50%, #FFB800 100%)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="font-bold text-white text-lg">A</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">AHA SOCIAL PLANNING</p>
            <p className="text-white/70 text-[10px] tracking-wider">Aprovação de Conteúdo</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {responded && approval ? (
          <ConfirmationScreen status={approval.status} />
        ) : approval ? (
          <div className="space-y-5 animate-fade-in">
            {/* Responsável */}
            <div className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF5C00] flex items-center justify-center text-white font-bold shrink-0">
                {(approval.responsavel?.nome?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{approval.responsavel?.nome}</p>
                <p className="text-xs text-gray-500">enviou este conteúdo para sua aprovação</p>
              </div>
              {approval.expiresAt && (
                <div className="ml-auto text-right shrink-0">
                  <p className="text-[10px] text-gray-400">Expira em</p>
                  <p className="text-xs font-medium text-amber-600">
                    {formatDateTime(approval.expiresAt)}
                  </p>
                </div>
              )}
            </div>

            {/* Media preview */}
            {thumbnail && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-card">
                {isVideo ? (
                  <video
                    src={thumbnail}
                    controls
                    autoPlay
                    muted
                    loop
                    className="w-full max-h-[500px] object-contain bg-black"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumbnail}
                    alt="Criativo"
                    className="w-full max-h-[500px] object-contain"
                  />
                )}
              </div>
            )}

            {/* Post details */}
            <div className="bg-white rounded-2xl p-4 shadow-card space-y-3">
              {/* Platforms */}
              {approval.platforms?.length > 0 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Plataformas</p>
                  <div className="flex gap-2">
                    {approval.platforms.map((p) => (
                      <span key={p} className="flex items-center gap-1 text-xs bg-gray-50 px-2 py-1 rounded-full">
                        <span>{PLATFORM_EMOJI[p] ?? '📱'}</span>
                        <span className="capitalize text-gray-600">{p}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Caption */}
              {approval.caption && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Legenda</p>
                  <p className={cn('text-sm text-gray-700 leading-relaxed whitespace-pre-wrap', !expandCaption && 'line-clamp-4')}>
                    {approval.caption}
                  </p>
                  {approval.caption.length > 200 && (
                    <button
                      onClick={() => setExpandCaption((p) => !p)}
                      className="text-xs text-[#FF5C00] mt-1 hover:underline"
                    >
                      {expandCaption ? 'Ver menos' : 'Ver mais'}
                    </button>
                  )}
                </div>
              )}

              {/* All media thumbnails */}
              {approval.creatives?.length > 1 && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">
                    Todas as mídias ({approval.creatives.length})
                  </p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {approval.creatives.map((c, i) => (
                      <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border-2 border-gray-200">
                        {c.type.startsWith('image') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Comment textarea */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                Comentários ou observações
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                placeholder="Ex: Alterar a cor do texto, ajustar o logo..."
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
              />
            </div>

            {/* Action buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleRespond('aprovado')}
                disabled={!!responding}
                className="w-full py-4 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-base font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {responding === 'aprovado'
                  ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : '✅'}
                APROVAR
              </button>

              <button
                onClick={() => handleRespond('correcao')}
                disabled={!!responding}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-base font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {responding === 'correcao'
                  ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : '🔁'}
                SOLICITAR CORREÇÃO
              </button>

              <button
                onClick={() => handleRespond('rejeitado')}
                disabled={!!responding}
                className="w-full py-4 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white text-base font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {responding === 'rejeitado'
                  ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : '❌'}
                REJEITAR
              </button>
            </div>

            <p className="text-center text-xs text-gray-400 pb-4">
              Sua resposta será registrada imediatamente após o clique.
            </p>
          </div>
        ) : null}
      </main>
    </div>
  );
}
