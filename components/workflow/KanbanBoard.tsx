'use client';

/**
 * KanbanBoard.tsx — Drag & Drop nativo (HTML5 API)
 * Melhorias implementadas:
 *  - Arrastar e soltar 100% nativo (sem SortableJS)
 *  - Feedback visual durante drag (highlight de coluna de destino)
 *  - Miniaturas visíveis nos cards
 *  - Sem dependências externas adicionais
 */

import { useState, useCallback, useRef } from 'react';
import { PostCard }         from './PostCard';
import { PostDetailModal }  from './PostDetailModal';
import { ConfirmModal }     from '@/components/ui/Modal';
import { SkeletonKanbanCard } from '@/components/ui/SkeletonCard';
import { showToast }        from '@/components/ui/Toast';
import { cn }               from '@/lib/utils/cn';
import { movePostToStatus, removeDoc } from '@/lib/firebase/firestore';
import { KANBAN_COLUMNS }   from '@/lib/types';
import type { Post, PostStatus, KanbanColumn, Responsavel } from '@/lib/types';

interface KanbanBoardProps {
  posts:       Post[];
  loading:     boolean;
  uid:         string;
  responsavel: Responsavel;
  onAddPost:   (status: PostStatus) => void;
}

export function KanbanBoard({ posts, loading, uid, responsavel, onAddPost }: KanbanBoardProps) {
  const [detailPost,    setDetailPost]    = useState<Post | null>(null);
  const [deletePostId,  setDeletePostId]  = useState<string | null>(null);
  const [dragOverCol,   setDragOverCol]   = useState<string | null>(null);
  const [draggingId,    setDraggingId]    = useState<string | null>(null);

  // Guarda o post sendo arrastado entre eventos
  const draggedPostRef = useRef<Post | null>(null);

  const postsByStatus: Record<string, Post[]> = {};
  KANBAN_COLUMNS.forEach((col) => { postsByStatus[col.id] = []; });
  posts.forEach((p) => {
    if (postsByStatus[p.status]) postsByStatus[p.status]!.push(p);
  });

  /* ── handlers de drag ─────────────────────────────────────────── */

  const handleDragStart = useCallback((e: React.DragEvent, post: Post) => {
    draggedPostRef.current = post;
    setDraggingId(post.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', post.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverCol(null);
    draggedPostRef.current = null;
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCol(colId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Só limpa se sair completamente do container da coluna
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCol(null);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverCol(null);

    const post = draggedPostRef.current;
    if (!post || post.status === colId) return;

    try {
      await movePostToStatus(uid, post.id, colId as PostStatus, post.status);
      showToast(`Post movido para "${colId}" ✓`, 'success');
    } catch {
      showToast('Erro ao mover post.', 'error');
    }

    draggedPostRef.current = null;
    setDraggingId(null);
  }, [uid]);

  /* ── delete ───────────────────────────────────────────────────── */

  const handleDelete = async () => {
    if (!deletePostId) return;
    await removeDoc(`users/${uid}/posts`, deletePostId);
    showToast('Post excluído.', 'success');
    setDeletePostId(null);
  };

  /* ── render ───────────────────────────────────────────────────── */

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6">
        {KANBAN_COLUMNS.map((col: KanbanColumn) => {
          const colPosts  = postsByStatus[col.id] ?? [];
          const isOver    = dragOverCol === col.id;

          return (
            <div key={col.id} className="flex flex-col shrink-0 w-[230px]">
              {/* Cabeçalho da coluna */}
              <div
                className="bg-white rounded-t-xl border-t-2 border-x border-gray-100 px-3 pt-3 pb-2 transition-colors"
                style={{ borderTopColor: col.color }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-700">
                      {col.label}
                    </h3>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ background: col.color }}
                    >
                      {colPosts.length}
                    </span>
                  </div>
                  <button
                    onClick={() => onAddPost(col.id as PostStatus)}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors text-lg leading-none"
                    title="Adicionar post"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Área de drop */}
              <div
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                data-col={col.id}
                className={cn(
                  'flex flex-col gap-2 min-h-[200px] flex-1 rounded-b-xl p-2 transition-all duration-150',
                  'border border-t-0',
                  isOver
                    ? 'bg-orange-50/80 border-[#FF5C00]/40 ring-1 ring-[#FF5C00]/20'
                    : 'bg-gray-50/80 border-gray-100',
                )}
              >
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => <SkeletonKanbanCard key={i} />)
                ) : colPosts.length === 0 ? (
                  <div
                    className={cn(
                      'flex flex-col items-center justify-center py-10 text-xs gap-1 rounded-lg border-2 border-dashed transition-colors',
                      isOver
                        ? 'border-[#FF5C00]/40 text-[#FF5C00]/60'
                        : 'border-gray-200 text-gray-300',
                    )}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                      <line x1="12" y1="8" x2="12" y2="16"/>
                      <line x1="8" y1="12" x2="16" y2="12"/>
                    </svg>
                    {isOver ? 'Solte aqui' : 'Arraste posts aqui'}
                  </div>
                ) : (
                  colPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      uid={uid}
                      responsavel={responsavel}
                      columnColor={col.color}
                      isDragging={draggingId === post.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onOpenDetail={setDetailPost}
                      onDelete={(id) => setDeletePostId(id)}
                    />
                  ))
                )}
              </div>

              <button
                onClick={() => onAddPost(col.id as PostStatus)}
                className="mt-1.5 w-full py-2 text-[11px] text-gray-400 hover:text-[#FF5C00] hover:bg-[#FF5C00]/5 rounded-xl transition-colors flex items-center justify-center gap-1 border border-dashed border-gray-200 hover:border-[#FF5C00]/30"
              >
                + Adicionar card
              </button>
            </div>
          );
        })}
      </div>

      <PostDetailModal
        post={detailPost}
        uid={uid}
        responsavel={responsavel}
        isOpen={!!detailPost}
        onClose={() => setDetailPost(null)}
        onEdit={() => setDetailPost(null)}
      />

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
