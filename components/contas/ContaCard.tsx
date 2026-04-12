"use client";

import React from "react";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock, Wifi, WifiOff } from "lucide-react";

interface SocialAccount {
  id: string;
  platform: "instagram" | "facebook" | "tiktok" | "youtube" | "linkedin";
  name: string;
  handle?: string;
  avatar?: string;
  followers?: number;
  status: "connected" | "disconnected" | "error" | "pending";
  tokenExpiresAt?: number;
  lastSyncAt?: Date | { toDate?: () => Date } | null;
}

interface ContaCardProps {
  account: SocialAccount;
  onSync?: (accountId: string) => Promise<void>;
  onConnect?: (platform: string) => void;
  onDisconnect?: (accountId: string) => void;
  isSyncing?: boolean;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "from-purple-500 to-pink-500",
  facebook: "from-blue-600 to-blue-500",
  tiktok: "from-gray-900 to-gray-700",
  youtube: "from-red-600 to-red-500",
  linkedin: "from-blue-700 to-blue-600",
};

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "📸",
  facebook: "👤",
  tiktok: "🎵",
  youtube: "▶️",
  linkedin: "💼",
};

function formatFollowers(n?: number): string {
  if (!n) return "–";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function getTokenStatus(expiresAt?: number): { label: string; color: string; icon: React.ReactNode } {
  if (!expiresAt) return { label: "Sem info", color: "text-gray-400", icon: <Clock size={12} /> };
  const daysLeft = Math.floor((expiresAt - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { label: "Expirado", color: "text-red-500", icon: <AlertTriangle size={12} /> };
  if (daysLeft < 10) return { label: `Expira em ${daysLeft}d`, color: "text-orange-400", icon: <AlertTriangle size={12} /> };
  return { label: `Válido ${daysLeft}d`, color: "text-green-400", icon: <CheckCircle2 size={12} /> };
}

export default function ContaCard({ account, onSync, onConnect, onDisconnect, isSyncing }: ContaCardProps) {
  const isConnected = account.status === "connected";
  const isError = account.status === "error";
  const tokenStatus = getTokenStatus(account.tokenExpiresAt);
  const gradient = PLATFORM_COLORS[account.platform] || "from-gray-500 to-gray-400";
  const icon = PLATFORM_ICONS[account.platform] || "🔗";

  const lastSync = account.lastSyncAt
    ? typeof account.lastSyncAt === "object" && "toDate" in account.lastSyncAt && account.lastSyncAt.toDate
      ? account.lastSyncAt.toDate()
      : account.lastSyncAt instanceof Date
      ? account.lastSyncAt
      : null
    : null;

  return (
    <div
      className={`relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md ${
        isError ? "border-red-200" : isConnected ? "border-gray-200" : "border-gray-200 opacity-75"
      }`}
    >
      {/* Header colorido */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

      <div className="p-4">
        {/* Top row: avatar + info + status badge */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {account.avatar ? (
              <img
                src={account.avatar}
                alt={account.name}
                className="w-11 h-11 rounded-full object-cover border-2 border-white shadow"
              />
            ) : (
              <div
                className={`w-11 h-11 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl`}
              >
                {icon}
              </div>
            )}
            {/* Ícone de status online/offline */}
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                isConnected ? "bg-green-400" : isError ? "bg-red-400" : "bg-gray-300"
              }`}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate text-sm">{account.name}</p>
            {account.handle && (
              <p className="text-xs text-gray-500 truncate">{account.handle}</p>
            )}
            <p className="text-xs text-gray-400 mt-0.5">{PLATFORM_LABELS[account.platform]}</p>
          </div>

          {/* Status badge */}
          <div className="flex-shrink-0">
            {isConnected ? (
              <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                <Wifi size={10} /> Ativa
              </span>
            ) : isError ? (
              <span className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-medium">
                <WifiOff size={10} /> Erro
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                <WifiOff size={10} /> Inativa
              </span>
            )}
          </div>
        </div>

        {/* Métricas */}
        {isConnected && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Seguidores</p>
              <p className="text-sm font-bold text-gray-800">{formatFollowers(account.followers)}</p>
            </div>
            <div className={`flex items-center gap-1 text-xs ${tokenStatus.color}`}>
              {tokenStatus.icon}
              <span>{tokenStatus.label}</span>
            </div>
          </div>
        )}

        {/* Última sync */}
        {lastSync && (
          <p className="text-xs text-gray-400 mt-1.5">
            Sync: {lastSync.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}

        {/* Ações */}
        <div className="mt-3 flex gap-2">
          {isConnected ? (
            <>
              <button
                onClick={() => onSync?.(account.id)}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
                {isSyncing ? "Sincronizando..." : "Sincronizar"}
              </button>
              {onDisconnect && (
                <button
                  onClick={() => onDisconnect(account.id)}
                  className="px-3 text-xs text-gray-400 hover:text-red-500 transition-colors"
                  title="Desconectar"
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onConnect?.(account.platform)}
              className={`flex-1 text-xs bg-gradient-to-r ${gradient} text-white font-medium py-2 rounded-xl transition-opacity hover:opacity-90`}
            >
              Reconectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
