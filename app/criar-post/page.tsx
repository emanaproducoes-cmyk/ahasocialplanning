'use client';

import { useState, useCallback, useMemo } from 'react';
import Link                               from 'next/link';
import { useRouter }                      from 'next/navigation';
import { useAuth }                        from '@/lib/hooks/useAuth';
import { saveDoc }                        from '@/lib/firebase/firestore';
import { uploadCreative }                 from '@/lib/firebase/storage';
import { showToast }                      from '@/components/ui/Toast';
import { generateApprovalLink, copyToClipboard, buildWhatsAppLink } from '@/lib/utils/approval';
import { serverTimestamp, Timestamp }     from 'firebase/firestore';
import { cn }                             from '@/lib/utils/cn';
import { Step1Content }                   from './_steps';
import type { UploadItem }                from './_steps';
import type { Platform, PostFormat, Responsavel } from '@/lib/types';

function WizardHeader({ step }: { step: number }) {
  const steps = [{ n: 1, label: 'Conteúdo' }, { n: 2, label: 'Conclusão' }];
  return (
    <div className="flex items-center justify-between mb-8 px-6 py-4 bg-white border-b border-gray-100">
      <Link href="/agendamentos" className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
        ← voltar
      </Link>
      <div className="flex items-center gap-4">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            {i > 0 && <div className={cn('w-12 h-px', step > s.n - 1 ? 'bg-[#FF5C00]' : 'bg-gray-200')} />}
            <div className="flex items-center gap-1.5">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                step === s.n ? 'bg-[#FF5C00] text-white' : step > s.n ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400')}>
                {step > s.n ? '✓' : s.n}
              </div>
              <span className={cn('text-xs font-medium hidden sm:block', step === s.n ? 'text-[#FF5C00]' : 'text-gray-400')}>
                {`0${s.n}. ${s.label}`}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="w-20" />
    </div>
  );
}

function Step2Conclusion({ title, caption, uploads, platforms, scheduledDate, onAction, saving, approvalUrl }: {
  title:         string;
  caption:       string;
  uploads:       UploadItem[];
  platforms:     Platform[];
  scheduledDate: string;
  onAction:      (action: 'agendar' | 'aprovacao' | 'rascunho' | 'publicar') => void;
  saving:        string | null;
  approvalUrl:   string | null;
}) {
  const thumbnail       = uploads.find((u) => u.url)?.url ?? uploads[0]?.preview ?? null;
  const uploadsInFlight = uploads.some((u) => !u.url && !u.error);
  const hasUploads      = uploads.length > 0;
  const uploadsDone     = hasUploads && !uploadsInFlight;

  const PLATFORM_EMOJI: Record<string, string> = {
    instagram: '📸', facebook: '👍', youtube: '▶️',
    tiktok: '🎵', linkedin: '💼', threads: '🧵',
    pinterest: '📌', google_business: '🏢',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">O que deseja fazer com este post?</h2>
        <p className="text-sm text-gray-500">Revise as informações e escolha a próxima ação</p>
      </div>

      {uploadsInFlight && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <span className="w-5 h-5 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Fazendo upload dos criativos…</p>
            <p className="text-xs text-amber-600">Aguarde terminar antes de salvar.</p>
          </div>
        </div>
      )}
      {hasUploads && uploadsDone && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700 font-medium">
          ✅ {uploads.filter((u) => u.url).length} criativo(s) enviado(s) com sucesso.
        </div>
      )}

      {/* Resumo */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
          {thumbnail
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={thumbnail} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{title || 'Sem título'}</p>
          <p className="text-sm text-gray-500 line-clamp-1">{caption || 'Sem legenda'}</p>
          {scheduledDate && (
            <p className="text-xs text-[#FF5C00] mt-0.5">
              📅 {new Date(scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
          <div className="flex gap-1 mt-1 flex-wrap">
            {platforms.map((p) => (
              <span key={p} className="text-xs bg-orange-50 text-[#FF5C00] px-2 py-0.5 rounded-full font-medium">
                {PLATFORM_EMOJI[p] ?? '📱'} {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Link de aprovação */}
      {approvalUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-blue-900">🔗 Link de aprovação gerado!</p>
          <div className="flex gap-2">
            <input readOnly value={approvalUrl}
              className="flex-1 text-xs bg-white border border-blue-200 rounded-lg px-3 py-2 text-blue-700 truncate" />
            <button onClick={() => { copyToClipboard(approvalUrl); showToast('Link copiado!', 'success'); }}
              className="px-3 py-2 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 shrink-0">Copiar</button>
          </div>
          <div className="flex gap-2">
            <a href={buildWhatsAppLink(approvalUrl, title)} target="_blank" rel="noreferrer"
              className="flex-1 text-center text-xs py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">📱 WhatsApp</a>
            <a href={`mailto:?subject=Aprovação: ${title}&body=${approvalUrl}`}
              className="flex-1 text-center text-xs py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">📧 E-mail</a>
          </div>
        </div>
      )}

      {/* Botões */}
      {!approvalUrl && (
        <div className="grid grid-cols-2 gap-3">
          {([
            { action: 'agendar'   as const, icon: '📅', label: 'Agendar',               bg: 'bg-blue-500   hover:bg-blue-600'   },
            { action: 'aprovacao' as const, icon: '📧', label: 'Enviar para aprovação',  bg: 'bg-purple-500 hover:bg-purple-600' },
            { action: 'rascunho'  as const, icon: '💾', label: 'Salvar rascunho',        bg: 'bg-gray-500   hover:bg-gray-600'   },
            { action: 'publicar'  as const, icon: '🚀', label: 'Publicar agora',         bg: 'bg-[#FF5C00]  hover:bg-[#E54E00]'  },
          ] as const).map(({ action, icon, label, bg }) => (
            <button key={action} onClick={() => onAction(action)}
              disabled={!!saving || uploadsInFlight}
              className={cn('flex flex-col items-center gap-2 p-5 text-white rounded-2xl transition-colors disabled:opacity-60', bg)}>
              {saving === action
                ? <span className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <span className="text-3xl">{icon}</span>
              }
              <span className="text-sm font-medium">{saving === action ? 'Aguarde...' : label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CriarPostPage() {
  const router   = useRouter();
  const { user } = useAuth();

  const postId = useMemo(
    () => `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  const [step,          setStep]          = useState<1 | 2>(1);
  const [platforms,     setPlatforms]     = useState<Platform[]>([]);
  const [title,         setTitle]         = useState('');
  const [caption,       setCaption]       = useState('');
  const [hashtags,      setHashtags]      = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [uploads,       setUploads]       = useState<UploadItem[]>([]);
  const [saving,        setSaving]        = useState<string | null>(null);
  const [approvalUrl,   setApprovalUrl]   = useState<string | null>(null);

  const responsavel: Responsavel = {
    nome:   user?.displayName ?? user?.email ?? 'Usuário',
    avatar: user?.photoURL ?? '',
    uid:    user?.uid ?? '',
  };

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const handleAddFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      const preview = URL.createObjectURL(file);
      setUploads((prev) => [...prev, { file, preview, progress: 0, url: null, error: null }]);
      if (user?.uid) {
        uploadCreative(file, user.uid, postId, (evt) => {
          setUploads((prev) => prev.map((u) => u.preview === preview ? { ...u, progress: evt.progress } : u));
        })
          .then((result) => {
            setUploads((prev) => prev.map((u) => u.preview === preview ? { ...u, url: result.url, progress: 100 } : u));
          })
          .catch((err: Error) => {
            setUploads((prev) => prev.map((u) => u.preview === preview ? { ...u, error: err.message } : u));
          });
      }
    });
  }, [user?.uid, postId]);

  const buildPostData = (status: string) => ({
    title,
    caption,
    hashtags: hashtags.split(' ').filter(Boolean).map((h) => h.replace('#', '')),
    platforms,
    format:   'feed' as PostFormat,
    // CRÍTICO: new Date().toISOString() dentro de arrays — serverTimestamp() proibido em arrays
    creatives: uploads
      .filter((u) => u.url)
      .map((u) => ({
        url:        u.url!,
        name:       u.file.name,
        type:       u.file.type,
        size:       u.file.size,
        uploadedAt: new Date().toISOString(),
      })),
    status,
    responsavel,
    campaignId:    null,
    approvalToken: null,
    tags:          [],
    // Converte a data string para Timestamp se informada
    scheduledAt: scheduledDate
      ? Timestamp.fromDate(new Date(scheduledDate + 'T12:00:00'))
      : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const handleAction = async (action: 'agendar' | 'aprovacao' | 'rascunho' | 'publicar') => {
    if (!user) return;
    setSaving(action);
    const statusMap = {
      agendar:   'conteudo',
      rascunho:  'rascunho',
      publicar:  'publicado',
      aprovacao: 'em_analise',
    } as const;

    try {
      const postData = buildPostData(statusMap[action]);
      await saveDoc(`users/${user.uid}/posts`, postId, postData);

      if (action === 'aprovacao') {
        const { url } = await generateApprovalLink({
          uid: user.uid, postId,
          post: postData as Parameters<typeof generateApprovalLink>[0]['post'],
          responsavel,
        });
        setApprovalUrl(url);
        showToast('Link de aprovação gerado!', 'success');
      } else {
        showToast(
          action === 'publicar' ? 'Post publicado! 🚀'
          : action === 'agendar' ? 'Post agendado! 📅'
          : 'Rascunho salvo! 💾', 'success'
        );
        router.push('/agendamentos');
      }
    } catch (err) {
      console.error('[CriarPost] save error', err);
      showToast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7FF] flex flex-col">
      <WizardHeader step={step} />
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-8">
        {step === 1 && (
          <Step1Content
            platforms={platforms}         onTogglePlatform={togglePlatform}
            title={title}                 setTitle={setTitle}
            caption={caption}             setCaption={setCaption}
            hashtags={hashtags}           setHashtags={setHashtags}
            scheduledDate={scheduledDate} setScheduledDate={setScheduledDate}
            uploads={uploads}
            onAddFiles={handleAddFiles}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Conclusion
            title={title} caption={caption} uploads={uploads}
            platforms={platforms} scheduledDate={scheduledDate}
            onAction={handleAction} saving={saving} approvalUrl={approvalUrl}
          />
        )}
      </div>
    </div>
  );
}
