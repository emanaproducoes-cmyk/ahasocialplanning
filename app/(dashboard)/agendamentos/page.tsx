'use client';

import { useState }          from 'react';
import Link                  from 'next/link';
import { useAuth }           from '@/lib/hooks/useAuth';
import { useUserCollection } from '@/lib/hooks/useCollection';
import { usePreferences }    from '@/lib/hooks/usePreferences';
import { AgendamentoCard }   from '@/components/agendamentos/AgendamentoCard';
import { AgendamentoCalendario } from '@/components/agendamentos/AgendamentoCalendario';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { EmptyState }        from '@/components/ui/EmptyState';
import { SkeletonGrid, SkeletonList } from '@/components/ui/SkeletonCard';
import { cn }                from '@/lib/utils/cn';
import { orderBy }           from 'firebase/firestore';
import type { Post, ViewMode, Responsavel } from '@/lib/types';

type View = 'lista' | 'grade' | 'calendario';

export default function AgendamentosPage() {
  const { user }                = useAuth();
  const { prefs, setViewMode }  = usePreferences(user?.uid ?? null);
  const { data: posts, loading, syncStatus } = useUserCollection<Post>(
    user?.uid ?? null,
    'posts',
    [orderBy('scheduledAt', 'asc')]
  );

  const [view, setView] = useState<View>((prefs.viewModes?.agendamentos as View) ?? 'grade');
  const [selected, setSelected] = useState<Post | null>(null);

  const handleViewChange = (v: View) => {
    setView(v);
    setViewMode('agendamentos', v as ViewMode);
  };

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  const VIEW_BUTTONS: { id: View; icon: string; label: string }[] = [
    { id: 'lista',      icon: '≡',  label: 'Lista'      },
    { id: 'grade',      icon: '⊞',  label: 'Grade'      },
    { id: 'calendario', icon: '📅', label: 'Calendário' },
  ];

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Agendamentos"
        subtitle={`${posts.length} post(s) agendado(s)`}
        actions={
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-card">
              {VIEW_BUTTONS.map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleViewChange(id)}
                  title={label}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 text-sm transition-colors',
                    view === id
                      ? 'bg-[#FF5C00] text-white'
                      : 'text-gray-500 hover:bg-gray-50'
                  )}
                >
                  <span>{icon}</span>
                  <span className="hidden sm:inline text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>

            <Link href="/criar-post">
              <PrimaryButton icon="+">Novo Agendamento</PrimaryButton>
            </Link>
          </div>
        }
      />

      {loading ? (
        view === 'lista' ? <SkeletonList count={6} /> : <SkeletonGrid count={8} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Nenhum agendamento encontrado"
          subtitle="Crie seu primeiro post e agende para as suas redes sociais."
          actionLabel="Criar primeiro post"
          onAction={() => window.location.href = '/criar-post'}
        />
      ) : view === 'calendario' ? (
        <AgendamentoCalendario posts={posts} onSelect={setSelected} />
      ) : view === 'lista' ? (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="w-10" />
            <div className="flex-1">Título</div>
            <div className="w-8 hidden sm:block">Rede</div>
            <div className="w-36 hidden md:block">Data</div>
            <div className="w-24">Status</div>
            <div className="w-32">Ações</div>
          </div>
          {posts.map((post) => (
            <AgendamentoCard
              key={post.id}
              post={post}
              uid={user?.uid ?? ''}
              responsavel={responsavel}
              view="lista"
              onEdit={setSelected}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {posts.map((post) => (
            <AgendamentoCard
              key={post.id}
              post={post}
              uid={user?.uid ?? ''}
              responsavel={responsavel}
              view="grade"
              onEdit={setSelected}
            />
          ))}
        </div>
      )}
    </div>
  );
}
