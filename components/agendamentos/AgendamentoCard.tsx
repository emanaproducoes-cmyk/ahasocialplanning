'use client';

/**
 * AgendamentoCard.tsx — Card de agendamento com:
 *  - Miniatura visível nos modos lista, grade e calendário
 *  - Lightbox ao clicar: ampliar, zoom e download
 *  - Suporte a carrossel de slides
 *  - Suporte a vídeos
 *
 * BUG FIX #2: Thumbnail uses creative.url (Cloudinary URL), not a local
 * blob preview. Added onError fallback so broken images degrade gracefully.
 */

import { useState }              from 'react';
import { cn }                    from '@/lib/utils/cn';
import { StatusBadge }           from '@/components/ui/Badge';
import { formatShortDate, formatDateTime } from '@/lib/utils/formatters';
import { movePostToStatus, removeDoc }     from '@/lib/firebase/firestore';
import { generateApprovalLink, copyToClipboard, buildWhatsAppLink, buildMailtoLink } from '@/lib/utils/approval';
import { showToast }             from '@/components/ui/Toast';
import type { Post, Responsavel } from '@/lib/types';

/* ─── Paletas de status ───────────────────────────────────────────── */
const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rascunho:          { label: 'Rascunho',      color: 'bg-gray-100 text-gray-600'    },
  conteudo:          { label: 'Conteúdo',       color: 'bg-blue-100 text-blue-600'    },
  revisao:           { label: 'Revisão',        color: 'bg-yellow-100 text-yellow-700' },
  aprovacao_cliente: { label: 'Aprov. Cliente', color: 'bg-purple-100 text-purple-600' },
  em_analise:        { label: 'Em Análise',     color: 'bg-indigo-100 text-indigo-700' },
  aprovado:          { label: 'Aprovado',       color: 'bg-green-100 text-green-700'  },
  rejeitado:         { label: 'Rejeitado',      color: 'bg-red-100 text-red-700'      },
  publicado:         { label: 'Publicado',      color: 'bg-emerald-100 text-emerald-700' },
};

/* ─── Placeholder SVG ────────────────────────────────────────────── */
function ImgPlaceholder({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

/* ─── MediaLightbox ──────────────────────────────────────────────── */
function MediaLightbox({
  slides, initialSlide = 0, postTitle, onClose,
}: {
  slides:       string[];
  initialSlide: number;
  postTitle:    string;
  onClose:      () => void;
}) {
  const [slide, setSlide] = useState(initialSlide);
  const [zoom,  setZoom]  = useState(1);

  const currentUrl = slides[slide];
  const isVideo    = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(currentUrl ?? '');

  const handleDownload = () => {
    if (!currentUrl) return;
    const a = document.createElement('a');
    a.href = currentUrl; a.target = '_blank';
    a.download = `${postTitle}-slide-${slide + 1}`; a.click();
  };

  const changeSlide = (dir: 1 | -1) => {
    setSlide((s) => Math.max(0, Math.min(slides.length - 1, s + dir)));
    setZoom(1);
  };

  return (
    <div className="fixed inset-0 bg-black/92 z-[200] flex flex-col items-center justify-center" onClick={onClose}>
      {/* Barra de controles superior */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 text-white/80 text-xs">
          {slides.length > 1 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full">{slide + 1} / {slides.length}</span>
          )}
          <span className="truncate max-w-[200px] hidden sm:block">{postTitle}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors"
            title="Reduzir zoom" disabled={isVideo}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          {!isVideo && <span className="text-white/70 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>}
          <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors"
            title="Aumentar zoom" disabled={isVideo}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          {zoom !== 1 && !isVideo && (
            <button onClick={() => setZoom(1)} className="text-white/70 text-xs hover:text-white px-2 py-1 rounded">100%</button>
          )}
          <button onClick={handleDownload}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors"
            title="Baixar arquivo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button onClick={onClose}
            className="w-8 h-8 bg-white/20 hover:bg-red-500/80 rounded-lg flex items-center justify-center text-white transition-colors"
            title="Fechar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Mídia principal */}
      <div
        className="flex items-center justify-center w-full h-full pt-14 pb-4 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="transition-transform duration-150 max-w-full max-h-full"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          {isVideo ? (
            <video src={currentUrl} controls autoPlay className="max-w-[90vw] max-h-[80vh] rounded-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentUrl}
              alt={postTitle}
              className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl"
              draggable={false}
            />
          )}
        </div>
      </div>

      {/* Navegação de slides */}
      {slides.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); changeSlide(-1); }} disabled={slide === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 disabled:opacity-20 text-white rounded-full flex items-center justify-center text-xl transition-colors">
            ‹
          </button>
          <button onClick={(e) => { e.stopPropagation(); changeSlide(1); }} disabled={slide === slides.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/60 hover:bg-black/80 disabled:opacity-20 text-white rounded-full flex items-center justify-center text-xl transition-colors">
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i}
                onClick={(e) => { e.stopPropagation(); setSlide(i); setZoom(1); }}
                className={cn('rounded-full transition-all', i === slide ? 'w-4 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/70')}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── ImageViewer (inline no modal de post) ──────────────────────── */
function ImageViewer({ post }: { post: Post }) {
  const [slide,        setSlide]        = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError,     setImgError]     = useState(false);

  // BUG FIX #2: always read from creative.url (Cloudinary), never from a blob
  const slides     = post.creatives?.map((c) => c.url).filter(Boolean) ?? [];
  const currentUrl = slides[slide];
  const isVideo    = post.creatives?.[slide]?.type?.startsWith('video');

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
      {lightboxOpen && (
        <MediaLightbox slides={slides} initialSlide={slide} postTitle={post.title} onClose={() => setLightboxOpen(false)} />
      )}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4 group cursor-zoom-in">
        {isVideo ? (
          <video src={currentUrl} controls className="w-full h-full object-contain" />
        ) : imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
            <ImgPlaceholder size={32} />
            <span className="text-xs text-gray-400">Criativo indisponível</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt={post.title}
            className="w-full h-full object-contain"
            onClick={() => setLightboxOpen(true)}
            onError={() => setImgError(true)}
          />
        )}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setLightboxOpen(true)}
            className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80" title="Ampliar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button onClick={handleDownload}
            className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80" title="Download">
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
                <button key={i} onClick={() => setSlide(i)}
                  className={cn('w-1.5 h-1.5 rounded-full', i === slide ? 'bg-white' : 'bg-white/50')} />
              ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
              {slide + 1}/{slides.length}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── Miniatura clicável (usada em lista, grade e calendário) ─────── */
/**
 * BUG FIX #2: ThumbnailPreview now reads post.creatives[0].url which is
 * the Cloudinary URL stored in Firestore. Previously it was reading a stale
 * blob (object URL from the upload preview) which doesn't survive navigation.
 */
function ThumbnailPreview({
  post, className, onClick,
}: {
  post:       Post;
  className?: string;
  onClick:    () => void;
}) {
  const [imgError, setImgError] = useState(false);

  // Only use the persisted Cloudinary URL — never fall back to a blob
  const thumbnail = post.creatives?.[0]?.url ?? null;
  const count     = post.creatives?.length ?? 0;

  return (
    <div
      className={cn('relative overflow-hidden bg-gray-100 cursor-pointer group', className)}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      title="Clique para ampliar"
    >
      {thumbnail && !imgError ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbnail}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            draggable={false}
            onError={() => setImgError(true)}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
          </div>
          {count > 1 && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded leading-none">
              +{count - 1}
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300">
          <ImgPlaceholder />
        </div>
      )}
    </div>
  );
}

/* ─── Modal de post (Preview / Comentários / Ações) ──────────────── */
type Tab = 'Preview' | 'Comentários' | 'Ações';

function PostModal({
  post, uid, responsavel, onClose,
}: {
  post:        Post;
  uid:         string;
  responsavel: Responsavel;
  onClose:     () => void;
}) {
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
      showToast(
        action === 'aprovado' ? '✅ Aprovado!' : action === 'rejeitado' ? '❌ Rejeitado.' : '🔁 Enviado para revisão.',
        action === 'aprovado' ? 'success' : 'info',
      );
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-xl">
              {PLATFORM_EMOJI[post.platforms?.[0] ?? ''] ?? '📝'}
            </div>
            <div>
              <p className="font-bold text-[15px] text-gray-900">{post.title}</p>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', status.color)}>
                {status.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
              🗑 Deletar
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-xl text-gray-400">
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(['Preview', 'Comentários', 'Ações'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'px-4 py-3 text-[13px] font-medium border-b-2 transition-colors',
                tab === t ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}>
              {t}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'Preview' && (
            <div className="p-5">
              <ImageViewer post={post} />
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'PLATAFORMA', value: post.platforms?.[0] ?? '—' },
                  { label: 'DATA',       value: post.scheduledAt ? formatShortDate(post.scheduledAt) : '—' },
                  { label: 'STATUS',     value: status.label },
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
              <textarea value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Comentário interno..." rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30" />
              <button
                onClick={() => { if (comment.trim()) { showToast('Salvo!', 'success'); setComment(''); } }}
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
                    <input readOnly value={approvalUrl}
                      className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-blue-700 truncate" />
                    <button onClick={() => { copyToClipboard(approvalUrl); showToast('Copiado!', 'success'); }}
                      className="text-xs px-2 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shrink-0">
                      Copiar
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <a href={buildWhatsAppLink(approvalUrl, post.title)} target="_blank" rel="noreferrer"
                      className="flex-1 text-center text-xs py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                      📱 WhatsApp
                    </a>
                    <a href={buildMailtoLink(approvalUrl, post.title)}
                      className="flex-1 text-center text-xs py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                      📧 E-mail
                    </a>
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
                  { label: '✎ Corrigir', action: 'revisao'   as const, cls: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
                  { label: '✓ Aprovar',  action: 'aprovado'  as const, cls: 'bg-green-500 text-white hover:bg-green-600' },
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

/* ─── AgendamentoCard (export principal) ─────────────────────────── */
interface AgendamentoCardProps {
  post:        Post;
  uid:         string;
  responsavel: Responsavel;
  view:        'grade' | 'lista' | 'calendario';
  onEdit?:     (post: Post) => void;
}

export function AgendamentoCard({ post, uid, responsavel, view, onEdit }: AgendamentoCardProps) {
  const [showModal,    setShowModal]    = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [approving,    setApproving]    = useState(false);

  // BUG FIX #2: always use the Cloudinary URL, never the blob preview
  const thumbnail = post.creatives?.[0]?.url ?? null;
  const platform  = post.platforms?.[0];
  const status    = STATUS_LABELS[post.status] ?? STATUS_LABELS.rascunho;
  const slides    = post.creatives?.map((c) => c.url).filter(Boolean) ?? [];

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
    if (!window.confirm('Excluir este post?')) return;
    await removeDoc(`users/${uid}/posts`, post.id);
    showToast('Post excluído.', 'success');
  };

  /* ── Modo LISTA ─────────────────────────────────────────────────── */
  if (view === 'lista') {
    return (
      <>
        <div
          className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
          onClick={() => setShowModal(true)}
        >
          <ThumbnailPreview
            post={post}
            onClick={() => slides.length > 0 ? setShowLightbox(true) : setShowModal(true)}
            className="w-12 h-12 rounded-xl shrink-0 border border-gray-200"
          />
          <p className="flex-1 text-[14px] font-medium text-gray-800 truncate">{post.title}</p>
          <span className="text-lg shrink-0">{PLATFORM_EMOJI[platform ?? ''] ?? '📱'}</span>
          <p className="text-[13px] text-gray-400 shrink-0 hidden sm:block min-w-[110px]">
            {post.scheduledAt ? formatDateTime(post.scheduledAt) : '—'}
          </p>
          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', status.color)}>
            {status.label}
          </span>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleSendApproval} disabled={approving}
              className="p-1.5 text-[#FF5C00] hover:bg-[#FF5C00]/10 rounded-lg transition-colors" title="Enviar para aprovação">
              🔗
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(post); }}
              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Editar">
              ✏️
            </button>
            <button onClick={handleDelete} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Excluir">
              🗑
            </button>
          </div>
        </div>
        {showLightbox && slides.length > 0 && (
          <MediaLightbox slides={slides} initialSlide={0} postTitle={post.title} onClose={() => setShowLightbox(false)} />
        )}
        {showModal && <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  /* ── Modo CALENDÁRIO (compacto) ─────────────────────────────────── */
  if (view === 'calendario') {
    return (
      <>
        <div
          className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-50 cursor-pointer group"
          onClick={() => setShowModal(true)}
        >
          <ThumbnailPreview
            post={post}
            onClick={() => slides.length > 0 ? setShowLightbox(true) : setShowModal(true)}
            className="w-6 h-6 rounded shrink-0"
          />
          <span className="text-[10px] font-medium text-gray-700 truncate flex-1">{post.title}</span>
        </div>
        {showLightbox && slides.length > 0 && (
          <MediaLightbox slides={slides} initialSlide={0} postTitle={post.title} onClose={() => setShowLightbox(false)} />
        )}
        {showModal && <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  /* ── Modo GRADE (padrão) ────────────────────────────────────────── */
  return (
    <>
      <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-gray-100"
        onClick={() => setShowModal(true)}
      >
        {/* Miniatura quadrada clicável */}
        <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '1/1' }}>
          {thumbnail ? (
            <>
              {/* BUG FIX #2: uses creative.url (Cloudinary), onError graceful fallback */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="Ampliar"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </button>
              {(post.creatives?.length ?? 0) > 1 && (
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                  {post.creatives!.length} slides
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-2">
              <ImgPlaceholder size={32} />
              <span className="text-xs">Sem criativo</span>
            </div>
          )}

          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', status.color)}>
              {status.label}
            </span>
          </div>

          {/* Ícone plataforma */}
          <div className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-sm">
            {PLATFORM_EMOJI[platform ?? ''] ?? '📱'}
          </div>

          {/* Overlay de ações */}
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex gap-1.5 w-full">
              <button onClick={() => setShowModal(true)}
                className="flex-1 text-xs py-1.5 bg-white/90 hover:bg-white text-gray-800 font-medium rounded-lg transition-colors">
                👁 Ver
              </button>
              <button onClick={handleSendApproval} disabled={approving}
                className="flex-1 text-xs py-1.5 bg-[#FF5C00]/90 hover:bg-[#FF5C00] text-white font-medium rounded-lg transition-colors disabled:opacity-60">
                🔗 Link
              </button>
            </div>
          </div>
        </div>

        {/* Info */}
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

      {showLightbox && slides.length > 0 && (
        <MediaLightbox slides={slides} initialSlide={0} postTitle={post.title} onClose={() => setShowLightbox(false)} />
      )}
      {showModal && <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />}
    </>
  );
}
