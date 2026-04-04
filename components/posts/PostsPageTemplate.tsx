'use client';

import Link                  from 'next/link';
import { useAuth }           from '@/lib/hooks/useAuth';
import { useUserCollection } from '@/lib/hooks/useCollection';
import { AgendamentoCard }   from '@/components/agendamentos/AgendamentoCard';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { EmptyState }        from '@/components/ui/EmptyState';
import { SkeletonGrid }      from '@/components/ui/SkeletonCard';
import { SyncIndicator }     from '@/components/ui/SyncIndicator';
import { showToast }         from '@/components/ui/Toast';
import { movePostToStatus }  from '@/lib/firebase/firestore';
import { orderBy, where }    from 'firebase/firestore';
import type { Post, PostStatus, Responsavel } from '@/lib/types';

interface PostsPageTemplateProps {
  title:          string;
  subtitle:       string;
  collection:     string;
  filterStatus?:  PostStatus;
  emptyIcon:      string;
  emptyTitle:     string;
  emptySubtitle:  string;
  contextActions?: (post: Post, uid: string) => React.ReactNode;
}

export function PostsPageTemplate({
  title,
  subtitle,
  collection,
  filterStatus,
  emptyIcon,
  emptyTitle,
  emptySubtitle,
  contextActions,
}: PostsPageTemplateProps) {
  const { user } = useAuth();

  const { data: posts, loading, syncStatus } = useUserCollection<Post>(
    user?.uid ?? null,
    collection,
    filterStatus
      ? [where('status', '==', filterStatus), orderBy('updatedAt', 'desc')]
      : [orderBy('updatedAt', 'desc')]
  );

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title={title}
        subtitle={`${posts.length} post(s) — ${subtitle}`}
        actions={
          <div className="flex items-center gap-2">
            <SyncIndicator status={syncStatus} showLabel />
            <Link href="/criar-post">
              <PrimaryButton icon="+">Novo Post</PrimaryButton>
            </Link>
          </div>
        }
      />

      {loading ? (
        <SkeletonGrid count={8} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          subtitle={emptySubtitle}
          actionLabel="Criar novo post"
          onAction={() => { window.location.href = '/criar-post'; }}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {posts.map((post) => (
            <div key={post.id} className="relative group">
              <AgendamentoCard
                post={post}
                uid={user?.uid ?? ''}
                responsavel={responsavel}
                view="grade"
              />
              {/* Context-specific action overlay */}
              {contextActions && (
                <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {contextActions(post, user?.uid ?? '')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Context action helpers ───────────────────────────────────────────────────
export function contextActionButton(
  label:   string,
  icon:    string,
  onClick: () => void,
  variant: 'blue' | 'green' | 'orange' | 'red' = 'blue'
) {
  const colors = {
    blue:   'bg-blue-500   hover:bg-blue-600',
    green:  'bg-green-500  hover:bg-green-600',
    orange: 'bg-[#FF5C00] hover:bg-[#E54E00]',
    red:    'bg-red-500    hover:bg-red-600',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full text-xs font-medium py-1.5 rounded-lg text-white transition-colors ${colors[variant]}`}
    >
      {icon} {label}
    </button>
  );
}
