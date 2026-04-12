"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase/client";
import { useAuth } from "@/contexts/AuthContext";
import ContaCard from "@/components/contas/ContaCard";
import IntegracoesModal from "@/components/contas/IntegracoesModal";
import { Plus, RefreshCw, CheckCircle2, AlertCircle, X } from "lucide-react";

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
  type: "success" | "error";
  message: string;
}

export default function ContasPage() {
  const { currentUser } = useAuth();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<Toast | null>(null);

  // Exibe toast temporário
  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Lê parâmetros de retorno do OAuth
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    const count = searchParams.get("count");

    if (success === "true") {
      const n = parseInt(count || "0", 10);
      showToast("success", `✅ ${n} conta${n !== 1 ? "s" : ""} Meta conectada${n !== 1 ? "s" : ""} com sucesso!`);
      // Limpa a URL
      window.history.replaceState({}, "", "/contas");
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_cancelled: "Autorização cancelada pelo usuário.",
        invalid_callback: "Retorno OAuth inválido.",
        state_expired: "Sessão expirada. Tente novamente.",
        token_exchange_failed: "Falha ao obter token. Verifique as credenciais Meta.",
        server_error: "Erro interno do servidor.",
      };
      showToast("error", errorMessages[error] || `Erro: ${error}`);
      window.history.replaceState({}, "", "/contas");
    }
  }, [searchParams, showToast]);

  // Listener em tempo real das contas
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "users", currentUser.uid, "socialAccounts"),
      orderBy("connectedAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: SocialAccount[] = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SocialAccount[];
      setAccounts(data);
      setLoading(false);
    });

    return unsub;
  }, [currentUser]);

  // Sincroniza uma conta específica
  const handleSync = useCallback(
    async (accountId: string) => {
      if (!currentUser) return;
      setSyncingIds((prev) => new Set(prev).add(accountId));

      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch(`/api/meta/sync-account/${accountId}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Falha na sincronização");
        showToast("success", "Conta sincronizada com sucesso!");
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
    [currentUser, showToast]
  );

  // Sincroniza todas as contas conectadas
  const handleSyncAll = useCallback(async () => {
    const connected = accounts.filter((a) => a.status === "connected");
    for (const account of connected) {
      await handleSync(account.id);
    }
  }, [accounts, handleSync]);

  // Inicia OAuth — redireciona para /api/meta/connect
  const handleConnect = useCallback(
    async (_platform: string) => {
      if (!currentUser) return;
      const idToken = await currentUser.getIdToken();
      window.location.href = `/api/meta/connect?idToken=${encodeURIComponent(idToken)}`;
    },
    [currentUser]
  );

  const connectedCount = accounts.filter((a) => a.status === "connected").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${
            toast.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span className="flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
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

        {/* Estado de loading */}
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

        {/* Grid de contas */}
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

        {/* Estado vazio */}
        {!loading && accounts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Nenhuma conta conectada</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Conecte suas contas do Instagram e Facebook para começar a publicar e acompanhar métricas.
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

      {/* Modal */}
      <IntegracoesModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
