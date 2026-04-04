'use client';

import { useState }           from 'react';
import { cn }                 from '@/lib/utils/cn';
import { StatusBadge }        from '@/components/ui/Badge';
import { formatShortDate }    from '@/lib/utils/formatters';
import { generateApprovalLink } from '@/lib/utils/approval';
import { showToast }          from '@/components/ui/Toast';
import { copyToClipboard, buildWhatsAppLink } from '@/lib/utils/approval';
import type { Post, Responsavel } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
  pinterest: '📌', google_business: '🏢',
};

interface PostCardProps {
  post:     Post;
  uid:      string;
  responsavel: Responsavel;
  columnColor: string;
  onOpenDetail: (post: Post) => void;
  onDelete:     (postId: string) => void;
}

export function PostCard({
  post,
  uid,
  responsavel,
  columnColor,
  onOpenDetail,
  onDelete,
}: PostCardProps) {
  const [sendingApproval, setSendingApproval] = useState(false);

  const thumbnail = post.creatives?.[0]?.url;
  const platform  = post.platforms?.[0];

  const handleSendApproval = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setSendingApproval(true);
    try {
      const { url } = await generateApprovalLink({
        uid,
        postId: post.id,
        post,
        responsavel,
      });
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
        'bg-white rounded-xl shadow-card overflow-hidden cursor-pointer group',
        'hover:shadow-hover transition-all duration-150',
        'border-l-4'
      )}
      style={{ borderLeftColor: columnColor }}
      onClick={() => onOpenDetail(post)}
      data-id={post.id}
    >
      {/* Thumbnail */}
      <div className="relative h-32 bg-gray-100 overflow-hidden">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl opacity-30">🖼️</span>
          </div>
        )}
        {/* Status badge overlay */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={post.status} />
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start gap-2 mb-2">
          {/* Responsavel avatar */}
          <div className="w-6 h-6 rounded-full bg-[#FF5C00] flex items-center justify-center shrink-0 text-white text-[10px] font-bold">
            {(responsavel.nome?.[0] ?? '?').toUpperCase()}
          </div>
          <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">{post.title}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          {post.scheduledAt && (
            <span>📅 {formatShortDate(post.scheduledAt)}</span>
          )}
          {platform && (
            <span>{PLATFORM_EMOJI[platform] ?? '📱'} {platform}</span>
          )}
        </div>

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex gap-1 mb-3 flex-wrap">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  tag === 'Fast'    && 'bg-green-100 text-green-700',
                  tag === 'Urgente' && 'bg-red-100 text-red-700',
                  tag === 'Flow'    && 'bg-purple-100 text-purple-700',
                  tag === 'Evergreen' && 'bg-blue-100 text-blue-700',
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 pt-1 border-t border-gray-50">
          <button
            onClick={(e) => { e.stopPropagation(); onOpenDetail(post); }}
            className="flex-1 text-xs py-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={handleSendApproval}
            disabled={sendingApproval}
            className="flex-1 text-xs py-1.5 rounded-lg text-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-60"
            title="Enviar para aprovação"
          >
            {sendingApproval ? (
              <span className="w-3 h-3 border border-blue-300 border-t-blue-500 rounded-full animate-spin inline-block" />
            ) : '📧'}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(post.id); }}
            className="flex-1 text-xs py-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
            title="Excluir"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
