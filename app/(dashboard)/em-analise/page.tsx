'use client';

import { PostsPageTemplate, contextActionButton } from '@/components/posts/PostsPageTemplate';
import { showToast }   from '@/components/ui/Toast';
import { generateApprovalLink, copyToClipboard } from '@/lib/utils/approval';
import { useAuth }     from '@/lib/hooks/useAuth';
import type { Post, Responsavel } from '@/lib/types';

export default function EmAnalisePage() {
  const { user } = useAuth();

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  return (
    <PostsPageTemplate
      title="Em Análise"
      subtitle="aguardando aprovação do cliente"
      collection="emAnalise"
      emptyIcon="⏳"
      emptyTitle="Nenhum post em análise"
      emptySubtitle="Posts enviados para aprovação aparecerão aqui."
      contextActions={(post, uid) =>
        contextActionButton(
          'Lembrar aprovador',
          '📧',
          async () => {
            try {
              const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
              await copyToClipboard(url);
              showToast('Link de aprovação copiado para reenvio!', 'success');
            } catch {
              showToast('Erro ao gerar link.', 'error');
            }
          },
          'blue'
        )
      }
    />
  );
}
