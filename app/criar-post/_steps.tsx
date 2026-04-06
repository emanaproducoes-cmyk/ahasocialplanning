'use client';

import { useState, useCallback, useRef } from 'react';
import { cn }                            from '@/lib/utils/cn';
import { formatFileSize }                from '@/lib/firebase/storage';
import type { Platform, PostFormat, ConnectedAccount } from '@/lib/types';

// ─── Types exportados ─────────────────────────────────────────────────────────
export interface FormatSelection {
  platform: Platform;
  format:   PostFormat;
}

export interface UploadItem {
  file:     File;
  preview:  string;
  progress: number;
  url:      string | null;
  error:    string | null;
}

export type Step = 1 | 2;

// ─── Plataformas disponíveis ───────────────────────────────────────────────────
const PLATFORMS: { id: Platform; label: string; emoji: string }[] = [
  { id: 'instagram',       label: 'Instagram',          emoji: '📸' },
  { id: 'facebook',        label: 'Facebook',           emoji: '👍' },
  { id: 'tiktok',          label: 'TikTok',             emoji: '🎵' },
  { id: 'youtube',         label: 'YouTube',            emoji: '▶️' },
  { id: 'linkedin',        label: 'LinkedIn',           emoji: '💼' },
  { id: 'threads',         label: 'Threads',            emoji: '🧵' },
  { id: 'pinterest',       label: 'Pinterest',          emoji: '📌' },
  { id: 'google_business', label: 'Google Meu Negócio', emoji: '🏢' },
];

// ─── Step 1 — Conteúdo ────────────────────────────────────────────────────────
export function Step1Content({
  platforms,
  onTogglePlatform,
  title,      setTitle,
  caption,    setCaption,
  hashtags,   setHashtags,
  uploads,
  onAddFiles,
  onNext,
}: {
  platforms:        Platform[];
  onTogglePlatform: (p: Platform) => void;
  title:       string; setTitle:    (v: string) => void;
  caption:     string; setCaption:  (v: string) => void;
  hashtags:    string; setHashtags: (v: string) => void;
  uploads:     UploadItem[];
  onAddFiles:  (files: File[]) => void;
  onNext:      () => void;
}) {
  const MAX_CHARS = 2200;

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    onAddFiles(Array.from(e.dataTransfer.files));
  }, [onAddFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) onAddFiles(Array.from(e.target.files));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Criar novo post</h2>
        <p className="text-sm text-gray-500">Selecione as redes, adicione mídias e escreva a legenda</p>
      </div>

      {/* ── Plataformas ── */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
          Redes sociais *
        </label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => {
            const active = platforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onTogglePlatform(p.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  active
                    ? 'bg-[#FF5C00] text-white border-[#FF5C00]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF5C00]/50'
                )}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Esquerda: inputs ── */}
        <div className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Título interno *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Post produto X — semana 3"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>

          {/* Upload */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Mídias
            </label>
            <p className="text-xs text-gray-400 mb-2">PNG, JPG, JPEG, MP4 — máx. 50 MB</p>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById('file-input')?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#FF5C00]/40 hover:bg-orange-50/30 transition-all cursor-pointer"
            >
              <span className="text-3xl">📁</span>
              <p className="text-sm text-gray-500 mt-2">
                Arraste arquivos aqui ou{' '}
                <span className="text-[#FF5C00] font-medium">clique para selecionar</span>
              </p>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/png,image/jpeg,image/jpg,video/mp4"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            {uploads.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {uploads.map((item, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {item.preview && <img src={item.preview} alt="" className="w-full h-full object-cover" />}
                    {item.progress < 100 && !item.url && !item.error && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                        <div className="w-3/4 bg-white/30 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full bg-white rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                        </div>
                        <p className="text-white text-[10px] mt-1">{item.progress}%</p>
                      </div>
                    )}
                    {item.url && (
                      <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px]">✓</span>
                      </div>
                    )}
                    {item.error && (
                      <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center p-1">
                        <p className="text-white text-[10px] text-center">{item.error}</p>
                      </div>
                    )}
                    <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] px-1 truncate">
                      {item.file.name} ({formatFileSize(item.file.size)})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Legenda */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Legenda
              </label>
              <span className={cn('text-xs', caption.length > MAX_CHARS ? 'text-red-500' : 'text-gray-400')}>
                {caption.length}/{MAX_CHARS}
              </span>
            </div>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escreva a legenda do post..."
              rows={5}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>

          {/* Hashtags */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
              Hashtags
            </label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="#marketing #socialmedia #conteudo"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00]"
            />
          </div>
        </div>

        {/* ── Direita: preview ── */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Preview</p>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm max-w-xs mx-auto">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#FFB800]" />
              <div>
                <p className="text-xs font-semibold text-gray-900">sua_conta</p>
                <p className="text-[10px] text-gray-400">
                  {platforms.length > 0 ? platforms.map(p => PLATFORMS.find(x => x.id === p)?.emoji).join(' ') : '📱'}
                </p>
              </div>
              <span className="ml-auto text-gray-400 text-lg">⋯</span>
            </div>
            <div className="aspect-square bg-gray-100 flex items-center justify-center">
              {uploads[0]?.preview
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={uploads[0].preview} alt="Preview" className="w-full h-full object-cover" />
                : <span className="text-5xl opacity-20">🖼️</span>
              }
            </div>
            <div className="px-3 py-2 flex items-center gap-3">
              <span className="text-xl">🤍</span><span className="text-xl">💬</span><span className="text-xl">➤</span>
              <span className="ml-auto text-xl">🔖</span>
            </div>
            <div className="px-3 pb-3">
              <p className="text-xs text-gray-900 line-clamp-3">
                <span className="font-semibold">sua_conta </span>
                {caption || <span className="text-gray-400 italic">Sua legenda aparecerá aqui...</span>}
              </p>
              {hashtags && <p className="text-xs text-blue-500 mt-1 line-clamp-2">{hashtags}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!title.trim() || platforms.length === 0}
          className="px-8 py-3 bg-[#FF5C00] hover:bg-[#E54E00] disabled:opacity-40 text-white font-medium rounded-xl transition-colors"
        >
          Continuar →
        </button>
      </div>
    </div>
  );
}
