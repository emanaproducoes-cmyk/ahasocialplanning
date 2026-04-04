'use client';

import { useState, useEffect } from 'react';
import Script                  from 'next/script';
import { useAuth }             from '@/lib/hooks/useAuth';
import { useUserCollection }   from '@/lib/hooks/useCollection';
import { KanbanBoard }         from '@/components/workflow/KanbanBoard';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { Modal }               from '@/components/ui/Modal';
import { showToast }           from '@/components/ui/Toast';
import { saveDoc }             from '@/lib/firebase/firestore';
import { serverTimestamp }     from 'firebase/firestore';
import { orderBy }             from 'firebase/firestore';
import type { Post, PostStatus, Responsavel } from '@/lib/types';

// ─── Quick-add post form ──────────────────────────────────────────────────────
function QuickAddForm({
  defaultStatus,
  onSave,
  onCancel,
}: {
  defaultStatus: PostStatus;
  onSave:  (data: Partial<Post>) => Promise<void>;
  onCancel:() => void;
}) {
  const [title,  setTitle]  = useState('');
  const [date,   setDate]   = useState('');
  const [saving, setSaving] = useState(false);

  const PLATFORMS = ['instagram','facebook','youtube','tiktok','linkedin','threads'];
  const [platform, setPlatform] = useState('instagram');

  const handleSave = async () => {
    if (!title.trim()) { showToast('Informe o título do post.', 'warning'); return; }
    setSaving(true);
    await onSave({
      title:       title.trim(),
      status:      defaultStatus,
      platforms:   [platform as Post['platforms'][0]],
      scheduledAt: date ? serverTimestamp() as Post['scheduledAt'] : null,
      caption:     '',
      hashtags:    [],
      creatives:   [],
      tags:        [],
      format:      'feed',
      campaignId:  null,
      approvalToken: null,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Título *
        </label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título do post"
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Plataforma
        </label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 bg-white"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          Data prevista
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 bg-[#FF5C00] hover:bg-[#E54E00] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {saving ? 'Salvando...' : 'Adicionar card'}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WorkflowPage() {
  const { user }                    = useAuth();
  const { data: posts, loading }    = useUserCollection<Post>(
    user?.uid ?? null,
    'posts',
    [orderBy('createdAt', 'desc')]
  );

  const [addStatus, setAddStatus]   = useState<PostStatus | null>(null);

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  const handleAddPost = async (data: Partial<Post>) => {
    if (!user) return;
    const id = `post_${Date.now()}`;
    await saveDoc(`users/${user.uid}/posts`, id, {
      ...data,
      responsavel,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    showToast('Post adicionado ao kanban!', 'success');
    setAddStatus(null);
  };

  return (
    <>
      {/* SortableJS from CDN */}
      <Script
        src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js"
        strategy="beforeInteractive"
      />

      <div className="space-y-5 animate-fade-in">
        <PageHeader
          title="Workflow"
          subtitle="Kanban de gestão de conteúdo"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                🔄 Atualizar
              </button>
              <PrimaryButton
                icon="+"
                onClick={() => setAddStatus('rascunho')}
              >
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
          onAddPost={(status) => setAddStatus(status)}
        />
      </div>

      {/* Quick-add modal */}
      <Modal
        isOpen={!!addStatus}
        onClose={() => setAddStatus(null)}
        title={`Novo post — ${addStatus ?? ''}`}
        size="sm"
      >
        {addStatus && (
          <QuickAddForm
            defaultStatus={addStatus}
            onSave={handleAddPost}
            onCancel={() => setAddStatus(null)}
          />
        )}
      </Modal>
    </>
  );
}
