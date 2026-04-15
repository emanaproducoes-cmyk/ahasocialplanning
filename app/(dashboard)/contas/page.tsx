"use client";

// app/(dashboard)/contas/page.tsx
// CORREÇÕES v2:
//  - Mapeamento completo de TODOS os erros do callback Meta
//  - Toast de sucesso exibe o número de contas importadas
//  - Botão "Testar conexão" com escopos mínimos (útil para debug)
//  - Layout limpo mantido

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/hooks/useAuth";
import ContaCard from "@/components/contas/ContaCard";
import IntegracoesModal from "@/components/contas/IntegracoesModal";
import { Plus, RefreshCw, CheckCircle2, AlertCircle, X, Wifi } from "lucide-react";

interface SocialAccount {
  id: string;
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin";
  name: string;
  handle?: string;
  avatar?: string;
  followers?: number;
  status: "connected" | "disconnected" | "error" | "pending";
  tokenExpiresAt?: number;
  lastSyncAt?: Date | null;
}

interface Toast {
  type: "success" | "error" | "warning";
  message: string;
}

// ── Mapeamento completo de erros do callback OAuth Meta ───────────────────────
const META_ERROR_MESSAGES: Record<string, string> = {
  // Erros do fluxo OAuth
  oauth_cancelled:          "Autorização cancelada. Tente novamente quando quiser.",
  invalid_callback:         "Retorno OAuth inválido. Certifique-se de que a URL está correta.",
  invalid_state:            "Sessão de segurança inválida. Reinicie o processo de conexão.",
  state_expired:            "Sessão expirada (mais de 10 min). Clique em Nova Conta novamente.",

  // Erros de token
  token_exchange_failed:    "Falha ao trocar o código OAuth por token. Verifique se META_APP_SECRET está correto no Vercel.",
  long_token_failed:        "Aviso: token de curta duração gerado (long token falhou). A conta foi conectada, mas o token expirará em 1 hora.",
  server_misconfigured:     "Configuração do servidor incompleta. Verifique as variáveis META_APP_ID e META_APP_SECRET no Vercel.",

  // Erros de dados
  no_pages_found:           "Sua conta Facebook não tem nenhuma Página criada, e não foi encontrada conta Instagram Business vinculada. Crie uma Página no Facebook ou converta sua conta IG para Comercial/Criador.",
  pages_fetch_failed:       "Falha ao buscar páginas do Facebook. Verifique se o app Meta tem as permissões 'pages_show_list' e 'pages_read_engagement'.",
  firestore_save_failed:    "Erro ao salvar as contas no banco de dados. Verifique as credenciais Firebase no Vercel.",

  // Erros retornados pelo próprio Facebook
  access_denied:            "Acesso negado. Você recusou as permissões solicitadas.",
  "access_denied: Permissions error": "Permissões insuficientes. Tente novamente e aceite todas as solicitações.",
};

export default function ContasPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [accounts,    setAccounts]    = useState<SocialAccount[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [syncingIds,  setSyncingIds]  = useState<Set<string>>(new Set());
  const [toast,       setToast]       = useState<Toast | null>(null);

  const showToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 7000);
  }, []);

  // ── Lê parâmetros de retorno do OAuth Meta ──────────────────────────────────
  useEffect(() => {
    const success = searchParams.get("success");
    const error   = searchParams.get("error");
    const count   = searchParams.get("count");

    if (success === "true") {
      const n = parseInt(count || "1", 10);
      showToast(
        "success",
        `✅ ${n} conta${n !== 1 ? "s" : ""} Meta conectada${n !== 1 ? "s" : ""} com sucesso!`
      );
      window.history.replaceState({}, "", "/contas");
      return;
    }

    if (error) {
      // Tenta match exato primeiro, depois começa-com, depois fallback
      const decoded   = decodeURIComponent(error);
      const message   =
        META_ERROR_MESSAGES[decoded] ??
        META_ERROR_MESSAGES[decoded.split(":")[0].trim()] ??
        `Erro na integração Meta: ${decoded}`;

      // long_token_failed é aviso, não erro crítico
      const isWarning = decoded.startsWith("long_token_failed");
      showToast(isWarning ? "warning" : "error", message);
      window.history.replaceState({}, "", "/contas");
    }
  }, [searchParams, showToast]);

  // ── Listener em tempo real das contas ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "socialAccounts"),
      orderBy("connectedAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as SocialAccount[];
        setAccounts(data);
        setLoading(false);
      },
      (err) => {
        console.error("[contas] onSnapshot erro:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [user]);

  // ── Sincroniza uma conta ────────────────────────────────────────────────────
  const handleSync = useCallback(
    async (accountId: string) => {
      if (!user) return;
      setSyncingIds((prev) => new Set(prev).add(accountId));

      try {
        const idToken = await user.getIdToken();
        const res = await fetch(`/api/meta/sync-account/${accountId}`, {
          method:  "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha na sincronização");
        showToast("success", "✅ Conta sincronizada com sucesso!");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido";
        showToast("error", `Erro ao sincronizar: ${message}`);
      } finally {
        setSyncingIds((prev) => {
          const next = new Set(prev);
          next.delete(accountId);
          return next;
        });
      }
    },
    [user, showToast]
  );

  // ── Sincroniza todas ────────────────────────────────────────────────────────
  const handleSyncAll = useCallback(async () => {
    const connected = accounts.filter((a) => a.status === "connected");
    for (const account of connected) {
      await handleSync(account.id);
    }
  }, [accounts, handleSync]);

  // ── Inicia OAuth Meta ───────────────────────────────────────────────────────
  const handleConnect = useCallback(
    async (_platform: string) => {
      if (!user) return;
      const idToken = await user.getIdToken();
      window.location.href = `/api/meta/connect?idToken=${encodeURIComponent(idToken)}`;
    },
    [user]
  );

  const connectedCount = accounts.filter((a) => a.status === "connected").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : toast.type === "warning"
              ? "bg-yellow-50 border border-yellow-200 text-yellow-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          )}
          <span className="flex-1 leading-relaxed">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100 flex-shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* ── Header ──────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contas Conectadas</h1>
            <p className="text-sm text-gray-500 mt-1">
              {connectedCount} conta{connectedCount !== 1 ? "s" : ""} ativa{connectedCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2">
            {accounts.length > 0 && (
              <button
                onClick={handleSyncAll}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <RefreshCw size={15} />
                Sincronizar todas
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Plus size={15} />
              Nova Conta
            </button>
          </div>
        </div>

        {/* ── Banner informativo (quando sem contas) ───────────────────────────── */}
        {!loading && accounts.length === 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700">
            <div className="flex items-start gap-2">
              <Wifi size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold mb-1">Para conectar Instagram + Facebook:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-600">
                  <li>Sua conta Facebook precisa ter ao menos <strong>uma Página</strong> criada</li>
                  <li>O Instagram deve ser do tipo <strong>Comercial</strong> ou <strong>Criador de conteúdo</strong></li>
                  <li>O Instagram deve estar <strong>vinculado</strong> à Página do Facebook</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ── Skeleton loading ─────────────────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-11 h-11 bg-gray-200 rounded-full" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-2 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Grid de contas ───────────────────────────────────────────────────── */}
        {!loading && accounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <ContaCard
                key={account.id}
                account={account}
                onSync={handleSync}
                onConnect={handleConnect}
                isSyncing={syncingIds.has(account.id)}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────────── */}
        {!loading && accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma conta conectada</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Conecte suas contas do Instagram Business e Facebook para começar a publicar e
              acompanhar métricas.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800 transition-colors"
            >
              <Plus size={15} />
              Conectar primeira conta
            </button>
          </div>
        )}
      </div>

      <IntegracoesModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
