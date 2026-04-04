'use client';

import { PostsPageTemplate } from '@/components/posts/PostsPageTemplate';

export default function PostsPage() {
  return (
    <PostsPageTemplate
      title="Todos os Posts"
      subtitle="todos os status"
      collection="posts"
      emptyIcon="🗂"
      emptyTitle="Nenhum post encontrado"
      emptySubtitle="Crie seu primeiro post para começar a gerenciar seu conteúdo."
    />
  );
}
