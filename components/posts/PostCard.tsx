'use client';

import { useRouter } from 'next/navigation';
import { Edit, ZoomIn, Play, Images, BookImage } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Post } from '@/lib/types';

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
  pinterest: '📌', google_business: '🏢',
};

const STATUS_DOT: Record<string, string> = {
  rascunho:           'bg-gray-400',
  conteudo:           'bg-blue-400',
  revisao:            'bg-yellow-400',
  aprovacao_cliente:  'bg-purple-400',
  em_analise:         'bg-blue-500',
  aprovado:           'bg-green-500',
  rejeitado:          'bg-red-500',
  publicado:          'bg-emerald-500',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function isVideo(creative: { type?: string; url?: string } | undefined): boolean {
  if (!creative) return false;
  if (creative.type) return creative.type.startsWith('video');
  if (creative.url)  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(creative.url);
  return false;
}

function getThumb(post: Post): { url: string | null; isVid: boolean; isCarrossel: boolean; isStory: boolean; count: number } {
  const creatives = post.creatives ?? [];
  const first     = creatives[0];
  const url       = first?.url ?? (post as any).image_url ?? (post as any).image_urls?.[0] ?? null;
  const isVid     = isVideo(first);
  const count     = creatives.length;
  const fmt       = post.format ?? '';
  return {
    url,
    isVid,
    isCarrossel: fmt === 'carrossel' || count > 1,
    isStory:     fmt === 'story',
    count,
  };
}

// ── VideoThumb ─────────────────────────────────────────────────────────────
// Gera thumbnail do vídeo no browser usando um <video> hidden + canvas

function VideoThumb({ src, className }: { src: string; className?: string }) {
  return (
    <div className={cn('relative w-full h-full bg-gray-900 flex items-center justify-center', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
      <video
        src={src}
        className="w-full h-full object-cover"
        preload="metadata"
        muted
        playsInline
        // Seek to 1s to get a non-black frame as thumbnail
        onLoadedMetadata={(e) => {
          (e.target as HTMLVideoElement).currentTime = 1;
        }}
      />
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
          <Play size={16} className="text-gray-900 ml-0.5" fill="currentColor" />
        </div>
      </div>
    </div>
  );
}

// ── Format badge ───────────────────────────────────────────────────────────

function FormatBadge({ isVid, isCarrossel, isStory, count }: {
  isVid: boolean; isCarrossel: boolean; isStory: boolean; count: number;
}) {
  if (isCarrossel && count > 1) {
    return (
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
        <Images size={10} />
        <span>{count}</span>
      </div>
    );
  }
  if (isStory) {
    return (
      <div className="absolute top-2 right-2 bg-purple-600/80 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1">
        <BookImage size={10} />
        <span>Story</span>
      </div>
    );
  }
  if (isVid) {
    return (
      <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md flex items-center gap-1">
        <Play size={10} fill="white" />
        <span>Vídeo</span>
      </div>
    );
  }
  return null;
}

// ── MediaArea ──────────────────────────────────────────────────────────────

function MediaArea({ post, isStory }: { post: Post; isStory: boolean }) {
  const { url, isVid, isCarrossel, count } = getThumb(post);
  const platform = post.platforms?.[0] ?? (post as any).platform ?? '';

  return (
    <>
      {url
        ? isVid
          ? <VideoThumb src={url} className="w-full h-full" />
          // eslint-disable-next-line @next/next/no-img-element
          : <img src={url} alt={post.title ?? ''} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        : <span className="text-4xl">{isVid ? '🎬' : isCarrossel ? '🖼️' : '🖼️'}</span>
      }

      {/* Platform badge */}
      {platform && (
        <div className="absolute top-2 left-2 bg-black/50 text-white text-[11px] px-1.5 py-0.5 rounded-md">
          {PLATFORM_EMOJI[platform] ?? '📱'} {platform}
        </div>
      )}

      {/* Format badge (vídeo / carrossel / story) */}
      <FormatBadge isVid={isVid} isCarrossel={isCarrossel} isStory={isStory} count={count} />

      {/* Story aspect hint */}
      {isStory && (
        <div className="absolute bottom-1 left-1 bg-purple-600/70 text-white text-[9px] px-1 py-0.5 rounded">9:16</div>
      )}
    </>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────

interface PostCardProps {
  post:       Post;
  onPreview:  (post: Post) => void;
  compact?:   boolean;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function PostCard({ post, onPreview, compact = false, className }: PostCardProps) {
  const router    = useRouter();
  const { isStory, isCarrossel } = getThumb(post);
  const platform  = post.platforms?.[0] ?? (post as any).platform ?? '';
  const statusDot = STATUS_DOT[post.status ?? 'rascunho'] ?? 'bg-gray-400';

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/criar-post?edit=${post.id}`);
  };

  /* ── Modo compacto: calendário ──────────────────────────────── */
  if (compact) {
    const { url, isVid } = getThumb(post);
    return (
      <div
        className={cn(
          'group relative rounded-md overflow-hidden cursor-pointer bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all',
          className,
        )}
        onClick={() => onPreview(post)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onPreview(post)}
      >
        {/* Story: proporção 9:16 estreita */}
        <div className={cn('relative w-full bg-gray-100', isStory ? 'aspect-[9/16]' : 'aspect-video')}>
          {url
            ? isVid
              ? <VideoThumb src={url} className="w-full h-full" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={url} alt={post.title ?? ''} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-xl">🖼️</div>
          }
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
              <ZoomIn size={13} className="text-gray-700" />
            </div>
            <button onClick={handleEdit} className="w-7 h-7 bg-[#FF5C00]/90 rounded-full flex items-center justify-center">
              <Edit size={12} className="text-white" />
            </button>
          </div>
          {/* Format indicators */}
          {isVid && <div className="absolute top-1 right-1 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center"><Play size={8} fill="white" className="text-white" /></div>}
          {isCarrossel && <div className="absolute top-1 right-1 bg-black/60 text-white text-[8px] px-1 rounded"><Images size={8} /></div>}
          {isStory && <div className="absolute top-1 left-1 bg-purple-600/80 text-white text-[8px] px-1 rounded">S</div>}
        </div>

        <div className="px-1.5 py-1 flex items-center gap-1">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot)} />
          <span className="text-[10px] text-gray-600 truncate flex-1">{post.title}</span>
          {platform && <span className="text-[10px]">{PLATFORM_EMOJI[platform] ?? '📱'}</span>}
        </div>
      </div>
    );
  }

  /* ── Modo normal: grade ─────────────────────────────────────── */
  return (
    <div className={cn('group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden', className)}>
      <button
        className={cn(
          'w-full bg-gray-100 flex items-center justify-center overflow-hidden relative',
          // Story: proporção 9:16 no card de grade
          isStory ? 'aspect-[9/16]' : 'aspect-video'
        )}
        onClick={() => onPreview(post)}
        title="Ver preview"
        type="button"
      >
        <MediaArea post={post} isStory={isStory} />

        {/* Zoom overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center backdrop-blur-sm">
            <ZoomIn size={18} className="text-gray-700" />
          </div>
        </div>
      </button>

      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 truncate mb-0.5">{post.title || 'Sem título'}</p>
        {post.caption && <p className="text-xs text-gray-400 line-clamp-1">{post.caption}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-[#FF5C00]">
            {post.scheduledAt
              ? typeof post.scheduledAt === 'string'
                ? new Date(post.scheduledAt).toLocaleDateString('pt-BR')
                : (post.scheduledAt as any)?.toDate?.()?.toLocaleDateString('pt-BR') ?? '—'
              : '—'}
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={handleEdit}
              className="w-7 h-7 rounded-lg bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center hover:bg-[#FF5C00]/20 transition-colors">
              <Edit size={13} />
            </button>
            <button type="button" onClick={() => onPreview(post)}
              className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
