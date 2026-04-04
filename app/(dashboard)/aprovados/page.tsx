'use client';

import { PostsPageTemplate, contextActionButton } from '@/components/posts/PostsPageTemplate';
import { showToast }         from '@/components/ui/Toast';
import { movePostToStatus }  from '@/lib/firebase/firestore';
import type { Post }         from '@/lib/types';

export default function AprovadosPage() {
  return (
    <PostsPageTemplate
      title="Aprovados"
      subtitle="prontos para publicar"
      collection="aprovados"
      emptyIcon="✅"
      emptyTitle="Nenhum post aprovado"
      emptySubtitle="Posts aprovados pelo cliente aparecerão aqui."
      contextActions={(post, uid) =>
        contextActionButton(
          'Agendar agora',
          '📅',
          async () => {
            await movePostToStatus(uid, post.id, 'publicado', post.status);
            showToast('Post agendado para publicação!', 'success');
          },
          'green'
        )
      }
    />
  );
}
