'use client';

import { useState }          from 'react';
import Link                  from 'next/link';
import { useAuth }           from '@/lib/hooks/useAuth';
import { useUserCollection } from '@/lib/hooks/useCollection';
import { usePreferences }    from '@/lib/hooks/usePreferences';
import { AgendamentoCard }   from '@/components/agendamentos/AgendamentoCard';
import { AgendamentoCalendario } from '@/components/agendamentos/AgendamentoCalendario';
import { EmptyState }        from '@/components/ui/EmptyState';
import { SkeletonGrid, SkeletonList } from '@/components/ui/SkeletonCard';
import { cn }                from '@/lib/utils/cn';
import { orderBy }           from 'firebase/firestore';
import type { Post, ViewMode, Responsavel } from '@/lib/types';

type View = 'lista' | 'grade' | 'calendario';

export default function AgendamentosPage() {
  const { user }               = useAuth();
  const { prefs, setViewMode } = usePreferences(user?.uid ?? null);
  const { data: posts, loading } = useUserCollection<Post>(
    user?.uid ?? null,
    'posts',
    [orderBy('createdAt', 'desc')]
  );

  const [view, setView]       = useState<View>((prefs.viewModes?.agendamentos as View) ?? 'grade');
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Page header */}
      <div>
        <h1 className="text-[22px] font-bold text-gray-900">Agendamentos</h1>
        <p className="text-[14px] text-gray-500 mt-0.5">Planeje e organize todos os seus conteúdos</p>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: account filter */}
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 text-[13px] border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 min-w-[160px]">
            <option>Todas as Contas</option>
          </select>
        </div>

        {/* Right: view toggle + new button */}
        <div className="flex items-center gap-2">
          {/* View toggle — matches screenshot */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <button
              onClick={() => handleViewChange('lista')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors',
                view === 'lista'
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Lista
            </button>
            <button
              onClick={() => handleViewChange('grade')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors border-x border-gray-200',
                view === 'grade'
                  ? 'bg-[#FF5C00] text-white'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
              Grade
            </button>
            <button
              onClick={() => handleViewChange('calendario')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium transition-colors',
                view === 'calendario'
                  ? 'bg-gray-100 text-gray-800'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Calendário
            </button>
          </div>

          <Link
            href="/criar-post"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-[13px] font-bold rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            Novo Agendamento
          </Link>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        view === 'lista' ? <SkeletonList count={6} /> : <SkeletonGrid count={8} />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Nenhum agendamento ainda"
          subtitle="Crie seu primeiro post e agende para as suas redes sociais."
          actionLabel="Criar primeiro post"
          onAction={() => { window.location.href = '/criar-post'; }}
        />
      ) : view === 'calendario' ? (
        <AgendamentoCalendario posts={posts} onSelect={setSelected} />
      ) : view === 'lista' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-[40px_1fr_60px_140px_120px_140px] gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <div/>
            <div>Título</div>
            <div>Rede</div>
            <div>Data</div>
            <div>Status</div>
            <div>Ações</div>
          </div>
          {posts.map((post) => (
            <AgendamentoCard
              key={post.id}
              post={post}
              uid={user?.uid ?? ''}
              responsavel={responsavel}
              view="lista"
            />
          ))}
        </div>
      ) : (
        /* Grade — 4 columns matching screenshot */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((post) => (
            <AgendamentoCard
              key={post.id}
              post={post}
              uid={user?.uid ?? ''}
              responsavel={responsavel}
              view="grade"
            />
          ))}
        </div>
      )}
    </div>
  );
}
