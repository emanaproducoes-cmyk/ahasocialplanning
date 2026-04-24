'use client';

/**
 * PostCard.tsx — Card do Kanban com drag & drop nativo
 * Melhorias:
 *  - Props `isDragging`, `onDragStart`, `onDragEnd` para drag nativo
 *  - Miniatura visível com aspect-ratio 16/9
 *  - Indicador visual de "sendo arrastado" (opacity reduzida)
 *  - Sem SortableJS
 */

import { useState }           from 'react';
import { cn }                 from '@/lib/utils/cn';
import { StatusBadge }        from '@/components/ui/Badge';
import { formatShortDate }    from '@/lib/utils/formatters';
import { generateApprovalLink, copyToClipboard } from '@/lib/utils/approval';
import { showToast }          from '@/components/ui/Toast';
import type { Post, Responsavel } from '@/lib/types';

// ── Video detection ──────────────────────────────────────────────────────────
function isVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(url) || url.includes('video');
}

function isVideoCreative(creative: { type?: string; url?: string } | undefined): boolean {
  if (!creative) return false;
  if (creative.type) return creative.type.startsWith('video');
  return isVideoUrl(creative.url);
}

function VideoThumb({ src, className }: { src: string; className?: string }) {
  return (
    <div className={`relative bg-gray-900 overflow-hidden ${className ?? ''}`}>
      <video
        src={src}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        playsInline
        onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow-md">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 ml-0.5">
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

interface PostCardProps {
  post:         Post;
  uid:          string;
  responsavel:  Responsavel;
  columnColor:  string;
  isDragging:   boolean;
  onDragStart:  (e: React.DragEvent, post: Post) => void;
  onDragEnd:    (e: React.DragEvent) => void;
  onOpenDetail: (post: Post) => void;
  onDelete:     (postId: string) => void;
}

export function PostCard({
  post, uid, responsavel, columnColor,
  isDragging, onDragStart, onDragEnd,
  onOpenDetail, onDelete,
}: PostCardProps) {
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
      draggable
      onDragStart={(e) => onDragStart(e, post)}
      onDragEnd={onDragEnd}
      onClick={() => onOpenDetail(post)}
      data-id={post.id}
      className={cn(
        'bg-white rounded-xl shadow-sm overflow-hidden cursor-grab active:cursor-grabbing group',
        'hover:shadow-md transition-all duration-150 border-t-2 select-none',
        isDragging && 'opacity-40 scale-95 shadow-lg ring-2 ring-[#FF5C00]/40',
      )}
      style={{ borderTopColor: columnColor }}
    >
      {/* Miniatura 16:9 */}
      <div className="relative w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '16/9' }}>
        {thumbnail ? (
          isVideoCreative(post.creatives?.[0])
            ? <VideoThumb src={thumbnail} className="w-full h-full group-hover:scale-105 transition-transform duration-300" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img
                src={thumbnail}
                alt={post.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                draggable={false}
              />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 gap-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="text-[10px]">Sem criativo</span>
          </div>
        )}

        {/* Badge de status */}
        <div className="absolute top-2 left-2">
          <StatusBadge status={post.status} />
        </div>

        {/* Ações — visíveis no hover */}
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
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
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
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-2.5">
        <h4 className="text-xs font-semibold text-gray-900 truncate mb-1.5">{post.title}</h4>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          {platform && <span>{PLATFORM_EMOJI[platform] ?? '📱'} {platform}</span>}
          {post.scheduledAt && <span>· 📅 {formatShortDate(post.scheduledAt)}</span>}
        </div>

        {/* Barra de ações inferiores */}
        <div
          className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-50"
          onClick={(e) => e.stopPropagation()}
        >
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
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>

          {/* Ícone de grip — indicador de draggable */}
          <div className="ml-auto text-gray-200 cursor-grab" title="Arraste para mover">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/>
              <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
              <circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
