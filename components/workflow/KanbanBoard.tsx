'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PostCard }         from './PostCard';
import { PostDetailModal }  from './PostDetailModal';
import { ConfirmModal }     from '@/components/ui/Modal';
import { SkeletonKanbanCard } from '@/components/ui/SkeletonCard';
import { EmptyState }       from '@/components/ui/EmptyState';
import { showToast }        from '@/components/ui/Toast';
import { cn }               from '@/lib/utils/cn';
import { movePostToStatus, removeDoc } from '@/lib/firebase/firestore';
import { KANBAN_COLUMNS }   from '@/lib/types';
import type { Post, PostStatus, KanbanColumn, Responsavel } from '@/lib/types';

// SortableJS is loaded via CDN script tag in workflow page
declare global {
  interface Window {
    Sortable: {
      create: (el: HTMLElement, options: Record<string, unknown>) => void;
    };
  }
}

interface KanbanBoardProps {
  posts:       Post[];
  loading:     boolean;
  uid:         string;
  responsavel: Responsavel;
  onAddPost:   (status: PostStatus) => void;
}

export function KanbanBoard({ posts, loading, uid, responsavel, onAddPost }: KanbanBoardProps) {
  const columnsRef         = useRef<Map<string, HTMLElement>>(new Map());
  const [detailPost,     setDetailPost]     = useState<Post | null>(null);
  const [deletePostId,   setDeletePostId]   = useState<string | null>(null);

  // Group posts by status
  const postsByStatus: Record<string, Post[]> = {};
  KANBAN_COLUMNS.forEach((col) => { postsByStatus[col.id] = []; });
  posts.forEach((p) => {
    if (postsByStatus[p.status]) {
      postsByStatus[p.status]!.push(p);
    }
  });

  // Init Sortable on every column
  const initSortable = useCallback(() => {
    if (typeof window === 'undefined' || !window.Sortable) return;

    columnsRef.current.forEach((el, colId) => {
      window.Sortable.create(el, {
        group:        'kanban',
        animation:    150,
        ghostClass:   'kanban-ghost',
        chosenClass:  'kanban-chosen',
        dragClass:    'kanban-dragging',
        onEnd: async (evt: { item: HTMLElement; to: HTMLElement }) => {
          const cardId   = evt.item.dataset['id'];
          const newColId = evt.to.dataset['col'];
          if (!cardId || !newColId || newColId === colId) return;

          const post = posts.find((p) => p.id === cardId);
          if (!post) return;

          try {
            await movePostToStatus(uid, cardId, newColId as PostStatus, post.status);
            showToast(`Post movido para "${newColId}"`, 'success');
          } catch {
            showToast('Erro ao mover post. Tente novamente.', 'error');
          }
        },
      });
    });
  }, [posts, uid]);

  // Re-init sortable when posts change (needed after DOM rebuild)
  useEffect(() => {
    const timer = setTimeout(initSortable, 100);
    return () => clearTimeout(timer);
  }, [initSortable]);

  const handleDelete = async () => {
    if (!deletePostId) return;
    await removeDoc(`users/${uid}/posts`, deletePostId);
    showToast('Post excluído.', 'success');
    setDeletePostId(null);
  };

  return (
    <>
      {/* Board — horizontal scroll */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
        {KANBAN_COLUMNS.map((col: KanbanColumn) => {
          const colPosts = postsByStatus[col.id] ?? [];

          return (
            <div
              key={col.id}
              className="flex flex-col shrink-0 w-[260px]"
            >
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: col.color }}
                />
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex-1 truncate">
                  {col.label}
                </h3>
                <span className="text-xs text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full">
                  {colPosts.length}
                </span>
              </div>

              {/* Cards container */}
              <div
                ref={(el) => {
                  if (el) columnsRef.current.set(col.id, el);
                  else columnsRef.current.delete(col.id);
                }}
                data-col={col.id}
                className={cn(
                  'flex flex-col gap-2 min-h-[120px] flex-1 rounded-xl p-2 transition-colors',
                  'bg-gray-50 border-2 border-dashed border-transparent',
                  '[&:empty]:border-gray-200'
                )}
              >
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => <SkeletonKanbanCard key={i} />)
                ) : colPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-300 text-xs">
                    <span className="text-2xl mb-1">📋</span>
                    Nenhum post
                  </div>
                ) : (
                  colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      uid={uid}
                      responsavel={responsavel}
                      columnColor={col.color}
                      onOpenDetail={setDetailPost}
                      onDelete={(id) => setDeletePostId(id)}
                    />
                  ))
                )}
              </div>

              {/* Add card button */}
              <button
                onClick={() => onAddPost(col.id as PostStatus)}
                className="mt-2 w-full py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors flex items-center justify-center gap-1"
              >
                + Adicionar card
              </button>
            </div>
          );
        })}
      </div>

      {/* Detail Modal */}
      <PostDetailModal
        post={detailPost}
        uid={uid}
        responsavel={responsavel}
        isOpen={!!detailPost}
        onClose={() => setDetailPost(null)}
        onEdit={() => { setDetailPost(null); }}
      />

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deletePostId}
        onClose={() => setDeletePostId(null)}
        onConfirm={handleDelete}
        title="Excluir post"
        message="Tem certeza que deseja excluir este post? Esta ação não pode ser desfeita."
        confirmLabel="Sim, excluir"
        danger
      />
    </>
  );
}
