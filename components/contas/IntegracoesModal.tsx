'use client';

/**
 * components/contas/IntegracoesModal.tsx
 *
 * Integra botão real de OAuth Meta para Instagram e Facebook.
 * As outras plataformas mantêm o fluxo original (saveDoc).
 */

import { useState, useEffect }  from 'react';
import { Modal }                from '@/components/ui/Modal';
import { showToast }            from '@/components/ui/Toast';
import { saveDoc }              from '@/lib/firebase/firestore';
import { serverTimestamp }      from 'firebase/firestore';
import { cn }                   from '@/lib/utils/cn';
import { formatDate }           from '@/lib/utils/formatters';
import { useAuth }              from '@/lib/hooks/useAuth';
import type { ConnectedAccount, Platform } from '@/lib/types';

// ─── Platform grid data ───────────────────────────────────────────────────────
interface PlatformOption {
  id:       Platform;
  label:    string;
  emoji:    string;
  gradient: string;
  useMetaOAuth?: boolean;
  subModal?: { via: string; warning: string; options: { label: string; icon: string; desc: string }[] };
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    id: 'instagram', label: 'Instagram Business', emoji: '📸',
    gradient: 'linear-gradient(135deg,#833AB4,#FD1D1D,#F77737)',
    useMetaOAuth: true,
  },
  {
    id: 'facebook', label: 'Facebook', emoji: '👍',
    gradient: 'linear-gradient(135deg,#1877F2,#0C5FD6)',
    useMetaOAuth: true,
  },
  { id: 'threads',         label: 'Threads',            emoji: '🧵', gradient: 'linear-gradient(135deg,#1C1C1C,#3D3D3D)' },
  { id: 'linkedin',        label: 'LinkedIn',           emoji: '💼', gradient: 'linear-gradient(135deg,#0A66C2,#004182)' },
  { id: 'pinterest',       label: 'Pinterest',          emoji: '📌', gradient: 'linear-gradient(135deg,#E60023,#C8001A)' },
  { id: 'google_business', label: 'Google Meu Negócio', emoji: '🏢', gradient: 'linear-gradient(135deg,#4285F4,#34A853)' },
  { id: 'youtube',         label: 'YouTube',            emoji: '▶️', gradient: 'linear-gradient(135deg,#FF0000,#FF6B00)' },
  { id: 'tiktok',          label: 'TikTok',             emoji: '🎵', gradient: 'linear-gradient(135deg,#010101,#2E2E2E)' },
];

// ─── MetaOAuthSubModal ────────────────────────────────────────────────────────
function MetaOAuthSubModal({
  platform,
  onBack,
  onConnect,
  loading,
}: {
  platform: PlatformOption;
  onBack:   () => void;
  onConnect: () => void;
  loading:  boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: platform.gradient }}>
          {platform.emoji}
        </div>
        <h3 className="text-lg font-bold text-gray-900">{platform.label}</h3>
        <p className="text-sm text-center text-gray-500 max-w-xs">
          Você será redirecionado para o <strong>Meta</strong> para autorizar o acesso
          às suas páginas e conta de anúncios.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 space-y-1">
        <p className="font-semibold">O que será autorizado:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>Leitura de seguidores e engajamento</li>
          <li>Publicação de posts e stories</li>
          <li>Acesso a insights e métricas</li>
          <li>Gerenciamento de anúncios (opcional)</li>
        </ul>
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        ⚠️ Apenas contas comerciais ou criadores de conteúdo são compatíveis.
      </p>

      <div className="flex gap-2 pt-1">
        <button onClick={onBack} className="flex-1 py-2.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg">
          ← Voltar
        </button>
        <button
          onClick={onConnect}
          disabled={loading}
          className="flex-1 py-2.5 bg-[#1877F2] text-white text-sm font-semibold rounded-lg hover:bg-[#0C5FD6] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? '⏳ Redirecionando...' : '🔵 Conectar via Meta'}
        </button>
      </div>
    </div>
  );
}

// ─── SubModal for non-Meta platforms ─────────────────────────────────────────
function SubModal({
  platform, onBack, onConnect,
}: {
  platform:  PlatformOption;
  onBack:    () => void;
  onConnect: (method: string) => void;
}) {
  if (!platform.subModal) return null;
  const { warning, options } = platform.subModal;

  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{warning}</p>
      <p className="text-sm font-medium text-gray-700">Como você deseja conectar o {platform.label}?</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button key={opt.label} onClick={() => onConnect(opt.label)}
            className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-xl hover:border-[#FF5C00] hover:bg-orange-50 transition-all text-left group">
            <span className="text-2xl">{opt.icon}</span>
            <div>
              <p className="text-sm font-semibold text-gray-800 group-hover:text-[#FF5C00]">{opt.label}</p>
              <p className="text-xs text-gray-500">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        ← Voltar
      </button>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface IntegracoesModalProps {
  isOpen:            boolean;
  onClose:           () => void;
  uid:               string;
  connectedAccounts: ConnectedAccount[];
}

export function IntegracoesModal({ isOpen, onClose, uid, connectedAccounts }: IntegracoesModalProps) {
  const { user }                        = useAuth();
  const [search,      setSearch]        = useState('');
  const [subPlatform, setSubPlatform]   = useState<PlatformOption | null>(null);
  const [saving,      setSaving]        = useState(false);
  const [metaLoading, setMetaLoading]   = useState(false);

  // Detecta retorno do callback Meta (URL com ?meta=success ou ?meta=error)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const meta   = params.get('meta');
    if (meta === 'success') {
      showToast('Conta Meta conectada com sucesso! ✅', 'success');
      // Limpa o parâmetro da URL sem recarregar
      window.history.replaceState({}, '', window.location.pathname);
    } else if (meta === 'error') {
      const msg = params.get('msg') ?? 'Erro desconhecido';
      showToast(`Erro ao conectar Meta: ${msg}`, 'error');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const filtered = PLATFORM_OPTIONS.filter((p) =>
    p.label.toLowerCase().includes(search.toLowerCase())
  );

  const countFor = (platform: Platform) =>
    connectedAccounts.filter((a) => a.platform === platform).length;

  const handleIntegrate = (platform: PlatformOption) => {
    setSubPlatform(platform);
  };

  const handleMetaOAuth = async () => {
    if (!user) return;
    setMetaLoading(true);
    try {
      const idToken = await user.getIdToken();
      window.location.href = `/api/meta/connect?uid=${uid}&idToken=${idToken}`;
    } catch {
      showToast('Erro ao iniciar autenticação Meta.', 'error');
      setMetaLoading(false);
    }
  };

  const connectDirect = async (platform: Platform, label: string, method?: string) => {
    setSaving(true);
    try {
      const id = `${platform}_${Date.now()}`;
      const newAccount: Omit<ConnectedAccount, 'id'> = {
        platform,
        name:        label,
        handle:      label.toLowerCase().replace(/\s/g, ''),
        avatar:      '',
        followers:   0,
        engagement:  0,
        posts:       0,
        status:      'pendente',
        connectedAt: serverTimestamp() as ConnectedAccount['connectedAt'],
        updatedAt:   serverTimestamp() as ConnectedAccount['updatedAt'],
      };
      await saveDoc(`users/${uid}/connectedAccounts`, id, newAccount);
      showToast(`${label} ${method ? `(${method}) ` : ''}conectado!`, 'success');
      setSubPlatform(null);
    } catch {
      showToast('Erro ao conectar conta. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { setSubPlatform(null); onClose(); }}
      title={subPlatform ? `Conectar ${subPlatform.label}` : 'Adicionar Integração'}
      size="lg"
      footer={
        !subPlatform ? (
          <button onClick={onClose}
            className="px-5 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors">
            ✅ Finalizar integrações
          </button>
        ) : undefined
      }
    >
      {subPlatform ? (
        subPlatform.useMetaOAuth ? (
          <MetaOAuthSubModal
            platform={subPlatform}
            onBack={() => setSubPlatform(null)}
            onConnect={handleMetaOAuth}
            loading={metaLoading}
          />
        ) : (
          <SubModal
            platform={subPlatform}
            onBack={() => setSubPlatform(null)}
            onConnect={(method) => connectDirect(subPlatform.id, subPlatform.label, method)}
          />
        )
      ) : (
        <div className="space-y-5">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar integração..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]" />
          </div>

          {/* Platform grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filtered.map((platform) => {
              const count       = countFor(platform.id);
              const isConnected = count > 0;

              return (
                <div key={platform.id}
                  className={cn('rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all',
                    isConnected ? 'border-transparent text-white' : 'border-gray-100 bg-white hover:border-[#FF5C00]/30 hover:shadow-sm')}
                  style={isConnected ? { background: platform.gradient } : undefined}>
                  <div className="text-3xl">{platform.emoji}</div>
                  <p className={cn('text-xs font-semibold text-center leading-tight', isConnected ? 'text-white' : 'text-gray-700')}>
                    {platform.label}
                  </p>
                  <p className={cn('text-[10px]', isConnected ? 'text-white/70' : 'text-gray-400')}>
                    {isConnected ? `${count} conta(s)` : platform.useMetaOAuth ? 'Via Meta OAuth' : 'Nenhuma conta'}
                  </p>
                  <button onClick={() => handleIntegrate(platform)} disabled={saving}
                    className={cn('w-full text-xs font-medium py-1.5 rounded-lg transition-colors',
                      isConnected ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-[#FF5C00] text-white hover:bg-[#E54E00]')}>
                    {isConnected ? '+ Nova conta' : 'Integrar'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Connected accounts list */}
          {connectedAccounts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Minhas integrações
              </h4>
              <div className="space-y-2">
                {connectedAccounts.map((account) => {
                  const meta = PLATFORM_OPTIONS.find((p) => p.id === account.platform);
                  return (
                    <div key={account.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                      <span className="text-xl">{meta?.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{account.name}</p>
                        <p className="text-xs text-gray-500">@{account.handle}</p>
                      </div>
                      <div className="text-right">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full',
                          account.status === 'ativo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                          {account.status}
                        </span>
                        {account.connectedAt && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(account.connectedAt)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
