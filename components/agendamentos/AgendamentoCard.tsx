'use client';

import { useState }           from 'react';
import { cn }                 from '@/lib/utils/cn';
import { StatusBadge }        from '@/components/ui/Badge';
import { formatShortDate, formatDateTime } from '@/lib/utils/formatters';
import { movePostToStatus, removeDoc }     from '@/lib/firebase/firestore';
import { generateApprovalLink, copyToClipboard } from '@/lib/utils/approval';
import { showToast }          from '@/components/ui/Toast';
import type { Post, Responsavel } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
};

interface AgendamentoCardProps {
  post:        Post;
  uid:         string;
  responsavel: Responsavel;
  view:        'grade' | 'lista';
  onEdit?:     (post: Post) => void;
}

export function AgendamentoCard({ post, uid, responsavel, view, onEdit }: AgendamentoCardProps) {
  const [approving, setApproving] = useState(false);
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
      <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors">
        {/* Thumb */}
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
          {thumbnail
            ? <img src={thumbnail} alt="" className="w-full h-full object-cover" /> // eslint-disable-line
            : <div className="w-full h-full flex items-center justify-center text-lg">🖼️</div>
          }
        </div>
        {/* Title */}
        <p className="flex-1 text-sm font-medium text-gray-800 truncate min-w-0">{post.title}</p>
        {/* Platform */}
        <span className="text-lg shrink-0">{PLATFORM_EMOJI[platform ?? ''] ?? '📱'}</span>
        {/* Date */}
        <p className="text-xs text-gray-500 shrink-0 hidden md:block">
          {post.scheduledAt ? formatDateTime(post.scheduledAt) : '—'}
        </p>
        {/* Status */}
        <StatusBadge status={post.status} />
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={handleApprove}  title="Aprovar"  className="p-1.5 text-green-500 hover:bg-green-50 rounded-lg transition-colors">✅</button>
          <button onClick={handleReject}   title="Rejeitar" className="p-1.5 text-red-400   hover:bg-red-50   rounded-lg transition-colors">❌</button>
          <button onClick={handleSendApproval} disabled={approving} title="Enviar" className="p-1.5 text-blue-400 hover:bg-blue-50 rounded-lg transition-colors">📧</button>
          <button onClick={() => onEdit?.(post)} title="Editar" className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">✏️</button>
          <button onClick={handleDelete}   title="Excluir" className="p-1.5 text-red-400   hover:bg-red-50   rounded-lg transition-colors">🗑</button>
        </div>
      </div>
    );
  }

  // Grade view
  return (
    <div className="bg-white rounded-xl shadow-card overflow-hidden group hover:shadow-hover transition-all">
      {/* Thumbnail */}
      <div className="relative aspect-square bg-gray-100 overflow-hidden">
        {thumbnail
          ? <img src={thumbnail} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> // eslint-disable-line
          : <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🖼️</div>
        }
        <div className="absolute top-2 right-2"><StatusBadge status={post.status} /></div>
        {/* Hover actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button onClick={handleApprove}      className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-sm hover:bg-green-600 transition-colors">✅</button>
          <button onClick={handleReject}       className="w-8 h-8 rounded-full bg-red-500   flex items-center justify-center text-sm hover:bg-red-600   transition-colors">❌</button>
          <button onClick={handleSendApproval} disabled={approving} className="w-8 h-8 rounded-full bg-blue-500  flex items-center justify-center text-sm hover:bg-blue-600  transition-colors">📧</button>
          <button onClick={handleDelete}       className="w-8 h-8 rounded-full bg-gray-700  flex items-center justify-center text-sm hover:bg-gray-900  transition-colors">🗑</button>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate mb-1">{post.title}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <span>{PLATFORM_EMOJI[platform ?? ''] ?? '📱'}</span>
            {post.scheduledAt && <span>{formatShortDate(post.scheduledAt)}</span>}
          </div>
          <button
            onClick={() => onEdit?.(post)}
            className="text-xs text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            ✏️
          </button>
        </div>
      </div>
    </div>
  );
}
