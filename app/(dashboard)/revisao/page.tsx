'use client';

import { PostsPageTemplate, contextActionButton } from '@/components/posts/PostsPageTemplate';
import { showToast }        from '@/components/ui/Toast';
import { movePostToStatus } from '@/lib/firebase/firestore';
import { generateApprovalLink, copyToClipboard } from '@/lib/utils/approval';
import { useAuth }          from '@/lib/hooks/useAuth';
import type { Responsavel } from '@/lib/types';

export default function RevisaoPage() {
  const { user } = useAuth();

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  return (
    <PostsPageTemplate
      title="Em Revisão"
      subtitle="sendo corrigidos"
      collection="revisao"
      emptyIcon="🔍"
      emptyTitle="Nenhum post em revisão"
      emptySubtitle="Posts em processo de revisão interna aparecerão aqui."
      contextActions={(post, uid) =>
        contextActionButton(
          'Reenviar aprovação',
          '📧',
          async () => {
            await movePostToStatus(uid, post.id, 'em_analise', post.status);
            try {
              const { url } = await generateApprovalLink({ uid, postId: post.id, post, responsavel });
              await copyToClipboard(url);
              showToast('Link copiado e post reenviado para análise!', 'success');
            } catch {
              showToast('Post reenviado para análise.', 'success');
            }
          },
          'blue'
        )
      }
    />
  );
}
