'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
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

function ConfirmationScreen({ status }: { status: ApprovalStatus }) {
  const config: Record<ApprovalStatus, { icon: string; title: string; desc: string; color: string }> = {
    aprovado:  { icon: '✅', title: 'Conteúdo aprovado!',     desc: 'A equipe foi notificada.', color: 'text-green-600' },
    rejeitado: { icon: '❌', title: 'Conteúdo rejeitado.',     desc: 'A equipe foi notificada.', color: 'text-red-600'   },
    correcao:  { icon: '🔁', title: 'Correção solicitada!',   desc: 'A equipe fará os ajustes.', color: 'text-amber-600' },
    pending:   { icon: '⏳', title: 'Aguardando resposta...', desc: '', color: 'text-gray-600'  },
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

function AprovacaoContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [approval, setApproval] = useState<(Approval & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');
  const [responding, setResponding] = useState<ApprovalStatus | null>(null);
  const [responded, setResponded] = useState(false);

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

  const handleRespond = useCallback(async (status: 'aprovado' | 'rejeitado' | 'correcao') => {
    if (!token || responding) return;
    setResponding(status as ApprovalStatus);
    try {
      await respondApproval(token, status, comentario);
      setApproval((prev) => prev ? { ...prev, status } : null);
      setResponded(true);
    } catch {
      setError('Erro ao enviar. Tente novamente.');
    } finally {
      setResponding(null);
    }
  }, [token, responding, comentario]);

  const thumbnail = approval?.creatives?.[0]?.url;
  const isVideo = approval?.creatives?.[0]?.type?.startsWith('video');

  if (loading) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center p-6">
      <div className="text-center"><div className="text-6xl mb-4">😔</div><p className="text-gray-500">{error}</p></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <header className="px-6 py-4 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF5C00 0%, #FFB800 100%)' }}>
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
        {responded && approval ? <ConfirmationScreen status={approval.status} /> : approval ? (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FF5C00] flex items-center justify-center text-white font-bold shrink-0">
                {(approval.responsavel?.nome?.[0] ?? '?').toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{approval.responsavel?.nome}</p>
                <p className="text-xs text-gray-500">enviou este conteúdo para aprovação</p>
              </div>
            </div>

            {thumbnail && (
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
                {isVideo
                  ? <video src={thumbnail} controls autoPlay muted loop className="w-full max-h-[500px] object-contain bg-black" />
                  : <img src={thumbnail} alt="Criativo" className="w-full max-h-[500px] object-contain" />
                }
              </div>
            )}

            {approval.caption && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 uppercase mb-1">Legenda</p>
                <p className="text-sm text-gray-700 leading-relaxed">{approval.caption}</p>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Comentários (opcional)</label>
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)}
                placeholder="Ex: Alterar a cor do texto..." rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30" />
            </div>

            <div className="space-y-2">
              {(['aprovado', 'correcao', 'rejeitado'] as const).map((action) => {
                const cfg = {
                  aprovado:  { label: 'APROVAR',            icon: '✅', bg: 'bg-green-500 hover:bg-green-600' },
                  correcao:  { label: 'SOLICITAR CORREÇÃO', icon: '🔁', bg: 'bg-amber-500 hover:bg-amber-600' },
                  rejeitado: { label: 'REJEITAR',           icon: '❌', bg: 'bg-red-500   hover:bg-red-600'   },
                }[action];
                return (
                  <button key={action} onClick={() => handleRespond(action)} disabled={!!responding}
                    className={`w-full py-4 ${cfg.bg} disabled:opacity-60 text-white text-base font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2`}>
                    {responding === action
                      ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

export default function AprovacaoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8F7FF] flex items-center justify-center">
        <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
      </div>
    }>
      <AprovacaoContent />
    </Suspense>
  );
}
