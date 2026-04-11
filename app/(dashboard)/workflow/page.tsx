'use client';

import { useAuth }               from '@/lib/hooks/useAuth';
import { useUserCollection }     from '@/lib/hooks/useCollection';
import { KanbanBoard }           from '@/components/workflow/KanbanBoard';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { useRouter }             from 'next/navigation';
import { orderBy }               from 'firebase/firestore';
import type { Post, PostStatus, Responsavel } from '@/lib/types';

export default function WorkflowPage() {
  const { user }                 = useAuth();
  const router                   = useRouter();
  const { data: posts, loading } = useUserCollection<Post>(
    user?.uid ?? null,
    'posts',
    [orderBy('createdAt', 'desc')]
  );

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  // ✅ Redireciona para /criar-post com status inicial e returnTo=workflow
  const handleAddPost = (status?: PostStatus) => {
    const params = new URLSearchParams({ returnTo: 'workflow' });
    if (status) params.set('defaultStatus', status);
    router.push(`/criar-post?${params.toString()}`);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Workflow"
        subtitle="Arraste posts entre colunas para avançar no fluxo"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              🔄 Atualizar
            </button>
            <PrimaryButton icon="+" onClick={() => handleAddPost()}>
              Adicionar post
            </PrimaryButton>
          </div>
        }
      />

      <KanbanBoard
        posts={posts}
        loading={loading}
        uid={user?.uid ?? ''}
        responsavel={responsavel}
        onAddPost={handleAddPost}
      />
    </div>
  );
}
