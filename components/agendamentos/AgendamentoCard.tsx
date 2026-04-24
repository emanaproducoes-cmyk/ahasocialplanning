'use client';

import { useState }    from 'react';
import { Timestamp }   from 'firebase/firestore';
import { cn }          from '@/lib/utils/cn';
import { formatShortDate, formatDateTime } from '@/lib/utils/formatters';
import { movePostToStatus, removeDoc, updateFields } from '@/lib/firebase/firestore';
import { generateApprovalLink, copyToClipboard, buildWhatsAppLink, buildMailtoLink } from '@/lib/utils/approval';
import { showToast }   from '@/components/ui/Toast';
import type { Post, Responsavel, Platform } from '@/lib/types';

// ── Video detection ──────────────────────────────────────────────────────────
function isVideoCreative(creative: { type?: string; url?: string } | undefined): boolean {
  if (!creative) return false;
  if (creative.type) return creative.type.startsWith('video');
  if (creative.url)  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(creative.url) || creative.url.includes('video%2F');
  return false;
}

function VideoThumb({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`relative bg-gray-900 overflow-hidden w-full h-full ${className ?? ''}`}>
      <video
        src={src}
        className="absolute inset-0 w-full h-full object-cover"
        preload="metadata"
        muted
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.target as HTMLVideoElement;
          v.currentTime = 1;
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
        <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 ml-0.5">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      </div>
    </div>
  );
}

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
  pinterest: '📌', google_business: '🏢',
};

const ALL_PLATFORMS: { id: Platform; label: string }[] = [
  { id: 'instagram',       label: 'Instagram'          },
  { id: 'facebook',        label: 'Facebook'           },
  { id: 'tiktok',          label: 'TikTok'             },
  { id: 'youtube',         label: 'YouTube'            },
  { id: 'linkedin',        label: 'LinkedIn'           },
  { id: 'threads',         label: 'Threads'            },
  { id: 'pinterest',       label: 'Pinterest'          },
  { id: 'google_business', label: 'Google Meu Negócio' },
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rascunho:   { label: 'Rascunho',   color: 'bg-gray-100 text-gray-600'       },
  conteudo:   { label: 'Conteúdo',   color: 'bg-blue-100 text-blue-600'       },
  revisao:    { label: 'Revisão',    color: 'bg-yellow-100 text-yellow-700'   },
  em_analise: { label: 'Em Análise', color: 'bg-indigo-100 text-indigo-700'   },
  aprovado:   { label: 'Aprovado',   color: 'bg-green-100 text-green-700'     },
  rejeitado:  { label: 'Rejeitado',  color: 'bg-red-100 text-red-700'         },
  publicado:  { label: 'Publicado',  color: 'bg-emerald-100 text-emerald-700' },
};

function ImgPlaceholder({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  );
}

function MediaLightbox({ slides, initialSlide = 0, postTitle, onClose }: {
  slides: string[]; initialSlide: number; postTitle: string; onClose: () => void;
}) {
  const [slide, setSlide] = useState(initialSlide);
  const [zoom,  setZoom]  = useState(1);
  const currentUrl = slides[slide] ?? '';
  const isVideo    = /\.(mp4|webm|ogg|mov)(\?|$)/i.test(currentUrl);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = currentUrl; a.target = '_blank';
    a.download = `${postTitle}-slide-${slide + 1}`; a.click();
  };

  return (
    <div className="fixed inset-0 bg-black/92 z-[200] flex flex-col items-center justify-center" onClick={onClose}>
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/40" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 text-white/80 text-xs">
          {slides.length > 1 && <span className="bg-white/20 px-2 py-0.5 rounded-full">{slide + 1}/{slides.length}</span>}
          <span className="truncate max-w-[200px] hidden sm:block">{postTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isVideo && (
            <>
              <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white text-lg">−</button>
              <span className="text-white/70 text-xs w-10 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom((z) => Math.min(4, z + 0.25))} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white text-lg">+</button>
            </>
          )}
          <button onClick={handleDownload} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white text-sm">⬇</button>
          <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-red-500/80 rounded-lg flex items-center justify-center text-white">✕</button>
        </div>
      </div>

      <div className="flex items-center justify-center w-full h-full pt-14 pb-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
          {isVideo
            ? <video src={currentUrl} controls autoPlay className="max-w-[90vw] max-h-[80vh] rounded-xl" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={currentUrl} alt={postTitle} className="max-w-[90vw] max-h-[80vh] object-contain rounded-xl" draggable={false} />
          }
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-6 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { setSlide((s) => Math.max(0, s - 1)); setZoom(1); }} disabled={slide === 0}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30">‹</button>
          <div className="flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => { setSlide(i); setZoom(1); }}
                className={cn('w-2 h-2 rounded-full', i === slide ? 'bg-white' : 'bg-white/40')} />
            ))}
          </div>
          <button onClick={() => { setSlide((s) => Math.min(slides.length - 1, s + 1)); setZoom(1); }} disabled={slide === slides.length - 1}
            className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  );
}

function ImageViewer({ post }: { post: Post }) {
  const [slide,        setSlide]        = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const slides  = post.creatives?.map((c) => c.url).filter(Boolean) ?? [];
  const current = slides[slide] ?? '';
  const isVideo = isVideoCreative(post.creatives?.[slide]);

  if (slides.length === 0) {
    return (
      <div className="w-full aspect-video rounded-xl bg-gray-100 flex items-center justify-center mb-4 text-gray-300">
        <ImgPlaceholder size={40} />
      </div>
    );
  }

  return (
    <>
      <div className="relative rounded-xl overflow-hidden mb-4 bg-black">
        {isVideo ? (
          /* Vídeo: controls nativos, sem cursor-zoom-in nem onClick para lightbox */
          <video
            src={current}
            controls
            className="w-full max-h-[340px] object-contain"
          />
        ) : (
          /* Imagem: cursor-zoom-in + lightbox ao clicar */
          <div className="cursor-zoom-in" onClick={() => setLightboxOpen(true)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current} alt={post.title} className="w-full max-h-[340px] object-contain" />
          </div>
        )}

        {/* Botão lightbox só para imagens */}
        {!isVideo && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
              className="w-7 h-7 bg-black/50 text-white rounded-lg opacity-80 hover:opacity-100 flex items-center justify-center text-xs"
              title="Ampliar"
            >🔍</button>
          </div>
        )}

        {slides.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setSlide((s) => Math.max(0, s - 1)); }} disabled={slide === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30">‹</button>
            <button onClick={(e) => { e.stopPropagation(); setSlide((s) => Math.min(slides.length - 1, s + 1)); }} disabled={slide === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30">›</button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {slides.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setSlide(i); }}
                  className={cn('w-1.5 h-1.5 rounded-full', i === slide ? 'bg-white' : 'bg-white/50')} />
              ))}
            </div>
          </>
        )}
      </div>
      {lightboxOpen && !isVideo && (
        <MediaLightbox slides={slides} initialSlide={slide} postTitle={post.title} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

function ThumbnailPreview({ post, className, onClick }: {
  post: Post; className?: string; onClick: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const firstCreative = post.creatives?.[0];
  const thumbnail     = firstCreative?.url ?? null;
  const count         = post.creatives?.length ?? 0;
  const isVid         = isVideoCreative(firstCreative);

  return (
    <div className={cn('relative overflow-hidden bg-gray-100 cursor-pointer group', className)}
      onClick={(e) => { e.stopPropagation(); onClick(); }} title="Clique para ver detalhes">
      {thumbnail && !imgError ? (
        <>
          {isVid
            ? <VideoThumb src={thumbnail} className="w-full h-full" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                draggable={false} onError={() => setImgError(true)} />
          }
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white text-xs">🔍</div>
          </div>
          {count > 1 && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded">+{count - 1}</div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-300"><ImgPlaceholder /></div>
      )}
    </div>
  );
}

type Tab = 'Preview' | 'Editar' | 'Ações';

function PostModal({ post, uid, responsavel, onClose }: {
  post: Post; uid: string; responsavel: Responsavel; onClose: () => void;
}) {
  const [tab,         setTab]         = useState<Tab>('Preview');
  const [saving,      setSaving]      = useState(false);
  const [editSaving,  setEditSaving]  = useState(false);
  const [approvalUrl, setApprovalUrl] = useState<string | null>(null);
  const [generating,  setGenerating]  = useState(false);

  const [editPlatforms, setEditPlatforms] = useState<Platform[]>(post.platforms ?? []);
  const [editDate,      setEditDate]      = useState<string>(() => {
    if (!post.scheduledAt) return '';
    try {
      const ts = post.scheduledAt as unknown as { toDate?: () => Date };
      const d  = ts.toDate ? ts.toDate() : new Date(post.scheduledAt as unknown as string);
      return d.toISOString().slice(0, 10);
    } catch (_e) { return ''; }
  });
  const [editCampaign, setEditCampaign] = useState<string>(post.campaignId ?? '');

  const status = STATUS_LABELS[post.status] ?? STATUS_LABELS.rascunho;

  const togglePlatform = (p: Platform) =>
    setEditPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      await updateFields(`users/${uid}/posts`, post.id, {
        platforms:   editPlatforms,
        campaignId:  editCampaign || null,
        scheduledAt: editDate ? Timestamp.fromDate(new Date(editDate + 'T12:00:00')) : null,
      });
      showToast('Atualizado! ✅', 'success');
    } catch (_err) { showToast('Erro ao salvar.', 'error'); }
    finally { setEditSaving(false); }
  };

  const handleAction = async (action: 'aprovado' | 'rejeitado' | 'revisao') => {
    setSaving(true);
    try {
      await movePostToStatus(uid, post.id, action, post.status);
      showToast(action === 'aprovado' ? '✅ Aprovado!' : action === 'rejeitado' ? '❌ Rejeitado.' : '🔁 Para revisão.', 'success');
      onClose();
    } catch (_err) { showToast('Erro.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Excluir este post?')) return;
    await removeDoc(`users/${uid}/posts`, post.id);
    showToast('Excluído.', 'success');
    onClose();
  };

  const handleGenerateLink = async () => {
    setGenerating(true);
    try {
      const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
      setApprovalUrl(url);
    } catch (_err) { showToast('Erro ao gerar link.', 'error'); }
    finally { setGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
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
            <button onClick={handleDelete} className="text-sm text-red-500 hover:text-red-700 font-medium">🗑 Deletar</button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-xl text-gray-400">×</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(['Preview', 'Editar', 'Ações'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-3 text-[13px] font-medium border-b-2 transition-colors',
                tab === t ? 'border-[#FF5C00] text-[#FF5C00]' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Preview */}
          {tab === 'Preview' && (
            <div className="p-5">
              <ImageViewer post={post} />
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'PLATAFORMA', value: post.platforms?.join(', ') || '—' },
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
              {(post.hashtags?.length ?? 0) > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {post.hashtags!.map((h) => (
                    <span key={h} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">#{h}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Editar */}
          {tab === 'Editar' && (
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Plataformas</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_PLATFORMS.map((p) => {
                    const active = editPlatforms.includes(p.id);
                    return (
                      <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                          active ? 'bg-[#FF5C00] text-white border-[#FF5C00]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF5C00]/50')}>
                        <span>{PLATFORM_EMOJI[p.id] ?? '📱'}</span>
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Data de publicação</label>
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Campanha</label>
                <input type="text" value={editCampaign} onChange={(e) => setEditCampaign(e.target.value)}
                  placeholder="Ex: Black Friday 2026"
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
              </div>

              <button onClick={handleSaveEdit} disabled={editSaving}
                className="w-full py-3 bg-[#FF5C00] hover:bg-[#E54E00] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2">
                {editSaving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : '💾'}
                {editSaving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}

          {/* Ações */}
          {tab === 'Ações' && (
            <div className="p-5 space-y-4">
              {approvalUrl ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-blue-800">🔗 Link gerado:</p>
                  <div className="flex gap-2">
                    <input readOnly value={approvalUrl}
                      className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-blue-700 truncate" />
                    <button onClick={() => { copyToClipboard(approvalUrl); showToast('Copiado!', 'success'); }}
                      className="px-3 py-1.5 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 shrink-0">Copiar</button>
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
                  className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl disabled:opacity-60">
                  {generating ? 'Gerando...' : '🔗 Gerar Link de Aprovação'}
                </button>
              )}
              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: '✕ Rejeitar', action: 'rejeitado' as const, cls: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'         },
                  { label: '✎ Corrigir', action: 'revisao'   as const, cls: 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100' },
                  { label: '✓ Aprovar',  action: 'aprovado'  as const, cls: 'bg-green-500 text-white hover:bg-green-600'                            },
                ] as const).map(({ label, action, cls }) => (
                  <button key={action} onClick={() => handleAction(action)} disabled={saving}
                    className={cn('py-3 font-semibold rounded-xl text-sm transition-colors disabled:opacity-60', cls)}>
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

/* ─── Export principal ───────────────────────────────────────────── */
interface AgendamentoCardProps {
  post:        Post;
  uid:         string;
  responsavel: Responsavel;
  view:        'grade' | 'lista' | 'calendario';
  onEdit?:     (post: Post) => void;
}

export function AgendamentoCard({ post, uid, responsavel, view, onEdit: _onEdit }: AgendamentoCardProps) {
  const [showModal,    setShowModal]    = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [approving,    setApproving]    = useState(false);

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
      showToast('Link copiado! 🔗', 'success');
    } catch (_err) { showToast('Erro ao gerar link.', 'error'); }
    finally { setApproving(false); }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir este post?')) return;
    await removeDoc(`users/${uid}/posts`, post.id);
    showToast('Post excluído.', 'success');
  };

  if (view === 'lista') {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50/80 transition-colors cursor-pointer"
          onClick={() => setShowModal(true)}>
          <ThumbnailPreview post={post} onClick={() => setShowModal(true)} className="w-16 h-16 rounded-xl shrink-0 border border-gray-200 overflow-hidden" />
          <p className="flex-1 text-[14px] font-medium text-gray-800 truncate">{post.title}</p>
          <span className="text-lg shrink-0">{PLATFORM_EMOJI[platform ?? ''] ?? '📱'}</span>
          <p className="text-[13px] text-gray-400 shrink-0 hidden sm:block min-w-[110px]">
            {post.scheduledAt ? formatDateTime(post.scheduledAt) : '—'}
          </p>
          <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium shrink-0', status.color)}>{status.label}</span>
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleSendApproval} disabled={approving}
              className="p-1.5 text-[#FF5C00] hover:bg-[#FF5C00]/10 rounded-lg" title="Aprovação">🔗</button>
            <button onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
              className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg" title="Editar">✏️</button>
            <button onClick={handleDelete} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Excluir">🗑</button>
          </div>
        </div>
        {showLightbox && slides.length > 0 && (
          <MediaLightbox slides={slides} initialSlide={0} postTitle={post.title} onClose={() => setShowLightbox(false)} />
        )}
        {showModal && <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  if (view === 'calendario') {
    return (
      <>
        <div className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-gray-50 cursor-pointer group" onClick={() => setShowModal(true)}>
          <ThumbnailPreview post={post} onClick={() => setShowModal(true)} className="w-6 h-6 rounded shrink-0" />
          <span className="text-[10px] font-medium text-gray-700 truncate flex-1">{post.title}</span>
        </div>
        {showModal && <PostModal post={post} uid={uid} responsavel={responsavel} onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // Grade
  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden group hover:shadow-md transition-all cursor-pointer border border-gray-100"
        onClick={() => setShowModal(true)}>
        <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: '1/1' }}>
          {thumbnail ? (
            <>
              {isVideoCreative(post.creatives?.[0])
                ? <VideoThumb src={thumbnail} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
                // eslint-disable-next-line @next/next/no-img-element
                : <img src={thumbnail} alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              }
              <button onClick={(e) => { e.stopPropagation(); setShowLightbox(true); }}
                className="absolute top-2 right-2 w-7 h-7 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                title="Ampliar">🔍</button>
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
          <div className="absolute top-2 left-2">
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold', status.color)}>{status.label}</span>
          </div>
          <div className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-black/60 flex items-center justify-center text-sm">
            {PLATFORM_EMOJI[platform ?? ''] ?? '📱'}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-1.5 w-full">
              <button onClick={() => setShowModal(true)}
                className="flex-1 text-xs py-1.5 bg-white/90 hover:bg-white text-gray-800 font-medium rounded-lg">👁 Ver</button>
              <button onClick={handleSendApproval} disabled={approving}
                className="flex-1 text-xs py-1.5 bg-[#FF5C00]/90 hover:bg-[#FF5C00] text-white font-medium rounded-lg disabled:opacity-60">🔗 Link</button>
            </div>
          </div>
        </div>
        <div className="p-3">
          <p className="text-[13px] font-semibold text-gray-900 truncate mb-1">{post.title}</p>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-400">
              {post.scheduledAt ? formatShortDate(post.scheduledAt) : 'Sem data'}
            </span>
            <button onClick={(e) => { e.stopPropagation(); setShowModal(true); }}
              className="w-6 h-6 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex items-center justify-center text-sm">✏️</button>
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
