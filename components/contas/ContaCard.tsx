'use client';

import { useState }           from 'react';
import { cn }                 from '@/lib/utils/cn';
import { formatNumber, formatDate } from '@/lib/utils/formatters';
import { ConfirmModal }       from '@/components/ui/Modal';
import { showToast }          from '@/components/ui/Toast';
import { removeDoc, updateFields } from '@/lib/firebase/firestore';
import type { ConnectedAccount } from '@/lib/types';

const PLATFORM_META: Record<string, { gradient: string; emoji: string; label: string; connectLabel: string }> = {
  instagram:       { gradient: 'linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)', emoji: '📸', label: 'Instagram',          connectLabel: 'Conectar Instagram via API'   },
  facebook:        { gradient: 'linear-gradient(135deg,#1877F2,#0C5FD6)',          emoji: '👍', label: 'Facebook',           connectLabel: 'Conectar Facebook via API'    },
  youtube:         { gradient: 'linear-gradient(135deg,#FF0000,#FF6B00)',          emoji: '▶️', label: 'YouTube',            connectLabel: 'Conectar YouTube via API'     },
  tiktok:          { gradient: 'linear-gradient(135deg,#010101,#2E2E2E)',          emoji: '🎵', label: 'TikTok',             connectLabel: 'Conectar TikTok via API'      },
  linkedin:        { gradient: 'linear-gradient(135deg,#0A66C2,#004182)',          emoji: '💼', label: 'LinkedIn',           connectLabel: 'Conectar LinkedIn via API'    },
  threads:         { gradient: 'linear-gradient(135deg,#1C1C1C,#3D3D3D)',          emoji: '🧵', label: 'Threads',            connectLabel: 'Conectar Threads via API'     },
  pinterest:       { gradient: 'linear-gradient(135deg,#E60023,#C8001A)',          emoji: '📌', label: 'Pinterest',          connectLabel: 'Conectar Pinterest via API'   },
  google_business: { gradient: 'linear-gradient(135deg,#4285F4,#34A853)',          emoji: '🏢', label: 'Google Meu Negócio', connectLabel: 'Conectar Google Meu Negócio' },
};

interface ContaCardProps {
  conta:    ConnectedAccount;
  uid:      string;
  isAdmin:  boolean;
  onEdit:   (conta: ConnectedAccount) => void;
}

export function ContaCard({ conta, uid, isAdmin, onEdit }: ContaCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncing,       setSyncing]       = useState(false);

  const meta = PLATFORM_META[conta.platform] ?? PLATFORM_META['instagram']!;

  const handleDelete = async () => {
    await removeDoc(`users/${uid}/connectedAccounts`, conta.id);
    showToast('Conta removida com sucesso.', 'success');
  };

  const handleSync = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1500)); // simulate API sync
    await updateFields(`users/${uid}/connectedAccounts`, conta.id, { status: 'ativo' });
    setSyncing(false);
    showToast(`${meta.label} sincronizado!`, 'success');
  };

  const adminTooltip = !isAdmin ? 'Somente o administrador pode gerenciar contas' : undefined;

  return (
    <>
      <div className="bg-white rounded-xl shadow-card overflow-hidden hover:shadow-hover transition-shadow flex flex-col">
        {/* Header with gradient */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ background: meta.gradient }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">{meta.emoji}</span>
            <div>
              <p className="text-white font-semibold text-sm">{conta.name}</p>
              <p className="text-white/70 text-xs">@{conta.handle}</p>
            </div>
          </div>
          <span
            className={cn(
              'text-[10px] font-bold px-2 py-0.5 rounded-full',
              conta.status === 'ativo'
                ? 'bg-green-400/20 text-green-100'
                : 'bg-red-400/20 text-red-100'
            )}
          >
            {conta.status === 'ativo' ? '● Ativo' : '● Inativo'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-gray-900">{formatNumber(conta.followers)}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Seguidores</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-lg font-bold text-gray-900">{conta.engagement.toFixed(1)}%</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Engajamento</p>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
          <div className="px-4 py-3 text-center">
            <p className="text-base font-bold text-gray-900">{conta.posts}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Posts</p>
          </div>
          <div className="px-4 py-3 text-center">
            <p className="text-base font-bold text-gray-900">{meta.label}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Plataforma</p>
          </div>
        </div>

        {/* Connect button */}
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            title={adminTooltip}
            disabled={!isAdmin}
            className={cn(
              'w-full flex items-center justify-center gap-2 text-xs font-medium py-2 rounded-lg transition-colors',
              isAdmin
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'bg-gray-50 text-gray-400 cursor-not-allowed'
            )}
          >
            🔗 {meta.connectLabel}
          </button>
        </div>

        {/* Actions */}
        <div className="px-4 py-3 flex items-center gap-2">
          <button
            onClick={() => isAdmin && setConfirmDelete(true)}
            title={adminTooltip}
            disabled={!isAdmin}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg transition-colors',
              isAdmin
                ? 'text-red-500 hover:bg-red-50'
                : 'text-gray-300 cursor-not-allowed'
            )}
          >
            🗑 Remover
          </button>
          <button
            onClick={() => isAdmin && onEdit(conta)}
            title={adminTooltip}
            disabled={!isAdmin}
            className={cn(
              'flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg transition-colors',
              isAdmin
                ? 'text-gray-600 hover:bg-gray-100'
                : 'text-gray-300 cursor-not-allowed'
            )}
          >
            ✏️ Editar
          </button>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-lg text-[#FF5C00] hover:bg-orange-50 transition-colors disabled:opacity-60"
          >
            {syncing ? (
              <span className="w-3 h-3 border border-orange-300 border-t-[#FF5C00] rounded-full animate-spin" />
            ) : '🔄'}
            {syncing ? 'Sync...' : 'Sync'}
          </button>
        </div>

        {/* Connected at */}
        {conta.connectedAt && (
          <div className="px-4 pb-3">
            <p className="text-[10px] text-gray-400">
              Conectado em {formatDate(conta.connectedAt)}
            </p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Remover conta"
        message={`Tem certeza que deseja remover a conta @${conta.handle}? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, remover"
        danger
      />
    </>
  );
}
