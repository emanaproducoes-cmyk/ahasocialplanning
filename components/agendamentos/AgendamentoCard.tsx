'use client';

import { useState }              from 'react';
import { cn }                    from '@/lib/utils/cn';
import { StatusBadge }           from '@/components/ui/Badge';
import { formatShortDate, formatDateTime } from '@/lib/utils/formatters';
import { movePostToStatus, removeDoc }     from '@/lib/firebase/firestore';
import { generateApprovalLink, copyToClipboard } from '@/lib/utils/approval';
import { showToast }             from '@/components/ui/Toast';
import type { Post, Responsavel } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

// ─── Post Detail Modal ────────────────────────────────────────────────────────
type Tab = 'Preview' | 'Comentários' | 'Ações';

function PostModal({
  post, uid, responsavel, onClose,
}: {
  post:        Post;
  uid:         string;
  responsavel: Responsavel;
  onClose:     () => void;
}) {
  const [tab,        setTab]        = useState<Tab>('Preview');
  const [zoom,       setZoom]       = useState(false);
  const [comment,    setComment]    = useState('');
  const [actionNote, setActionNote] = useState('');
  const [saving,     setSaving]     = useState(false);

  const thumbnail = post.creatives?.[0]?.url;
  const isVideo   = post.creatives?.[0]?.type?.startsWith('video');

  const handleDownload = () => {
    if (!thumbnail) return;
    const a  = document.createElement('a');
    a.href   = thumbnail;
    a.target = '_blank';
    a.download = post.title || 'criativo';
    a.click();
  };

  const handleAction = async (action: 'aprovado' | 'rejeitado' | 'revisao') => {
    setSaving(true);
    try {
      await movePostToStatus(uid, post.id, action, post.status);
      showToast(
        action === 'aprovado'  ? '✅ Post aprovado!'
        : action === 'rejeitado' ? '❌ Post rejeitado.'
        : '🔁 Post enviado para revisão.',
        action === 'aprovado' ? 'success' : 'info'
      );
      onClose();
    } catch {
      showToast('Erro ao executar ação.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    showToast('Comentário salvo!', 'success');
    setComment('');
  };

  return (
    <>
      {/* Zoom overlay */}
      {zoom && thumbnail && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoom(false)}
        >
          {isVideo ? (
            <video src={thumbnail} controls autoPlay className="max-w-full max-h-full rounded-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          )}
          <button
            onClick={() => setZoom(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >
            ×
          </button>
        </div>
      )}

      {/* Modal overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-modal flex flex-col max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-xl">
                📸
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-[15px]">{post.title}</p>
                <StatusBadge status={post.status} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  await removeDoc(`users/${uid}/posts`, post.id);
                  showToast('Post deletado.', 'success');
                  onClose();
                }}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 text-[13px] font-medium transition-colors"
              >
                🗑 Deletar
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                ×
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-5">
            {(['Preview', 'Comentários', 'Ações'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-3 text-[13px] font-medium border-b-2 transition-colors',
                  tab === t
                    ? 'border-[#FF5C00] text-[#FF5C00]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            {tab === 'Preview' && (
              <div>
                {/* Image area */}
                <div className="relative bg-gray-50 mx-4 mt-4 rounded-xl overflow-hidden">
                  {thumbnail ? (
                    <div className="relative">
                      {isVideo ? (
                        <video src={thumbnail} controls className="w-full max-h-80 object-contain" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={thumbnail} alt={post.title} className="w-full max-h-80 object-contain" />
                      )}
                      {/* Zoom + Download buttons */}
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <button
                          onClick={() => setZoom(true)}
                          className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-gray-700 shadow transition-colors"
                          title="Ampliar"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                            <line x1="11" y1="8" x2="11" y2="14"/>
                            <line x1="8" y1="11" x2="14" y2="11"/>
                          </svg>
                        </button>
                        <button
                          onClick={handleDownload}
                          className="w-8 h-8 bg-white/90 hover:bg-white rounded-lg flex items-center justify-center text-gray-700 shadow transition-colors"
                          title="Download"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-48 flex items-center justify-center text-gray-300">
                      <div className="text-center">
                        <span className="text-5xl">🖼️</span>
                        <p className="text-sm mt-2">Sem criativo</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fields */}
                <div className="grid grid-cols-3 gap-3 px-4 py-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      PLATAFORMA
                    </label>
                    <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30">
                      <option value="instagram">Instagram</option>
                      <option value="facebook">Facebook</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                      <option value="linkedin">LinkedIn</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      DATA
                    </label>
                    <input
                      type="date"
                      defaultValue={post.scheduledAt ? new Date((post.scheduledAt as unknown as { toDate: () => Date }).toDate?.() ?? post.scheduledAt).toISOString().split('T')[0] : ''}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      CAMPANHA
                    </label>
                    <div className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-400 bg-gray-50">
                      —
                    </div>
                  </div>
                </div>

                {/* Caption */}
                {post.caption && (
                  <div className="px-4 pb-4">
                    <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">LEGENDA</label>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg px-3 py-2.5">{post.caption}</p>
                  </div>
                )}

                {/* Save button */}
                <div className="px-4 pb-4 flex justify-end">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-sm font-semibold rounded-xl transition-colors">
                    💾 Salvar
                  </button>
                </div>
              </div>
            )}

            {tab === 'Comentários' && (
              <div className="p-5 space-y-4">
                <div className="text-center py-6 text-gray-400 text-sm">
                  Nenhum comentário ainda.
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Adicione um comentário interno..."
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
                />
                <button
                  onClick={handleSaveComment}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-sm font-medium rounded-xl transition-colors"
                >
                  💬 Salvar Comentário
                </button>
              </div>
            )}

            {tab === 'Ações' && (
              <div className="p-5 space-y-4">
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder="Adicione um comentário sobre a ação..."
                  rows={4}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
                />
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleAction('rejeitado')}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-xl border border-red-200 transition-colors disabled:opacity-60"
                  >
                    ⊗ Rejeitar
                  </button>
                  <button
                    onClick={() => handleAction('revisao')}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 py-3 bg-amber-50 hover:bg-amber-100 text-amber-600 text-sm font-medium rounded-xl border border-amber-200 transition-colors disabled:opacity-60"
                  >
                    ✎ Corrigir
                  </button>
                  <button
                    onClick={() => handleAction('aprovado')}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
                  >
                    ✓ Aprovar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Agendamento Card ─────────────────────────────────────────────────────────
interface AgendamentoCardProps {
  post:        Post;
  uid:         string;
  responsavel: Responsavel;
  view:        'grade' | 'lista';
  onEdit?:     (post: Post) => void;
}

export function AgendamentoCard({ post, uid, responsavel, view, onEdit }: AgendamentoCardProps) {
  const [showModal,   setShowModal]   = useState(false);
  const [approving,   setApproving]   = useState(false);

  const thumbnail = post.creatives?.[0]?.url;
  const platform  = post.platforms?.[0];

  const handleApprove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await movePostToStatus(uid, post.id, 'aprovado', post.status);
    showToast('Post aprovado!', 'success');
  };

  const handleReject = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await movePostToStatus(uid, post.id, 'rejeitado', post.status);
    showToast('Post rejeitado.', 'info');
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeDoc(`users/${uid}/posts`, post.id);
    showToast('Post excluído.', 'success');
  };

  const handleSendApproval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setApproving(true);
    try {
      const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
      await copyToClipboard(url);
      showToast('Link de aprovação copiado!', 'success');
    } catch {
      showToast('Erro ao gerar link.', 'error');
    } finally {
      setApproving(false);
    }
  };

  if (view === 'lista') {
    return (
      <>
        <div
          className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
            {thumbnail
              ? <img src={thumbnail} alt="" className="w-full h-full object-cover" /> // eslint-disable-line
              : <div className="w-full h-full flex items-center justify-center text-xl">🖼️</div>
            }
          </div>
          <p className="flex-1 text-[14px] font-medium text-gray-800 truncate">{post.title}</p>
          <span className="text-xl shrink-0">{PLATFORM_EMOJI[platform ?? ''] ?? '📱'}</span>
          <p className="text-[13px] text-gray-500 shrink-0 hidden md:block">
            {post.scheduledAt ? formatDateTime(post.scheduledAt) : '—'}
          </p>
          <StatusBadge status={post.status} />
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleApprove}      className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors" title="Aprovar">✅</button>
            <button onClick={handleReject}        className="p-1.5 text-red-400   hover:bg-red-50   rounded-lg transition-colors" title="Rejeitar">❌</button>
            <button onClick={handleSendApproval} disabled={approving} className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors" title="Enviar">📧</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(post); }} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Editar">✏️</button>
            <button onClick={handleDelete}        className="p-1.5 text-red-400   hover:bg-red-50   rounded-lg transition-colors" title="Excluir">🗑</button>
          </div>
        </div>

        {showModal && (
          <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />
        )}
      </>
    );
  }

  // Grade view
  return (
    <>
      <div
        className="bg-white rounded-2xl shadow-card overflow-hidden group hover:shadow-hover transition-all cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        {/* Thumbnail — always visible */}
        <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '1/1' }}>
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnail}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-xs">Sem criativo</span>
            </div>
          )}
          {/* Status badge */}
          <div className="absolute top-2 right-2">
            <StatusBadge status={post.status} />
          </div>
          {/* Hover action overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}>
            <button onClick={handleApprove}       className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center text-sm hover:bg-green-600 transition-colors">✅</button>
            <button onClick={handleReject}         className="w-9 h-9 rounded-full bg-red-500   flex items-center justify-center text-sm hover:bg-red-600   transition-colors">❌</button>
            <button onClick={handleSendApproval}  disabled={approving} className="w-9 h-9 rounded-full bg-blue-500  flex items-center justify-center text-sm hover:bg-blue-600  transition-colors">📧</button>
            <button onClick={handleDelete}         className="w-9 h-9 rounded-full bg-gray-700  flex items-center justify-center text-sm hover:bg-gray-900  transition-colors">🗑</button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <p className="text-[14px] font-semibold text-gray-900 truncate mb-1">{post.title}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <span>{PLATFORM_EMOJI[platform ?? ''] ?? '📱'}</span>
              {post.scheduledAt && <span>{formatShortDate(post.scheduledAt)}</span>}
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(post); }}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors text-sm"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
