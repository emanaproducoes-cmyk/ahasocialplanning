'use client';

import { useState }           from 'react';
import { Modal }              from '@/components/ui/Modal';
import { showToast }          from '@/components/ui/Toast';
import { cn }                 from '@/lib/utils/cn';
import { ShareApprovalButton } from '@/components/ui/ShareApprovalButton';
import { movePostToStatus }   from '@/lib/firebase/firestore';
import type { Post, PostStatus, Responsavel } from '@/lib/types';

const TABS = ['Preview', 'Comentários', 'Ações'] as const;
type Tab   = typeof TABS[number];

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rascunho:          { label: 'Rascunho',          color: 'bg-gray-100 text-gray-600' },
  conteudo:          { label: 'Conteúdo',           color: 'bg-blue-100 text-blue-600' },
  revisao:           { label: 'Revisão',            color: 'bg-yellow-100 text-yellow-700' },
  aprovacao_cliente: { label: 'Aprovação Cliente',  color: 'bg-purple-100 text-purple-600' },
  em_analise:        { label: 'Em Análise',         color: 'bg-blue-100 text-blue-700' },
  aprovado:          { label: 'Aprovado',           color: 'bg-green-100 text-green-700' },
  rejeitado:         { label: 'Rejeitado',          color: 'bg-red-100 text-red-700' },
  publicado:         { label: 'Publicado',          color: 'bg-emerald-100 text-emerald-700' },
};

function ImageViewer({ post }: { post: Post }) {
  const [slide,  setSlide]  = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const slides     = post.creatives?.map((c) => c.url) ?? [];
  const currentUrl = slides[slide];
  const isVideo    = post.creatives?.[slide]?.type?.startsWith('video');

  const handleDownload = () => {
    if (!currentUrl) return;
    const a    = document.createElement('a');
    a.href     = currentUrl;
    a.download = `${post.title}-slide-${slide + 1}`;
    a.target   = '_blank';
    a.click();
  };

  if (slides.length === 0) {
    return (
      <div className="w-full aspect-video rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        <span className="text-4xl">🖼️</span>
      </div>
    );
  }

  return (
    <>
      {zoomed && currentUrl && (
        <div
          className="fixed inset-0 bg-black/90 z-[200] flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          {isVideo ? (
            <video src={currentUrl} controls autoPlay className="max-w-full max-h-full rounded-xl" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={currentUrl} alt="" className="max-w-full max-h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()} />
          )}
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white text-xl transition-colors"
          >×</button>
        </div>
      )}

      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100 mb-4 group">
        {isVideo ? (
          <video src={currentUrl} controls className="w-full h-full object-contain" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentUrl} alt={post.title} className="w-full h-full object-contain" />
        )}

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setZoomed(true)}
            className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80"
            title="Ampliar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button onClick={handleDownload}
            className="w-8 h-8 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80"
            title="Download">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
        </div>

        {slides.length > 1 && (
          <>
            <button onClick={() => setSlide((s) => Math.max(0, s - 1))} disabled={slide === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/80"
            >‹</button>
            <button onClick={() => setSlide((s) => Math.min(slides.length - 1, s + 1))} disabled={slide === slides.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center disabled:opacity-30 hover:bg-black/80"
            >›</button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {slides.map((_, i) => (
                <button key={i} onClick={() => setSlide(i)}
                  className={cn('w-1.5 h-1.5 rounded-full transition-colors', i === slide ? 'bg-white' : 'bg-white/50')} />
              ))}
            </div>
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-lg">
              {slide + 1}/{slides.length}
            </div>
          </>
        )}
      </div>
    </>
  );
}

interface PostDetailModalProps {
  post:        Post | null;
  uid:         string;
  responsavel: Responsavel;
  isOpen:      boolean;
  onClose:     () => void;
  onEdit:      () => void;
}

export function PostDetailModal({ post, uid, responsavel, isOpen, onClose, onEdit }: PostDetailModalProps) {
  const [activeTab,  setActiveTab]  = useState<Tab>('Preview');
  const [saving,     setSaving]     = useState(false);
  const [comment,    setComment]    = useState('');
  const [actionNote, setActionNote] = useState('');
  const [editFields, setEditFields] = useState({ platform: '', scheduledDate: '', campaign: '' });

  if (!post) return null;

  const status              = STATUS_LABELS[post.status] ?? STATUS_LABELS.rascunho;
  const aprovacaoComentario = (post as any).aprovacaoComentario as string | undefined;
  const aprovacaoStatus     = (post as any).aprovacaoStatus     as string | undefined;
  const internalComments    = (post as any).internalComments    as { text: string; author: string; date: string }[] | undefined;

  const handleAction = async (action: 'aprovado' | 'rejeitado' | 'revisao') => {
    setSaving(true);
    try {
      await movePostToStatus(uid, post.id, action as PostStatus, post.status);
      showToast(
        action === 'aprovado'  ? '✅ Post aprovado!'        :
        action === 'rejeitado' ? '❌ Post rejeitado.'       :
                                 '🔁 Enviado para revisão.',
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
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-0 -mt-2 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-xl">{PLATFORM_EMOJI[post.platforms?.[0] ?? ''] ?? '📝'}</span>
          <div>
            <h2 className="font-bold text-[16px] text-gray-900">{post.title}</h2>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', status.color)}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 -mx-6 px-6 mb-4">
        {TABS.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab
                ? 'border-[#FF5C00] text-[#FF5C00]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {tab}
            {tab === 'Comentários' && aprovacaoComentario && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-amber-400 inline-block" />
            )}
          </button>
        ))}
      </div>

      {/* ── PREVIEW ── */}
      {activeTab === 'Preview' && (
        <div>
          <ImageViewer post={post} />
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Plataforma</label>
              <select
                defaultValue={post.platforms?.[0] ?? 'instagram'}
                onChange={(e) => setEditFields((f) => ({ ...f, platform: e.target.value }))}
                className="w-full text-sm font-semibold bg-transparent outline-none capitalize cursor-pointer"
              >
                {['instagram','facebook','youtube','tiktok','linkedin','threads'].map((p) => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Data</label>
              <input type="date"
                defaultValue={post.scheduledAt
                  ? new Date((post.scheduledAt as unknown as { toDate?: () => Date }).toDate?.() ?? post.scheduledAt as unknown as Date).toISOString().split('T')[0]
                  : ''}
                onChange={(e) => setEditFields((f) => ({ ...f, scheduledDate: e.target.value }))}
                className="w-full text-sm font-semibold bg-transparent outline-none cursor-pointer"
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Campanha</label>
              <input type="text" placeholder="—"
                onChange={(e) => setEditFields((f) => ({ ...f, campaign: e.target.value }))}
                className="w-full text-sm font-semibold bg-transparent outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end mb-4">
            <button onClick={() => showToast('Post atualizado!', 'success')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#FF5C00] text-white text-sm font-medium rounded-lg hover:bg-[#E54E00] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Salvar
            </button>
          </div>
          {post.caption && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1.5">Legenda</div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{post.caption}</p>
            </div>
          )}
        </div>
      )}

      {/* ── COMENTÁRIOS ── */}
      {activeTab === 'Comentários' && (
        <div className="space-y-4">

          {/* Feedback do cliente vindo da aprovação */}
          {aprovacaoComentario ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">
                  {aprovacaoStatus === 'aprovado'  ? '✅' :
                   aprovacaoStatus === 'rejeitado' ? '❌' : '✏️'}
                </span>
                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                  Feedback do Cliente
                </p>
                <span className={cn(
                  'ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium',
                  aprovacaoStatus === 'aprovado'  ? 'bg-green-100 text-green-700'  :
                  aprovacaoStatus === 'rejeitado' ? 'bg-red-100   text-red-700'    :
                                                    'bg-amber-100 text-amber-700'
                )}>
                  {aprovacaoStatus === 'aprovado'  ? 'Aprovado'           :
                   aprovacaoStatus === 'rejeitado' ? 'Rejeitado'          :
                                                     'Correção solicitada'}
                </span>
              </div>
              <p className="text-sm text-amber-800 leading-relaxed">{aprovacaoComentario}</p>
            </div>
          ) : null}

          {/* Comentários internos */}
          {internalComments && internalComments.length > 0 ? (
            <div className="space-y-2">
              {internalComments.map((c, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{c.author}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(c.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{c.text}</p>
                </div>
              ))}
            </div>
          ) : !aprovacaoComentario ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum comentário ainda.</p>
          ) : null}

          {/* Novo comentário interno */}
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Adicione um comentário interno..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
          />
          <button onClick={handleSaveComment} disabled={!comment.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF5C00] text-white text-sm font-medium rounded-lg hover:bg-[#E54E00] disabled:opacity-50 transition-colors"
          >
            💬 Salvar Comentário
          </button>
        </div>
      )}

      {/* ── AÇÕES ── */}
      {activeTab === 'Ações' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Enviar para aprovação
            </p>
            <ShareApprovalButton
              post={post}
              uid={uid}
              responsavel={responsavel}
              variant="button"
              className="w-full justify-center py-3 text-base"
            />
            {post.approvalToken && (
              <p className="text-[11px] text-gray-400 text-center">
                Link já gerado — clique para compartilhar novamente
              </p>
            )}
          </div>

          <textarea
            value={actionNote}
            onChange={(e) => setActionNote(e.target.value)}
            placeholder="Adicione um comentário sobre a ação (opcional)..."
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
          />

          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => handleAction('rejeitado')} disabled={saving}
              className="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-600 font-semibold rounded-xl hover:bg-red-100 text-sm transition-colors disabled:opacity-60 border border-red-200"
            >
              ✕ Rejeitar
            </button>
            <button onClick={() => handleAction('revisao')} disabled={saving}
              className="flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-700 font-semibold rounded-xl hover:bg-amber-100 text-sm transition-colors disabled:opacity-60 border border-amber-200"
            >
              ✎ Corrigir
            </button>
            <button onClick={() => handleAction('aprovado')} disabled={saving}
              className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-600 text-sm transition-colors disabled:opacity-60"
            >
              ✓ Aprovar
            </button>
          </div>
        </div>
      )}

    </Modal>
  );
}
