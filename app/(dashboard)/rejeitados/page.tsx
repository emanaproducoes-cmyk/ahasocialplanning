'use client';

import { PostsPageTemplate, contextActionButton } from '@/components/posts/PostsPageTemplate';
import { showToast }         from '@/components/ui/Toast';
import { movePostToStatus }  from '@/lib/firebase/firestore';

export default function RejeitadosPage() {
  return (
    <PostsPageTemplate
      title="Rejeitados"
      subtitle="necessitam de revisão"
      collection="rejeitados"
      emptyIcon="❌"
      emptyTitle="Nenhum post rejeitado"
      emptySubtitle="Posts rejeitados pelo cliente aparecerão aqui."
      contextActions={(post, uid) =>
        contextActionButton(
          'Solicitar revisão',
          '🔁',
          async () => {
            await movePostToStatus(uid, post.id, 'revisao', post.status);
            showToast('Post enviado para revisão!', 'info');
          },
          'orange'
        )
      }
    />
  );
}
