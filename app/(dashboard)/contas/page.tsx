'use client';

import { useState, useEffect }    from 'react';
import { useSearchParams }         from 'next/navigation';
import { useAuth }                 from '@/lib/hooks/useAuth';
import { useUserCollection }       from '@/lib/hooks/useCollection';
import { ContaCard }               from '@/components/contas/ContaCard';
import { IntegracoesModal }        from '@/components/contas/IntegracoesModal';
import { PageHeader, PrimaryButton } from '@/components/layout/PageHeader';
import { EmptyState }              from '@/components/ui/EmptyState';
import { SkeletonGrid }            from '@/components/ui/SkeletonCard';
import { Modal }                   from '@/components/ui/Modal';
import { showToast }               from '@/components/ui/Toast';
import { saveDoc }                 from '@/lib/firebase/firestore';
import { orderBy }                 from 'firebase/firestore';
import type { ConnectedAccount }   from '@/lib/types';

export default function ContasPage() {
  const { user, isAdmin }              = useAuth();
  const searchParams                   = useSearchParams();
  const { data: contas, loading }      = useUserCollection<ConnectedAccount>(
    user?.uid ?? null,
    'connectedAccounts',
    [orderBy('connectedAt', 'desc')]
  );

  const [showIntegracoes, setShowIntegracoes] = useState(false);
  const [editConta,       setEditConta]       = useState<ConnectedAccount | null>(null);
  const [editName,        setEditName]        = useState('');
  const [editHandle,      setEditHandle]      = useState('');
  const [saving,          setSaving]          = useState(false);
  const [syncing,         setSyncing]         = useState<string | null>(null);

  // ── Detectar retorno do OAuth Meta (query params) ─────────────────────────
  useEffect(() => {
    const metaSuccess = searchParams.get('meta_success');
    const metaError   = searchParams.get('meta_error');

    if (metaSuccess === '1') {
      showToast('✅ Conta Meta conectada com sucesso! Sincronizando dados...', 'success');
      // Limpar params da URL sem recarregar
      window.history.replaceState({}, '', '/contas');
      // Auto-sync da conta recém conectada
      const accountId = searchParams.get('account');
      if (accountId && user?.uid) {
        syncAccount(user.uid, accountId);
      }
    }

    if (metaError) {
      const msg =
        metaError === 'permission_denied'
          ? 'Permissão negada. Autorize o acesso na tela da Meta.'
          : metaError === 'missing_params'
          ? 'Parâmetros inválidos no retorno OAuth.'
          : decodeURIComponent(metaError);
      showToast(`❌ Erro ao conectar Meta: ${msg}`, 'error');
      window.history.replaceState({}, '', '/contas');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Sincronizar conta via API ─────────────────────────────────────────────
  const syncAccount = async (uid: string, accountId: string) => {
    setSyncing(accountId);
    try {
      const res  = await fetch(`/api/meta/sync-account/${accountId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ uid }),
      });
      const data = await res.json() as { success?: boolean; cached?: boolean; error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Erro ao sincronizar.');

      if (data.cached) {
        showToast('Dados já atualizados nas últimas 4 horas.', 'info');
      } else {
        showToast('✅ Dados sincronizados com a Meta!', 'success');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao sincronizar conta.';
      showToast(msg, 'error');
    } finally {
      setSyncing(null);
    }
  };

  // ── Salvar edição de conta ────────────────────────────────────────────────
  const handleEditSave = async () => {
    if (!editConta || !user) return;
    setSaving(true);
    try {
      await saveDoc(`users/${user.uid}/connectedAccounts`, editConta.id, {
        name:   editName,
        handle: editHandle,
      });
      showToast('Conta atualizada!', 'success');
      setEditConta(null);
    } catch {
      showToast('Erro ao salvar.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Contas Meta conectadas (para exibir banner informativo) ───────────────
  const metaContas = contas.filter((c) => c.metaAccountId);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Contas Conectadas"
        subtitle={`${contas.length} conta(s) configurada(s)`}
        actions={
          isAdmin && (
            <PrimaryButton icon="+" onClick={() => setShowIntegracoes(true)}>
              Nova Conta
            </PrimaryButton>
          )
        }
      />

      {/* Banner Meta conectada */}
      {metaContas.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm">
          <span className="text-blue-600 font-bold">🔵 Meta API</span>
          <span className="text-blue-700">
            {metaContas.length} conta(s) conectada(s) via OAuth Meta.
          </span>
          <button
            onClick={() => {
              if (!user?.uid) return;
              metaContas.forEach((c) => syncAccount(user.uid, c.id));
            }}
            disabled={syncing !== null}
            className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {syncing ? '🔄 Sincronizando...' : '🔄 Sync All'}
          </button>
        </div>
      )}

      {/* Grid de contas */}
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
            <div key={conta.id} className="relative">
              <ContaCard
                conta={conta}
                uid={user?.uid ?? ''}
                isAdmin={isAdmin}
                onEdit={(c) => {
                  setEditConta(c);
                  setEditName(c.name);
                  setEditHandle(c.handle);
                }}
              />
              {/* Botão Sync individual para contas Meta */}
              {conta.metaAccountId && isAdmin && (
                <button
                  onClick={() => user?.uid && syncAccount(user.uid, conta.id)}
                  disabled={syncing === conta.id}
                  className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors shadow"
                  title="Sincronizar dados da Meta"
                >
                  {syncing === conta.id ? '...' : '🔄 Sync'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de integrações */}
      <IntegracoesModal
        isOpen={showIntegracoes}
        onClose={() => setShowIntegracoes(false)}
        uid={user?.uid ?? ''}
        connectedAccounts={contas}
      />

      {/* Modal de edição */}
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
