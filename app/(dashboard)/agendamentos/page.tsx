'use client';

import { useState }                         from 'react';
import { useRouter }                         from 'next/navigation';
import { orderBy }                           from 'firebase/firestore';
import { useAuth }                           from '@/lib/hooks/useAuth';
import { useUserCollection }                 from '@/lib/hooks/useCollection';
import {
  LayoutGrid, List, Calendar,
  Plus, RefreshCw,
  ChevronLeft, ChevronRight, Edit, ZoomIn,
} from 'lucide-react';
import { cn }               from '@/lib/utils/cn';
import PostCard             from '@/components/posts/PostCard';
import PostPreviewModal     from '@/components/modals/PostPreviewModal';
import type { Post }        from '@/lib/types';

/* ─── helpers ─────────────────────────────────────────────────── */

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: '📸', facebook: '👍', youtube: '▶️',
  tiktok: '🎵', linkedin: '💼', threads: '🧵',
  pinterest: '📌', google_business: '🏢',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  rascunho:          { label: 'Rascunho',         color: 'bg-gray-100    text-gray-600'    },
  conteudo:          { label: 'Conteúdo',          color: 'bg-blue-100   text-blue-600'    },
  revisao:           { label: 'Revisão',           color: 'bg-yellow-100 text-yellow-700'  },
  aprovacao_cliente: { label: 'Aprovação',         color: 'bg-purple-100 text-purple-600'  },
  em_analise:        { label: 'Em Análise',        color: 'bg-blue-100   text-blue-700'    },
  aprovado:          { label: 'Aprovado',          color: 'bg-green-100  text-green-700'   },
  rejeitado:         { label: 'Rejeitado',         color: 'bg-red-100    text-red-700'     },
  publicado:         { label: 'Publicado',         color: 'bg-emerald-100 text-emerald-700'},
};

const STATUS_DOT: Record<string, string> = {
  rascunho: 'bg-gray-400', conteudo: 'bg-blue-400', revisao: 'bg-yellow-400',
  aprovacao_cliente: 'bg-purple-400', em_analise: 'bg-blue-500',
  aprovado: 'bg-green-500', rejeitado: 'bg-red-500', publicado: 'bg-emerald-500',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS   = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function getThumb(post: Post): string | null {
  if (post.creatives?.length)        return post.creatives[0].url;
  if ((post as any).image_url)       return (post as any).image_url;
  if ((post as any).image_urls?.[0]) return (post as any).image_urls[0];
  return null;
}

function getScheduledDate(post: Post): Date | null {
  if (!post.scheduledAt) return null;
  if (typeof post.scheduledAt === 'string') return new Date(post.scheduledAt);
  if (typeof (post.scheduledAt as any)?.toDate === 'function') {
    return (post.scheduledAt as any).toDate();
  }
  return null;
}

/* ─── CalendarView ────────────────────────────────────────────── */

function CalendarView({ posts, onPreview }: { posts: Post[]; onPreview: (p: Post) => void }) {
  const today   = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth     = new Date(year, month + 1, 0).getDate();
  const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;

  const postsByDay: Record<string, Post[]> = {};
  posts.forEach((p) => {
    const d = getScheduledDate(p);
    if (!d || d.getFullYear() !== year || d.getMonth() !== month) return;
    const key = String(d.getDate());
    postsByDay[key] = [...(postsByDay[key] ?? []), p];
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{MONTHS[month]} {year}</h3>
        <div className="flex gap-1">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={() => setCurrent(new Date(today.getFullYear(), today.getMonth(), 1))} className="px-3 h-8 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Hoje
          </button>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {Array.from({ length: totalCells }).map((_, idx) => {
          const dayNum  = idx - firstDayOfMonth + 1;
          const isValid = dayNum >= 1 && dayNum <= daysInMonth;
          const isToday = isValid && dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const dayPosts = isValid ? (postsByDay[String(dayNum)] ?? []) : [];

          return (
            <div key={idx} className={cn('min-h-[90px] border-b border-r border-gray-100 p-1.5', !isValid && 'bg-gray-50')}>
              {isValid && (
                <>
                  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1', isToday ? 'bg-[#FF5C00] text-white' : 'text-gray-700')}>
                    {dayNum}
                  </div>
                  <div className="space-y-0.5">
                    {dayPosts.slice(0, 2).map((post) => (
                      <PostCard key={post.id} post={post} onPreview={onPreview} compact />
                    ))}
                    {dayPosts.length > 2 && (
                      <div className="text-[10px] text-gray-400 pl-1">+{dayPosts.length - 2} mais</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── GridView ────────────────────────────────────────────────── */

function GridView({ posts, onPreview }: { posts: Post[]; onPreview: (p: Post) => void }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onPreview={onPreview} />
      ))}
    </div>
  );
}

function isVideoThumb(post: Post): boolean {
  const first = post.creatives?.[0];
  if (!first) return false;
  if (first.type) return first.type.startsWith('video');
  if (first.url)  return /\.(mp4|webm|mov|ogg)(\?|$)/i.test(first.url) || first.url.includes('video%2F');
  return false;
}

/* ─── ListView ────────────────────────────────────────────────── */

function ListView({ posts, onPreview }: { posts: Post[]; onPreview: (p: Post) => void }) {
  const router = useRouter();

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            {['Post', 'Status', 'Plataforma', 'Data', 'Campanha', 'Ações'].map((h) => (
              <th key={h} className="text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 py-3 px-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {posts.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                Nenhum post encontrado
              </td>
            </tr>
          ) : posts.map((post) => {
            const thumb     = getThumb(post);
            const platform  = post.platforms?.[0] ?? (post as any).platform ?? '';
            const sDate     = getScheduledDate(post);
            const statusCfg = STATUS_LABELS[post.status ?? 'rascunho'] ?? STATUS_LABELS.rascunho;
            const dotColor  = STATUS_DOT[post.status ?? 'rascunho']   ?? 'bg-gray-400';

            return (
              <tr key={post.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onPreview(post)}
                      className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-[#FF5C00]/30 transition-all cursor-pointer flex-shrink-0 group relative"
                      title="Ver preview"
                    >
                      {thumb ? (
                        isVideoThumb(post) ? (
                          <>
                            <video
                              src={thumb}
                              className="absolute inset-0 w-full h-full object-cover"
                              preload="metadata"
                              muted
                              playsInline
                              onLoadedMetadata={(e) => { (e.target as HTMLVideoElement).currentTime = 1; }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                              <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 ml-0.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                              </div>
                            </div>
                          </>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        )
                      ) : <span className="text-lg">🖼️</span>
                      }
                    </button>
                    <span className="text-sm font-medium text-gray-900">{post.title}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full', dotColor)} />
                    <span className="text-sm">{statusCfg.label}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-sm">
                  {platform ? `${PLATFORM_EMOJI[platform] ?? '📱'} ${platform}` : '—'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {sDate ? sDate.toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="py-3 px-4 text-sm text-gray-500">
                  {post.campaignId ?? (post as any).campaign ?? '—'}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onPreview(post)}
                      className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      title="Preview"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      onClick={() => router.push(`/criar-post?edit=${post.id}`)}
                      className="w-8 h-8 rounded-lg bg-[#FF5C00]/10 text-[#FF5C00] flex items-center justify-center hover:bg-[#FF5C00]/20 transition-colors"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */

type ViewMode = 'grid' | 'calendar' | 'list';

const VIEW_BUTTONS: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'grid',     icon: <LayoutGrid size={15} />, label: 'Grade'      },
  { mode: 'calendar', icon: <Calendar   size={15} />, label: 'Calendário' },
  { mode: 'list',     icon: <List       size={15} />, label: 'Lista'      },
];

export default function AgendamentosPage() {
  const { user }   = useAuth();
  const router     = useRouter();

  const [view,        setView]        = useState<ViewMode>('grid');
  const [previewPost, setPreviewPost] = useState<Post | null>(null);

  // ✅ CORREÇÃO: usa useUserCollection (onSnapshot reativo) em vez de
  // getDocs + import db errado de @/lib/firebase/firestore
  const { data: posts, loading } = useUserCollection<Post>(
    user?.uid ?? null,
    'posts',
    [orderBy('createdAt', 'desc')]
  );

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Agendamentos</h2>
          <p className="text-sm text-gray-400">
            {loading ? 'Carregando...' : `${posts.length} post${posts.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de view */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
            {VIEW_BUTTONS.map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => setView(mode)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  view === mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
                title={label}
              >
                {icon}
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Novo post */}
          <button
            onClick={() => router.push('/criar-post')}
            className="flex items-center gap-1.5 bg-[#FF5C00] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#E54E00] transition-colors"
          >
            <Plus size={14} /> Novo Post
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#FF5C00] rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-3">📭</div>
          <p className="font-medium">Nenhum post ainda.</p>
          <button
            onClick={() => router.push('/criar-post')}
            className="mt-4 px-4 py-2 bg-[#FF5C00] text-white rounded-lg text-sm font-medium hover:bg-[#E54E00] transition-colors"
          >
            Criar primeiro post
          </button>
        </div>
      ) : (
        <>
          {view === 'grid'     && <GridView     posts={posts} onPreview={setPreviewPost} />}
          {view === 'calendar' && <CalendarView posts={posts} onPreview={setPreviewPost} />}
          {view === 'list'     && <ListView     posts={posts} onPreview={setPreviewPost} />}
        </>
      )}

      {/* Modal de preview */}
      {previewPost && (
        <PostPreviewModal
          post={previewPost}
          onClose={() => setPreviewPost(null)}
          onUpdate={() => {}} // onSnapshot já atualiza automaticamente
        />
      )}
    </div>
  );
}
