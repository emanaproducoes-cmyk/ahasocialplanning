'use client';

import { useState }              from 'react';
import { cn }                    from '@/lib/utils/cn';
import { StatusBadge }           from '@/components/ui/Badge';
import { formatShortDate, formatDateTime } from '@/lib/utils/formatters';
import { movePostToStatus, removeDoc }     from '@/lib/firebase/firestore';
import { generateApprovalLink, copyToClipboard, buildWhatsAppLink, buildMailtoLink } from '@/lib/utils/approval';
import { showToast }             from '@/components/ui/Toast';
import type { Post, Responsavel } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rascunho:          { label: 'Rascunho',         color: 'bg-gray-100 text-gray-600' },
  conteudo:          { label: 'Conteúdo',          color: 'bg-blue-100 text-blue-600' },
  revisao:           { label: 'Revisão',           color: 'bg-yellow-100 text-yellow-700' },
  aprovacao_cliente: { label: 'Aprov. Cliente',    color: 'bg-purple-100 text-purple-600' },
  em_analise:        { label: 'Em Análise',        color: 'bg-indigo-100 text-indigo-700' },
  aprovado:          { label: 'Aprovado',          color: 'bg-green-100 text-green-700' },
  rejeitado:         { label: 'Rejeitado',         color: 'bg-red-100 text-red-700' },
  publicado:         { label: 'Publicado',         color: 'bg-emerald-100 text-emerald-700' },
};

function ImageViewer({ post }: { post: Post }) {
  const [slide,  setSlide]  = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const slides    = post.creatives?.map((c) => c.url) ?? [];
  const currentUrl = slides[slide];
  const isVideo   = post.creatives?.[slide]?.type?.startsWith('video');

  const handleDownload = () => {
    if (!currentUrl) return;
    const a = document.createElement('a');
    a.href = currentUrl; a.target = '_blank';
    a.download = `${post.title}-${slide + 1}`; a.click();
  };

  if (slides.length === 0) {
    return (
      <div className="w-full aspect-video rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        <span className="text-5xl opacity-40">🖼️</span>
      </div>
    );
  }

  return (
    <>
      {zoomed && currentUrl && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4" onClick={() => setZoomed(false)}>
          {isVideo
            ? <video src={currentUrl} controls autoPlay className="max-w-full max-h-full rounded-xl" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={currentUrl} alt="" className="max-w-full max-h-full object-contain" onClick={(e) => e.stopPropagation()} />
          }
          <button onClick={() => setZoomed(false)} className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-2xl">×</button>
        </div>
      )}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4 group">
        {isVideo
          ? <video src={currentUrl} controls className="w-full h-full object-contain" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={currentUrl} alt={post.title} className="w-full h-full object-contain" />
        }
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setZoomed(true)} className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80" title="Ampliar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button onClick={handleDownload} className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80" title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>
        {slides.length > 1 && (
          <>
            <button onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/80 text-lg">‹</button>
            <button onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))} disabled={slide === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/80 text-lg">›</button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)} className={cn('w-1.5 h-1.5 rounded-full', i === slide ? 'bg-white' : 'bg-white/50')} />
              ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">{slide + 1}/{slides.length}</div>
          </>
        )}
      </div>
    </>
  );
}

type Tab = 'Preview' | 'Comentários' | 'Ações';

function PostModal({ post, uid, responsavel, onClose }: { post: Post; uid: string; responsavel: Responsavel; onClose: () => void }) {
  const [tab,         setTab]         = useState<Tab>('Preview');
  const [saving,      setSaving]      = useState(false);
  const [comment,     setComment]     = useState('');
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [generating,  setGenerating]  = useState(false);

  const status = STATUS_LABELS[post.status] ?? STATUS_LABELS.rascunho;

  const handleAction = async (action: 'aprovado' | 'rejeitado' | 'revisao') => {
    setSaving(true);
    try {
      await movePostToStatus(uid, post.id, action, post.status);
      showToast(action === 'aprovado' ? '✅ Aprovado!' : action === 'rejeitado' ? '❌ Rejeitado.' : '🔁 Enviado para revisão.', action === 'aprovado' ? 'success' : 'info');
      onClose();
    } catch { showToast('Erro ao executar ação.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Excluir este post?')) return;
    await removeDoc(`users/${uid}/posts`, post.id);
    showToast('Post excluído.', 'success');
    onClose();
  };

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
      setApprovalUrl(url);
    } catch { showToast('Erro ao gerar link.', 'error'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-xl">
              {PLATFORM_EMOJI[post.platforms?.[0] ?? ''] ?? '📝'}
            </div>
            <div>
              <p className="font-bold text-[15px] text-gray-900">{post.title}</p>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', status.color)}>{status.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">🗑 Deletar</button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-xl text-gray-400">×</button>
          </div>
        </div>

        <div className="flex border-b border-gray-100 px-5">
          {(['Preview', 'Comentários', 'Ações'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-3 text-[13px] font-medium border-b-2 transition-colors',
                tab === t ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === 'Preview' && (
            <div className="p-5">
              <ImageViewer post={post} />
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'PLATAFORMA', value: post.platforms?.[0] ?? '—' },
                  { label: 'DATA', value: post.scheduledAt ? formatShortDate(post.scheduledAt) : '—' },
                  { label: 'STATUS', value: status.label },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">{label}</div>
                    <div className="text-sm font-semibold text-gray-800 capitalize truncate">{value}</div>
                  </div>
                ))}
              </div>
              {post.caption && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">LEGENDA</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
                </div>
              )}
              {post.hashtags?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {post.hashtags.map((h) => (
                    <span key={h} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">#{h}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'Comentários' && (
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-400 text-center py-4">Nenhum comentário ainda.</p>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentário interno..." rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30" />
              <button onClick={() => { if (comment.trim()) { showToast('Salvo!', 'success'); setComment(''); } }}
                className="flex items-center gap-2 px-4 py-2 bg-[#FF5C00] text-white text-sm rounded-lg hover:bg-[#E54E00]">
                💬 Salvar Comentário
              </button>
            </div>
          )}

          {tab === 'Ações' && (
            <div className="p-5 space-y-4">
              {approvalUrl ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-800">Link de aprovação gerado:</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={approvalUrl} className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-blue-700 truncate" />
                    <button onClick={() => { copyToClipboard(approvalUrl); showToast('Copiado!', 'success'); }}
                      className="text-xs px-2 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shrink-0">Copiar</button>
                  </div>
                  <div className="flex gap-2">
                    <a href={buildWhatsAppLink(approvalUrl, post.title)} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">📱 WhatsApp</a>
                    <a href={buildMailtoLink(approvalUrl, post.title)}
                      className="flex-1 text-center text-xs py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">📧 E-mail</a>
                  </div>
                </div>
              ) : (
                <button onClick={handleGenerateLink} disabled={generating}
                  className="w-full py-2.5 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl disabled:opacity-60">
                  {generating ? 'Gerando...' : '🔗 Gerar Link de Aprovação'}
                </button>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '✕ Rejeitar', action: 'rejeitado' as const, cls: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' },
                  { label: '✎ Corrigir', action: 'revisao' as const,   cls: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
                  { label: '✓ Aprovar',  action: 'aprovado' as const,  cls: 'bg-green-500 text-white hover:bg-green-600' },
                ].map(({ label, action, cls }) => (
                  <button key={action} onClick={() => handleAction(action)} disabled={saving}
                    className={cn('flex items-center justify-center gap-1 py-3 font-semibold rounded-xl text-sm transition-colors disabled:opacity-60', cls)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AgendamentoCardProps {
  post:        Post;
  uid:         string;
  responsavel: Responsavel;
  view:        'grade' | 'lista';
  onEdit?:     (post: Post) => void;
}

export function AgendamentoCard({ post, uid, responsavel, view, onEdit }: AgendamentoCardProps) {
  const [showModal,  setShowModal]  = useState(false);
  const [approving,  setApproving]  = useState(false);

  const thumbnail = post.creatives?.[0]?.url;
  const platform  = post.platforms?.[0];
  const status    = STATUS_LABELS[post.status] ?? STATUS_LABELS.rascunho;

  const handleSendApproval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setApproving(true);
    try {
      const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
      await copyToClipboard(url);
      showToast('Link de aprovação copiado! 🔗', 'success');
    } catch { showToast('Erro ao gerar link.', 'error'); }
    finally { setApproving(false); }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await removeDoc(`users/${uid}/posts`, post.id);
    showToast('Post excluído.', 'success');
  };

  if (view === 'lista') {
    return (
      <>
        <div
          className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200 flex items-center justify-center">
            {thumbnail
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={thumbnail} alt="" className="w-full h-full object-cover" />
              : <span className="text-lg">🖼️</span>
            }
          </div>
          <p className="flex-1 text-[14px] font-medium text-gray-800 truncate">{post.title}</p>
          <span className="text-lg shrink-0">{PLATFORM_EMOJI[platform ?? ''] ?? '📱'}</span>
          <p className="text-[13px] text-gray-400 shrink-0 hidden sm:block min-w-[110px]">
            {post.scheduledAt ? formatDateTime(post.scheduledAt) : '—'}
          </p>
          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', status.color)}>{status.label}</span>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleSendApproval} disabled={approving}
              className="p-1.5 text-[#FF5C00] hover:bg-[#FF5C00]/10 rounded-lg transition-colors" title="Enviar para aprovação">🔗</button>
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(post); }}
              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">✏️</button>
            <button onClick={handleDelete}
              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">🗑</button>
          </div>
        </div>
        {showModal && <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  return (
    <>
      <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-gray-100"
        onClick={() => setShowModal(true)}
      >
        <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '1/1' }}>
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <span className="text-xs">Sem criativo</span>
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', status.color)}>{status.label}</span>
          </div>
          <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-sm">
            {PLATFORM_EMOJI[platform ?? ''] ?? '📱'}
          </div>
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1.5 w-full">
              <button
                onClick={() => setShowModal(true)}
                className="flex-1 text-xs py-1.5 bg-white/90 hover:bg-white text-gray-800 font-medium rounded-lg transition-colors"
              >
                👁 Ver
              </button>
              <button
                onClick={handleSendApproval}
                disabled={approving}
                className="flex-1 text-xs py-1.5 bg-[#FF5C00]/90 hover:bg-[#FF5C00] text-white font-medium rounded-lg transition-colors disabled:opacity-60"
              >
                🔗 Link
              </button>
            </div>
          </div>
        </div>
        <div className="p-3">
          <p className="text-[13px] font-semibold text-gray-900 truncate mb-1">{post.title}</p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              {post.scheduledAt ? formatShortDate(post.scheduledAt) : 'Sem data'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit?.(post); }}
              className="w-6 h-6 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center transition-colors text-sm"
            >
              ✏️
            </button>
          </div>
        </div>
      </div>
      {showModal && <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />}
    </>
  );
}
