'use client';

import { useState }           from 'react';
import { cn }                 from '@/lib/utils/cn';
import { StatusBadge }        from '@/components/ui/Badge';
import { formatShortDate }    from '@/lib/utils/formatters';
import { generateApprovalLink, copyToClipboard } from '@/lib/utils/approval';
import { showToast }          from '@/components/ui/Toast';
import type { Post, Responsavel } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
  pinterest: '📌', google_business: '🏢',
};

interface PostCardProps {
  post:         Post;
  uid:          string;
  responsavel:  Responsavel;
  columnColor:  string;
  onOpenDetail: (post: Post) => void;
  onDelete:     (postId: string) => void;
}

export function PostCard({ post, uid, responsavel, columnColor, onOpenDetail, onDelete }: PostCardProps) {
  const [sendingApproval, setSendingApproval] = useState(false);

  const thumbnail = post.creatives?.[0]?.url;
  const platform  = post.platforms?.[0];

  const handleSendApproval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSendingApproval(true);
    try {
      const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
      await copyToClipboard(url);
      showToast('Link de aprovação copiado! 🔗', 'success');
    } catch {
      showToast('Erro ao gerar link de aprovação.', 'error');
    } finally {
      setSendingApproval(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-xl shadow-sm overflow-hidden cursor-grab active:cursor-grabbing group',
        'hover:shadow-md transition-all duration-150 border-t-2'
      )}
      style={{ borderTopColor: columnColor }}
      onClick={() => onOpenDetail(post)}
      data-id={post.id}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl opacity-30">🖼️</span>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <StatusBadge status={post.status} />
        </div>
        <div
          className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onOpenDetail(post)}
            className="w-7 h-7 bg-black/60 text-white rounded-lg flex items-center justify-center hover:bg-black/80 transition-colors"
            title="Ver detalhes"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button
            onClick={handleSendApproval}
            disabled={sendingApproval}
            className="w-7 h-7 bg-[#FF5C00]/80 text-white rounded-lg flex items-center justify-center hover:bg-[#FF5C00] transition-colors disabled:opacity-60"
            title="Copiar link de aprovação"
          >
            {sendingApproval ? (
              <span className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
            className="w-7 h-7 bg-red-500/80 text-white rounded-lg flex items-center justify-center hover:bg-red-500 transition-colors"
            title="Excluir"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-2.5">
        <h4 className="text-xs font-semibold text-gray-900 truncate mb-1.5">{post.title}</h4>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          {platform && <span>{PLATFORM_EMOJI[platform] ?? '📱'} {platform}</span>}
          {post.scheduledAt && <span>· 📅 {formatShortDate(post.scheduledAt)}</span>}
        </div>
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onOpenDetail(post)}
            className="w-6 h-6 rounded bg-amber-50 text-amber-500 flex items-center justify-center hover:bg-amber-100 transition-colors"
            title="Editar"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={handleSendApproval}
            disabled={sendingApproval}
            className="w-6 h-6 rounded bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center hover:bg-[#FF5C00]/20 transition-colors disabled:opacity-60"
            title="Link de aprovação"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(post.id)}
            className="w-6 h-6 rounded bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition-colors"
            title="Excluir"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
