"use client";

import React, { useState } from "react";
import { X, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
interface Platform {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  available: boolean;
}

const PLATFORMS: Platform[] = [
  {
    id: "instagram",
    name: "Instagram Business",
    icon: "📸",
    description: "Publique posts, Stories e Reels. Acesse métricas detalhadas.",
    color: "from-purple-500 to-pink-500",
    available: true,
  },
  {
    id: "facebook",
    name: "Facebook Page",
    icon: "👤",
    description: "Gerencie sua Página, publique conteúdo e acompanhe engajamento.",
    color: "from-blue-600 to-blue-500",
    available: true,
  },
  {
    id: "tiktok",
    name: "TikTok Business",
    icon: "🎵",
    description: "Publique vídeos e acesse dados de performance.",
    color: "from-gray-900 to-gray-700",
    available: false,
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: "▶️",
    description: "Gerencie seu canal e publique vídeos.",
    color: "from-red-600 to-red-500",
    available: false,
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: "💼",
    description: "Publique no seu perfil e páginas da empresa.",
    color: "from-blue-700 to-blue-600",
    available: false,
  },
];

interface IntegracoesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function IntegracoesModal({ isOpen, onClose }: IntegracoesModalProps) {
  const { currentUser } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (platform: Platform) => {
    if (!platform.available) return;
    if (!currentUser) {
      setError("Você precisa estar logado para conectar uma conta.");
      return;
    }

    setConnecting(platform.id);
    setError(null);

    try {
      if (platform.id === "instagram" || platform.id === "facebook") {
        // Inicia OAuth via Meta (Instagram e Facebook usam o mesmo fluxo)
        const idToken = await currentUser.getIdToken();
        const connectUrl = `/api/meta/connect?idToken=${encodeURIComponent(idToken)}`;
        // Redireciona para o fluxo OAuth (abre na mesma aba para manter sessão)
        window.location.href = connectUrl;
      } else {
        setError("Plataforma ainda não disponível.");
        setConnecting(null);
      }
    } catch (err) {
      console.error("Erro ao conectar:", err);
      setError("Erro ao iniciar conexão. Tente novamente.");
      setConnecting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Conectar Nova Conta</h2>
            <p className="text-sm text-gray-500 mt-0.5">Escolha a plataforma para conectar</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Alerta de erro */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Nota sobre Meta */}
        <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700">
            <strong>Instagram e Facebook</strong> são conectados juntos via Meta OAuth.
            Ao clicar em qualquer um, você será redirecionado para autorizar o app na Meta.
          </p>
        </div>

        {/* Lista de plataformas */}
        <div className="p-6 space-y-3">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handleConnect(platform)}
              disabled={!platform.available || connecting !== null}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                platform.available
                  ? "border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer"
                  : "border-gray-100 opacity-50 cursor-not-allowed"
              }`}
            >
              {/* Ícone */}
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {platform.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">{platform.name}</span>
                  {!platform.available && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Em breve</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{platform.description}</p>
              </div>

              {/* Indicador */}
              <div className="flex-shrink-0">
                {connecting === platform.id ? (
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                ) : platform.available ? (
                  <ExternalLink size={16} className="text-gray-400" />
                ) : null}
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-400 text-center">
            Seus dados são protegidos e você pode desconectar a qualquer momento.
          </p>
        </div>
      </div>
    </div>
  );
}
