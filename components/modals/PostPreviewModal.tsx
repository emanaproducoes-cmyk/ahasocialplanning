'use client';

import { useState }              from 'react';
import { useRouter }             from 'next/navigation';
import {
  X, ZoomIn, ChevronLeft, ChevronRight,
  Download, Check, XCircle, Edit2, Edit, MessageSquare,
  Trash2, Save,
} from 'lucide-react';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db }                        from '@/lib/firebase/config';
import { cn }                        from '@/lib/utils/cn';
import { useAuth }                   from '@/lib/hooks/useAuth';
import { showToast }                 from '@/components/ui/Toast';
import { ShareApprovalModal }        from '@/components/modals/ShareApprovalModal';
import { generateApprovalLink }      from '@/lib/utils/approval';
import type { Post }                 from '@/lib/types';

/* ─── constantes ─────────────────────────────────────────────── */

const PLATFORMS = [
  'instagram', 'facebook', 'youtube', 'tiktok',
  'linkedin', 'threads', 'pinterest', 'google_business',
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rascunho:           { label: 'Rascunho',         color: 'bg-gray-100    text-gray-600'    },
  conteudo:           { label: 'Conteúdo',          color: 'bg-blue-100   text-blue-600'    },
  revisao:            { label: 'Revisão',           color: 'bg-yellow-100 text-yellow-700'  },
  aprovacao_cliente:  { label: 'Aprovação Cliente', color: 'bg-purple-100 text-purple-600'  },
  em_analise:         { label: 'Em Análise',        color: 'bg-blue-100   text-blue-700'    },
  aprovado:           { label: 'Aprovado',          color: 'bg-green-100  text-green-700'   },
  rejeitado:          { label: 'Rejeitado',         color: 'bg-red-100    text-red-700'     },
  publicado:          { label: 'Publicado',         color: 'bg-emerald-100 text-emerald-700'},
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
  pinterest: '📌', google_business: '🏢',
};

/* ─── ImageViewer ─────────────────────────────────────────────── */

interface ImageViewerProps {
  post: Post;
}

function ImageViewer({ post }: ImageViewerProps) {
  const [slide, setSlide]   = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const slides: string[] = (() => {
    if (post.creatives?.length)           return post.creatives.map((c) => c.url);
    if ((post as any).image_urls?.length) return (post as any).image_urls;
    if ((post as any).image_url)          return [(post as any).image_url];
    return [];
  })();

  const currentUrl = slides[slide] ?? null;

  const handleDownload = () => {
    if (!currentUrl) return;
    const a    = document.createElement('a');
    a.href     = currentUrl;
    a.download = `${post.title ?? 'criativo'}-${slide + 1}.jpg`;
    a.target   = '_blank';
    a.click();
  };

  if (slides.length === 0) {
    return (
      <div className="w-full aspect-video rounded-lg bg-gray-100 flex items-center justify-center mb-4">
        <span className="text-4xl">🖼️</span>
      </div>
    );
  }

  return (
    <>
      {zoomed && currentUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center"
          onClick={() => setZoomed(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt=""
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={20} />
          </button>
          {slides.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setSlide((s) => Math.max(0, s - 1)); }}
                disabled={slide === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 hover:bg-white/30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setSlide((s) => Math.min(slides.length - 1, s + 1)); }}
                disabled={slide === slides.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white disabled:opacity-20 hover:bg-white/30 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                {slide + 1} / {slides.length}
              </div>
            </>
          )}
        </div>
      )}

      <div
        className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100 mb-4 group cursor-zoom-in"
        onClick={() => setZoomed(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={currentUrl!} alt={post.title} className="w-full h-full object-contain" />

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setZoomed(true); }}
            className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors"
            title="Ampliar"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors"
            title="Baixar"
          >
            <Download size={14} />
          </button>
        </div>

        {slides.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setSlide((s) => Math.max(0, s - 1)); }}
              disabled={slide === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/80 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setSlide((s) => Math.min(slides.length - 1, s + 1)); }}
              disabled={slide === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/80 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setSlide(i); }}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full transition-colors',
                    i === slide ? 'bg-white' : 'bg-white/50',
                  )}
                />
              ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg">
              {slide + 1}/{slides.length}
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ─── PostPreviewModal ────────────────────────────────────────── */

interface PostPreviewModalProps {
  post:      Post;
  onClose:   () => void;
  onUpdate?: () => void;
}

export default function PostPreviewModal({ post, onClose, onUpdate }: PostPreviewModalProps) {
  const { user }                        = useAuth();
  const router                          = useRouter();
  const [activeTab, setActiveTab]       = useState<'preview' | 'comentarios' | 'acoes'>('preview');
  const [comment,   setComment]         = useState('');
  const [loading,   setLoading]         = useState(false);
  const [editSaving, setEditSaving]     = useState(false);
  const [shareUrl,   setShareUrl]       = useState<string | null>(null);
  const [shareOpen,  setShareOpen]      = useState(false);
  const [generating, setGenerating]     = useState(false);

  const [editFields, setEditFields] = useState({
    scheduledAt: post.scheduledAt ?? '',
    platforms:   post.platforms   ?? ((post as any).platform ? [(post as any).platform] : []),
    campaignId:  post.campaignId  ?? ((post as any).campaign ?? ''),
  });

  if (!user) return null;

  const postRef = doc(db, `users/${user.uid}/posts`, post.id ?? '');

  const handleGenerateApprovalLink = async () => {
    if (!user?.uid) return;
    setGenerating(true);
    try {
      const responsavel = {
        nome:   user.displayName ?? user.email ?? 'Equipe',
        avatar: user.photoURL    ?? '',
        uid:    user.uid,
      };
      const { url } = await generateApprovalLink({
        uid:  user.uid,
        postId: post.id ?? '',
        post,
        responsavel,
      });
      setShareUrl(url);
      setShareOpen(true);
      showToast('Link de aprovação gerado! ✅', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar link de aprovação.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      await updateDoc(postRef, {
        scheduledAt: editFields.scheduledAt || null,
        platforms:   editFields.platforms,
        campaignId:  editFields.campaignId  || null,
        updatedAt:   new Date(),
      });
      showToast('Post atualizado!', 'success');
      onUpdate?.();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar.', 'error');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja deletar este post?')) return;
    setLoading(true);
    try {
      await deleteDoc(postRef);
      showToast('Post deletado!', 'success');
      onUpdate?.();
      onClose();
    } catch {
      showToast('Erro ao deletar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'aprovar' | 'corrigir' | 'rejeitar') => {
    setLoading(true);
    const statusMap = {
      aprovar:  'aprovado',
      corrigir: 'revisao',
      rejeitar: 'rejeitado',
    } as const;
    try {
      const updates: Record<string, unknown> = {
        status:    statusMap[action],
        updatedAt: new Date(),
      };
      if (comment) {
        updates.approvalComment  = comment;
        updates.approvalFeedback = action;
      }
      await updateDoc(postRef, updates);
      showToast(
        action === 'aprovar'  ? 'Post aprovado! ✅' :
        action === 'rejeitar' ? 'Post rejeitado.'   :
        'Enviado para revisão.',
        action === 'aprovar' ? 'success' : 'warning',
      );
      onUpdate?.();
      onClose();
    } catch {
      showToast('Erro ao salvar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveComment = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    try {
      const existing = (post as any).internalComments ?? [];
      await updateDoc(postRef, {
        internalComments: [
          ...existing,
          {
            text:   comment,
            author: user.displayName ?? 'Você',
            date:   new Date().toISOString(),
          },
        ],
        updatedAt: new Date(),
      });
      showToast('Comentário salvo!', 'success');
      setComment('');
      onUpdate?.();
    } catch {
      showToast('Erro ao salvar comentário.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    onClose();
    router.push(`/criar-post?edit=${post.id}`);
  };

  const status    = STATUS_LABELS[post.status ?? 'rascunho'] ?? STATUS_LABELS.rascunho;
  const platforms = post.platforms ?? ((post as any).platform ? [(post as any).platform] : []);

  const tabs: { key: 'preview' | 'comentarios' | 'acoes'; label: string }[] = [
    { key: 'preview',     label: 'Preview'     },
    { key: 'comentarios', label: 'Comentários' },
    { key: 'acoes',       label: 'Ações'       },
  ];

  return (
    <>
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      style={{ animation: 'fadeIn 0.15s ease' }}
      onClick={onClose}
    >
      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>

      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {platforms.length ? (PLATFORM_ICONS[platforms[0]] ?? '📝') : '📝'}
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{post.title || 'Sem título'}</h2>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.color)}>
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#FF5C00] hover:bg-orange-50 rounded-lg transition-colors font-medium"
              title="Abrir modo de edição"
            >
              <Edit2 size={14} /> Editar Post
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium disabled:opacity-50"
            >
              <Trash2 size={14} /> Deletar
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-[#FF5C00] text-[#FF5C00]'
                  : 'border-transparent text-gray-400 hover:text-gray-700',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div className="p-5">

          {/* Preview */}
          {activeTab === 'preview' && (
            <>
              <ImageViewer post={post} />

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Plataforma</div>
                  <select
                    value={editFields.platforms[0] ?? 'instagram'}
                    onChange={(e) => setEditFields((f) => ({ ...f, platforms: [e.target.value] }))}
                    className="w-full text-sm font-semibold bg-transparent outline-none capitalize cursor-pointer"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Data</div>
                  <input
                    type="date"
                    value={
                      editFields.scheduledAt
                        ? typeof editFields.scheduledAt === 'string'
                          ? editFields.scheduledAt.slice(0, 10)
                          : (editFields.scheduledAt as any)?.toDate?.()?.toISOString().slice(0, 10) ?? ''
                        : ''
                    }
                    onChange={(e) => setEditFields((f) => ({ ...f, scheduledAt: e.target.value }))}
                    className="w-full text-sm font-semibold bg-transparent outline-none cursor-pointer"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Campanha</div>
                  <input
                    type="text"
                    value={editFields.campaignId ?? ''}
                    onChange={(e) => setEditFields((f) => ({ ...f, campaignId: e.target.value }))}
                    placeholder="—"
                    className="w-full text-sm font-semibold bg-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end mb-4">
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF5C00] text-white text-sm font-medium rounded-lg hover:bg-[#E54E00] transition-colors disabled:opacity-50"
                >
                  <Save size={13} /> {editSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>

              {post.caption && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Legenda</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.caption}</p>
                </div>
              )}
            </>
          )}

          {/* Comentários */}
          {activeTab === 'comentarios' && (
            <div className="space-y-4">
              {(post as any).approvalComment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare size={14} className="text-yellow-600" />
                    <span className="text-xs font-medium text-yellow-700">Feedback do Cliente</span>
                  </div>
                  <p className="text-sm text-yellow-800">{(post as any).approvalComment}</p>
                </div>
              )}

              <div className="space-y-3">
                {((post as any).internalComments ?? []).map((c: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold">{c.author}</span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(c.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                ))}
                {!((post as any).internalComments?.length) && !(post as any).approvalComment && (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum comentário ainda.</p>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none resize-none"
                  placeholder="Adicione um comentário interno..."
                />
                <button
                  onClick={handleSaveComment}
                  disabled={loading || !comment.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5C00] text-white text-sm font-medium rounded-lg hover:bg-[#E54E00] transition-colors disabled:opacity-50"
                >
                  <MessageSquare size={14} /> Salvar Comentário
                </button>
              </div>
            </div>
          )}

          {/* Ações */}
          {activeTab === 'acoes' && (
            <div className="space-y-4">

              {/* ── Envio para aprovação do cliente ── */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#FF5C00] flex items-center justify-center shrink-0">
                    <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Enviar para aprovação do cliente</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Gere um link público responsivo — o cliente aprova, corrige ou rejeita sem precisar de login.
                    </p>
                  </div>
                </div>
                {post.approvalToken && (
                  <div className="mb-3 flex items-center gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2">
                    <svg width="13" height="13" fill="none" stroke="#FF5C00" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                    </svg>
                    <span className="text-xs text-gray-500 truncate flex-1">Link já gerado anteriormente</span>
                  </div>
                )}
                <button
                  onClick={handleGenerateApprovalLink}
                  disabled={generating || loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-60"
                >
                  {generating ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Gerando link...</>
                  ) : (
                    <><svg width="15" height="15" fill="none" stroke="white" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185z" /></svg>
                    {post.approvalToken ? 'Gerar novo link' : 'Gerar link de aprovação'} →</>
                  )}
                </button>
              </div>

              {/* ── Divisor ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">ou ação interna</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* ── Ações internas ── */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#FF5C00]/20 focus:border-[#FF5C00] outline-none resize-none"
                placeholder="Comentário interno (opcional)..."
              />
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleAction('rejeitar')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 transition-colors text-sm disabled:opacity-50"
                >
                  <XCircle size={16} /> Rejeitar
                </button>
                <button
                  onClick={() => handleAction('corrigir')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 bg-yellow-50 text-yellow-700 font-semibold rounded-xl hover:bg-yellow-100 transition-colors text-sm disabled:opacity-50"
                >
                  <Edit size={16} /> Corrigir
                </button>
                <button
                  onClick={() => handleAction('aprovar')}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                >
                  <Check size={16} /> Aprovar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* ShareApprovalModal — z-index acima do modal principal */}
    {shareOpen && shareUrl && (
      <ShareApprovalModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        approvalUrl={shareUrl}
        postTitle={post.title ?? 'Conteúdo'}
      />
    )}
    </>
  );
}
