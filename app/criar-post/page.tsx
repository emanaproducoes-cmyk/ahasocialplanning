'use client';

/**
 * app/(dashboard)/agendamentos/page.tsx
 *
 * BUG FIX #6: STATUS_FILTERS agora inclui 'conteudo' e 'em_analise'.
 * Posts salvos com action='agendar' recebem status 'conteudo'; posts enviados
 * para aprovação ficam com 'em_analise'. Ambos estavam ausentes dos filtros,
 * fazendo os posts "sumirem" da lista após serem criados.
 */

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

const ListIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const GridIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const CalIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

// BUG FIX #6: adicionados 'conteudo' e 'em_analise' que estavam ausentes
const STATUS_FILTERS = [
  { value: 'todos',      label: 'Todos',       color: 'bg-gray-100 text-gray-700'       },
  { value: 'rascunho',   label: 'Rascunho',    color: 'bg-gray-100 text-gray-600'       },
  { value: 'conteudo',   label: 'Conteúdo',    color: 'bg-blue-100 text-blue-600'       },  // ← NOVO
  { value: 'em_analise', label: 'Em Análise',  color: 'bg-indigo-100 text-indigo-700'   },  // ← NOVO
  { value: 'revisao',    label: 'Revisão',     color: 'bg-yellow-100 text-yellow-700'   },
  { value: 'aprovado',   label: 'Aprovados',   color: 'bg-green-100 text-green-700'     },
  { value: 'rejeitado',  label: 'Rejeitados',  color: 'bg-red-100 text-red-700'         },
  { value: 'publicado',  label: 'Publicados',  color: 'bg-emerald-100 text-emerald-700' },
];

export default function AgendamentosPage() {
  const { user }               = useAuth();
  const { prefs, setViewMode } = usePreferences(user?.uid ?? null);
  const { data: posts, loading } = useUserCollection<Post>(
    user?.uid ?? null,
    'posts',
    [orderBy('createdAt', 'desc')]
  );

  const [view,           setView]          = useState<View>((prefs.viewModes?.agendamentos as View) ?? 'grade');
  const [statusFilter,   setStatusFilter]  = useState('todos');
  const [platformFilter, setPlatFilter]    = useState('todos');
  const [selected,       setSelected]      = useState<Post | null>(null);

  const handleViewChange = (v: View) => {
    setView(v);
    setViewMode('agendamentos', v as ViewMode);
  };

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  const filtered = posts
    .filter((p) => statusFilter === 'todos' || p.status === statusFilter)
    .filter((p) => platformFilter === 'todos' || (p.platforms ?? []).includes(platformFilter as Post['platforms'][0]));

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Título + botão novo */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-gray-900">Agendamentos</h1>
          <p className="text-[14px] text-gray-500 mt-0.5">Planeje e organize todos os seus conteúdos</p>
        </div>
        <Link
          href="/criar-post"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-[13px] font-bold rounded-lg transition-colors shadow-lg shadow-[#FF5C00]/25"
        >
          <span className="text-lg leading-none">+</span>
          Novo Agendamento
        </Link>
      </div>

      {/* Filtros + toggle de view */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 text-[12px] font-medium rounded-full transition-colors border',
                statusFilter === f.value
                  ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-sm'
                  : `${f.color} border-transparent hover:border-gray-200`,
              )}
            >
              {f.label}
              {f.value !== 'todos' && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({posts.filter((p) => p.status === f.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {([
            { v: 'lista'      as View, icon: <ListIcon />, label: 'Lista'      },
            { v: 'grade'      as View, icon: <GridIcon />, label: 'Grade'      },
            { v: 'calendario' as View, icon: <CalIcon />,  label: 'Calendário' },
          ]).map(({ v, icon, label }) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium transition-all',
                view === v
                  ? 'bg-[#FF5C00] text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                v !== 'lista' && 'border-l border-gray-200',
              )}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* KPIs rápidos — inclui conteudo e em_analise */}
      {!loading && posts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: posts.length,                                            color: 'text-gray-900'    },
            { label: 'Conteúdo',   value: posts.filter((p) => p.status === 'conteudo').length,     color: 'text-blue-600'    },
            { label: 'Em Análise', value: posts.filter((p) => p.status === 'em_analise').length,   color: 'text-indigo-600'  },
            { label: 'Aprovados',  value: posts.filter((p) => p.status === 'aprovado').length,     color: 'text-green-600'   },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
              <p className={cn('text-2xl font-extrabold', color)}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Conteúdo principal */}
      {loading ? (
        view === 'lista' ? <SkeletonList count={6} /> : <SkeletonGrid count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📅"
          title={statusFilter === 'todos' ? 'Nenhum agendamento ainda' : `Nenhum post ${STATUS_FILTERS.find((f) => f.value === statusFilter)?.label.toLowerCase() ?? ''}`}
          subtitle="Crie seu primeiro post e agende para as suas redes sociais."
          actionLabel="Criar primeiro post"
          onAction={() => { window.location.href = '/criar-post'; }}
        />
      ) : view === 'calendario' ? (
        <AgendamentoCalendario
          posts={filtered}
          uid={user?.uid ?? ''}
          responsavel={responsavel}
          onSelect={setSelected}
        />
      ) : view === 'lista' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-[48px_1fr_50px_140px_130px_150px] gap-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <div /><div>Título</div><div>Rede</div><div>Data</div><div>Status</div><div>Ações</div>
          </div>
          {filtered.map((post) => (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((post) => (
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
