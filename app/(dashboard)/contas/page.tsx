'use client';

import { useState }            from 'react';
import { useAuth }             from '@/lib/hooks/useAuth';
import { useUserCollection }   from '@/lib/hooks/useCollection';
import { ContaCard }           from '@/components/contas/ContaCard';
import { IntegracoesModal }    from '@/components/contas/IntegracoesModal';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { EmptyState }          from '@/components/ui/EmptyState';
import { SkeletonGrid }        from '@/components/ui/SkeletonCard';
import { Modal }               from '@/components/ui/Modal';
import { showToast }           from '@/components/ui/Toast';
import { saveDoc }             from '@/lib/firebase/firestore';
import { orderBy }             from 'firebase/firestore';
import type { ConnectedAccount } from '@/lib/types';

export default function ContasPage() {
  const { user, isAdmin }    = useAuth();
  const { data: contas, loading } = useUserCollection<ConnectedAccount>(
    user?.uid ?? null,
    'connectedAccounts',
    [orderBy('connectedAt', 'desc')]
  );

  const [showIntegracoes, setShowIntegracoes] = useState(false);
  const [editConta,       setEditConta]       = useState<ConnectedAccount | null>(null);
  const [editName,        setEditName]        = useState('');
  const [editHandle,      setEditHandle]      = useState('');
  const [saving,          setSaving]          = useState(false);

  const handleEditSave = async () => {
    if (!editConta || !user) return;
    setSaving(true);
    await saveDoc(`users/${user.uid}/connectedAccounts`, editConta.id, {
      name:   editName,
      handle: editHandle,
    });
    showToast('Conta atualizada!', 'success');
    setSaving(false);
    setEditConta(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Contas Conectadas"
        subtitle={`${contas.length} conta(s) configurada(s)`}
        actions={
          isAdmin && (
            <PrimaryButton
              icon="+"
              onClick={() => setShowIntegracoes(true)}
            >
              Nova Conta
            </PrimaryButton>
          )
        }
      />

      {loading ? (
        <SkeletonGrid count={6} />
      ) : contas.length === 0 ? (
        <EmptyState
          icon="🔗"
          title="Nenhuma conta conectada"
          subtitle="Adicione suas redes sociais para começar a gerenciar conteúdo."
          actionLabel={isAdmin ? 'Conectar primeira conta' : undefined}
          onAction={isAdmin ? () => setShowIntegracoes(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {contas.map((conta) => (
            <ContaCard
              key={conta.id}
              conta={conta}
              uid={user?.uid ?? ''}
              isAdmin={isAdmin}
              onEdit={(c) => {
                setEditConta(c);
                setEditName(c.name);
                setEditHandle(c.handle);
              }}
            />
          ))}
        </div>
      )}

      {/* Integrações Modal */}
      <IntegracoesModal
        isOpen={showIntegracoes}
        onClose={() => setShowIntegracoes(false)}
        uid={user?.uid ?? ''}
        connectedAccounts={contas}
      />

      {/* Edit Modal */}
      <Modal
        isOpen={!!editConta}
        onClose={() => setEditConta(null)}
        title="Editar Conta"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setEditConta(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleEditSave}
              disabled={saving}
              className="px-4 py-2 bg-[#FF5C00] hover:bg-[#E54E00] disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Nome da conta
            </label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              @handle
            </label>
            <input
              value={editHandle}
              onChange={(e) => setEditHandle(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
