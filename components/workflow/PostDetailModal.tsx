'use client';

import { useState }           from 'react';
import { Modal }              from '@/components/ui/Modal';
import { StatusBadge }        from '@/components/ui/Badge';
import { showToast }          from '@/components/ui/Toast';
import { cn }                 from '@/lib/utils/cn';
import { formatDateTime, formatRelative } from '@/lib/utils/formatters';
import { generateApprovalLink, copyToClipboard, buildWhatsAppLink, buildMailtoLink } from '@/lib/utils/approval';
import { movePostToStatus }   from '@/lib/firebase/firestore';
import type { Post, PostStatus, Responsavel } from '@/lib/types';

const TABS = ['Ações pendentes', 'Histórico', 'Conteúdo do post'] as const;
type Tab   = typeof TABS[number];

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

interface PostDetailModalProps {
  post:          Post | null;
  uid:           string;
  responsavel:   Responsavel;
  isOpen:        boolean;
  onClose:       () => void;
  onEdit:        () => void;
}

export function PostDetailModal({
  post,
  uid,
  responsavel,
  isOpen,
  onClose,
  onEdit,
}: PostDetailModalProps) {
  const [activeTab,    setActiveTab]    = useState<Tab>('Ações pendentes');
  const [approvalUrl,  setApprovalUrl]  = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [scheduling,   setScheduling]   = useState(false);

  if (!post) return null;

  const thumbnail = post.creatives?.[0]?.url;

  const handleSendApproval = async () => {
    setGeneratingLink(true);
    try {
      const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
      setApprovalUrl(url);
    } catch {
      showToast('Erro ao gerar link de aprovação.', 'error');
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleSchedule = async () => {
    setScheduling(true);
    await movePostToStatus(uid, post.id, 'aprovado', post.status);
    showToast('Post agendado!', 'success');
    setScheduling(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setApprovalUrl(null); onClose(); }}
      title="Detalhes do post"
      size="lg"
    >
      <div className="flex gap-5">
        {/* Preview thumbnail */}
        <div className="w-40 shrink-0">
          <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt={post.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">🖼️</div>
            )}
          </div>
          <div className="mt-2 text-center">
            <StatusBadge status={post.status} />
          </div>
          {post.scheduledAt && (
            <p className="text-xs text-gray-500 text-center mt-1">
              {formatDateTime(post.scheduledAt)}
            </p>
          )}
        </div>

        {/* Tabs panel */}
        <div className="flex-1 min-w-0">
          {/* Tab bar */}
          <div className="flex gap-1 border-b border-gray-100 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-white text-[#FF5C00] border-b-2 border-[#FF5C00]'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'Ações pendentes' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">{post.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{post.caption}</p>

              {/* Approval link area */}
              {approvalUrl ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-medium text-blue-800">Link de aprovação gerado:</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={approvalUrl}
                      className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-2 py-1.5 text-blue-700 truncate"
                    />
                    <button
                      onClick={() => { copyToClipboard(approvalUrl); showToast('Link copiado!', 'success'); }}
                      className="text-xs px-2 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={buildWhatsAppLink(approvalUrl, post.title)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 text-center text-xs py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      📱 WhatsApp
                    </a>
                    <a
                      href={buildMailtoLink(approvalUrl, post.title)}
                      className="flex-1 text-center text-xs py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      📧 E-mail
                    </a>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onEdit}
                    className="py-2.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={handleSendApproval}
                    disabled={generatingLink}
                    className="py-2.5 text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:opacity-60"
                  >
                    {generatingLink ? 'Gerando link...' : '📧 Enviar para aprovação'}
                  </button>
                  <button
                    onClick={handleSchedule}
                    disabled={scheduling}
                    className="py-2.5 text-xs font-medium bg-[#FF5C00] hover:bg-[#E54E00] text-white rounded-xl transition-colors disabled:opacity-60"
                  >
                    {scheduling ? 'Agendando...' : '📅 Agendar'}
                  </button>
                  <button className="py-2.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors">
                    ⋯ Outras ações
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'Histórico' && (
            <div className="space-y-3">
              {[
                { icon: '✏️', label: 'Post criado', time: post.createdAt },
                { icon: '🔄', label: `Status alterado para "${post.status}"`, time: post.updatedAt },
              ].map((event, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm shrink-0">
                    {event.icon}
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">{event.label}</p>
                    <p className="text-xs text-gray-400">{event.time ? formatRelative(event.time) : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Conteúdo do post' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Legenda</p>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {post.caption || <span className="text-gray-400 italic">Sem legenda</span>}
                </p>
              </div>

              {post.hashtags?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Hashtags</p>
                  <div className="flex flex-wrap gap-1">
                    {post.hashtags.map((h) => (
                      <span key={h} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                        #{h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {post.platforms?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Plataformas</p>
                  <div className="flex gap-2">
                    {post.platforms.map((p) => (
                      <span key={p} className="text-xl">{PLATFORM_EMOJI[p] ?? '📱'}</span>
                    ))}
                  </div>
                </div>
              )}

              {post.creatives?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Mídias</p>
                  <div className="flex gap-2 flex-wrap">
                    {post.creatives.map((c, i) => (
                      <div key={i} className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        {c.type.startsWith('image') ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.url} alt={c.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
