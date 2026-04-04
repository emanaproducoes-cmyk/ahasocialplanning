'use client';

import { useState }            from 'react';
import { useAuth }             from '@/lib/hooks/useAuth';
import { useUserCollection }   from '@/lib/hooks/useCollection';
import { CampanhaCard }        from '@/components/campanhas/CampanhaCard';
import { CriarCampanhaModal }  from '@/components/campanhas/CriarCampanhaModal';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { EmptyState }          from '@/components/ui/EmptyState';
import { SkeletonGrid }        from '@/components/ui/SkeletonCard';
import { orderBy }             from 'firebase/firestore';
import type { Campaign }       from '@/lib/types';

export default function CampanhasPage() {
  const { user }                    = useAuth();
  const { data: campanhas, loading } = useUserCollection<Campaign>(
    user?.uid ?? null,
    'campanhas',
    [orderBy('createdAt', 'desc')]
  );

  const [showCreate, setShowCreate]  = useState(false);
  const [editCampanha, setEditCampanha] = useState<Campaign | null>(null);

  // Summary stats
  const ativas    = campanhas.filter((c) => c.status === 'ativa').length;
  const concluidas = campanhas.filter((c) => c.status === 'concluida').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Campanhas"
        subtitle={`${campanhas.length} campanha(s) · ${ativas} ativa(s) · ${concluidas} concluída(s)`}
        actions={
          <PrimaryButton icon="+" onClick={() => setShowCreate(true)}>
            Nova Campanha
          </PrimaryButton>
        }
      />

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['todas', 'ativa', 'pausada', 'concluida', 'rascunho'] as const).map((status) => (
          <button
            key={status}
            className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-full bg-white border border-gray-200 text-gray-600 hover:border-[#FF5C00] hover:text-[#FF5C00] transition-colors capitalize"
          >
            {status === 'todas' ? 'Todas' : status}
            {status !== 'todas' && (
              <span className="ml-1 text-gray-400">
                ({campanhas.filter((c) => c.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : campanhas.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="Nenhuma campanha criada"
          subtitle="Crie sua primeira campanha para organizar e acompanhar seus conteúdos."
          actionLabel="Criar primeira campanha"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campanhas.map((campanha) => (
            <CampanhaCard
              key={campanha.id}
              campanha={campanha}
              uid={user?.uid ?? ''}
              onEdit={setEditCampanha}
            />
          ))}
        </div>
      )}

      <CriarCampanhaModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        uid={user?.uid ?? ''}
      />
    </div>
  );
}
