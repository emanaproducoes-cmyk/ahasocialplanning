"use client";

// components/contas/IntegracoesModal.tsx
// CORREÇÕES v2:
//  - Info clara sobre pré-requisitos (Página FB obrigatória)
//  - Botão de debug com escopos mínimos (?minimal=1)
//  - Separação visual entre plataformas disponíveis e em breve

import React, { useState } from "react";
import { X, ExternalLink, Loader2, Info, AlertTriangle } from "lucide-react";
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
    id:          "instagram",
    name:        "Instagram Business",
    icon:        "📸",
    description: "Publique posts, Stories e Reels. Acesse métricas detalhadas.",
    color:       "from-purple-500 to-pink-500",
    available:   true,
  },
  {
    id:          "facebook",
    name:        "Facebook Page",
    icon:        "👤",
    description: "Gerencie sua Página, publique conteúdo e acompanhe engajamento.",
    color:       "from-blue-600 to-blue-500",
    available:   true,
  },
  {
    id:          "tiktok",
    name:        "TikTok Business",
    icon:        "🎵",
    description: "Publique vídeos e acesse dados de performance.",
    color:       "from-gray-900 to-gray-700",
    available:   false,
  },
  {
    id:          "youtube",
    name:        "YouTube",
    icon:        "▶️",
    description: "Gerencie seu canal e publique vídeos.",
    color:       "from-red-600 to-red-500",
    available:   false,
  },
  {
    id:          "linkedin",
    name:        "LinkedIn",
    icon:        "💼",
    description: "Publique no seu perfil e páginas da empresa.",
    color:       "from-blue-700 to-blue-600",
    available:   false,
  },
];

interface IntegracoesModalProps {
  isOpen:   boolean;
  onClose:  () => void;
}

export default function IntegracoesModal({ isOpen, onClose }: IntegracoesModalProps) {
  const { user } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (platform: Platform, minimal = false) => {
    if (!platform.available) return;
    if (!user) {
      setError("Você precisa estar logado para conectar uma conta.");
      return;
    }

    setConnecting(platform.id);
    setError(null);

    try {
      if (platform.id === "instagram" || platform.id === "facebook") {
        const idToken = await user.getIdToken();
        const url = `/api/meta/connect?idToken=${encodeURIComponent(idToken)}${minimal ? "&minimal=1" : ""}`;
        window.location.href = url;
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

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

        {/* Erro */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Info: pré-requisitos Meta */}
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-700 space-y-1">
              <p className="font-semibold">Pré-requisitos para Instagram + Facebook:</p>
              <ul className="list-disc list-inside space-y-0.5 text-amber-600">
                <li>Conta Facebook com ao menos <strong>uma Página criada</strong></li>
                <li>Instagram do tipo <strong>Comercial</strong> ou <strong>Criador</strong></li>
                <li>Instagram <strong>vinculado à Página</strong> do Facebook</li>
              </ul>
              <p className="text-amber-500 mt-1">
                Sem esses pré-requisitos, a integração retornará <code>no_pages_found</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Info: OAuth unificado */}
        <div className="mx-6 mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-700">
            <strong>Instagram e Facebook</strong> são conectados <strong>juntos</strong> via Meta OAuth.
            Ao clicar em qualquer um, você será redirecionado para autorizar o app na Meta e
            ambas as contas serão importadas automaticamente.
          </p>
        </div>

        {/* Lista de plataformas disponíveis */}
        <div className="p-6 space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Disponíveis</p>
          {PLATFORMS.filter((p) => p.available).map((platform) => (
            <button
              key={platform.id}
              onClick={() => handleConnect(platform)}
              disabled={connecting !== null}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer text-left transition-all disabled:opacity-50"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {platform.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900">{platform.name}</div>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{platform.description}</p>
              </div>
              <div className="flex-shrink-0">
                {connecting === platform.id ? (
                  <Loader2 size={18} className="animate-spin text-blue-500" />
                ) : (
                  <ExternalLink size={16} className="text-gray-400" />
                )}
              </div>
            </button>
          ))}

          {/* Plataformas em breve */}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-2">Em breve</p>
          {PLATFORMS.filter((p) => !p.available).map((platform) => (
            <div
              key={platform.id}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 opacity-50 text-left"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${platform.color} flex items-center justify-center text-2xl flex-shrink-0`}
              >
                {platform.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-900">{platform.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Em breve</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{platform.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 space-y-2">
          <p className="text-xs text-gray-400 text-center">
            Seus dados são protegidos e você pode desconectar a qualquer momento.
          </p>
          {/* Link de debug — remove em produção se quiser */}
          <p className="text-xs text-center">
            <button
              onClick={() => handleConnect(PLATFORMS[0], true)}
              className="text-gray-300 hover:text-gray-400 underline text-xs"
            >
              Testar com permissões mínimas (debug)
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
