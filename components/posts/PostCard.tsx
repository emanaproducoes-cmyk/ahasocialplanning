'use client';

/**
 * PostCard — VERSÃO CORRIGIDA
 * ─────────────────────────────────────────────────────────────────
 * Caminho de instalação no projeto:
 *   src/components/posts/PostCard.tsx
 *
 * Correções aplicadas nesta versão:
 *  ✅ Modo compacto (calendário): clicar em qualquer parte do card,
 *     incluindo a imagem, chama onPreview corretamente
 *  ✅ Modo normal (grade): área da imagem é totalmente clicável,
 *     ícone de zoom visível no hover, sem conflito com botões
 *  ✅ Botão lápis em ambos os modos navega para /criar-post?edit={id}
 *     sem propagar o click para o onPreview
 *  ✅ Compatível com modelos Firebase (creatives[]) e legado
 *     (image_url / image_urls)
 *
 * Props:
 *   post         – documento do Firestore (Post)
 *   onPreview    – abre o PostPreviewModal com este post
 *   compact      – modo compacto (para células de calendário)
 *   className    – classe extra opcional
 */

import { useRouter } from 'next/navigation';
import { Edit, ZoomIn } from 'lucide-react';
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

interface PostCardProps {
  post:       Post;
  onPreview:  (post: Post) => void;
  compact?:   boolean;
  className?: string;
}

export default function PostCard({
  post,
  onPreview,
  compact = false,
  className,
}: PostCardProps) {
  const router = useRouter();

  // Obtém a URL da thumbnail (suporta modelo legado e Firebase)
  const thumb: string | null = (() => {
    if (post.creatives?.length)        return post.creatives[0].url;
    if ((post as any).image_url)       return (post as any).image_url;
    if ((post as any).image_urls?.[0]) return (post as any).image_urls[0];
    return null;
  })();

  const platform  = post.platforms?.[0] ?? (post as any).platform ?? '';
  const statusDot = STATUS_DOT[post.status ?? 'rascunho'] ?? 'bg-gray-400';

  // Navega para edição SEM abrir o preview
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/criar-post?edit=${post.id}`);
  };

  /* ── Modo compacto: células do calendário ─────────────────────── */
  if (compact) {
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
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-gray-100">
          {thumb
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumb} alt={post.title ?? ''} className="w-full h-full object-cover" />
            : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                🖼️
              </div>
            )}

          {/* Overlay ao hover — ícones de ação */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            {/* Zoom (abre preview) */}
            <div
              className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center"
              title="Ver preview"
            >
              <ZoomIn size={13} className="text-gray-700" />
            </div>

            {/* Editar (vai para /criar-post) */}
            <button
              onClick={handleEdit}
              className="w-7 h-7 bg-[#FF5C00]/90 rounded-full flex items-center justify-center"
              title="Editar post"
            >
              <Edit size={12} className="text-white" />
            </button>
          </div>
        </div>

        {/* Rodapé mínimo */}
        <div className="px-1.5 py-1 flex items-center gap-1">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusDot)} />
          <span className="text-[10px] text-gray-600 truncate flex-1">{post.title}</span>
          {platform && (
            <span className="text-[10px]">{PLATFORM_EMOJI[platform] ?? '📱'}</span>
          )}
        </div>
      </div>
    );
  }

  /* ── Modo normal: grade ───────────────────────────────────────── */
  return (
    <div
      className={cn(
        'group relative bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all overflow-hidden',
        className,
      )}
    >
      {/* Thumbnail clicável → abre preview */}
      <button
        className="w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative"
        onClick={() => onPreview(post)}
        title="Ver preview ampliado"
        type="button"
      >
        {thumb
          // eslint-disable-next-line @next/next/no-img-element
          ? (
            <img
              src={thumb}
              alt={post.title ?? ''}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          )
          : <span className="text-4xl">🖼️</span>}

        {/* Ícone de zoom ao hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center backdrop-blur-sm">
            <ZoomIn size={18} className="text-gray-700" />
          </div>
        </div>

        {/* Badge de plataforma */}
        {platform && (
          <div className="absolute top-2 left-2 bg-black/50 text-white text-[11px] px-1.5 py-0.5 rounded-md">
            {PLATFORM_EMOJI[platform] ?? '📱'} {platform}
          </div>
        )}

        {/* Indicador de status */}
        <div className="absolute top-2 right-2">
          <span
            className={cn('w-2.5 h-2.5 rounded-full block ring-2 ring-white', statusDot)}
          />
        </div>
      </button>

      {/* Info do card */}
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 truncate mb-0.5">
          {post.title || 'Sem título'}
        </p>
        {post.caption && (
          <p className="text-xs text-gray-400 line-clamp-1">{post.caption}</p>
        )}

        {/* Rodapé: data + botões de ação */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-[#FF5C00]">
            {post.scheduledAt
              ? typeof post.scheduledAt === 'string'
                ? new Date(post.scheduledAt).toLocaleDateString('pt-BR')
                : (post.scheduledAt as any)?.toDate?.()?.toLocaleDateString('pt-BR') ?? '—'
              : '—'}
          </span>

          <div className="flex items-center gap-1">
            {/* Editar → /criar-post?edit={id} */}
            <button
              type="button"
              onClick={handleEdit}
              className="w-7 h-7 rounded-lg bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center hover:bg-[#FF5C00]/20 transition-colors"
              title="Editar post"
            >
              <Edit size={13} />
            </button>

            {/* Preview → abre modal */}
            <button
              type="button"
              onClick={() => onPreview(post)}
              className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
              title="Ver preview"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
