'use client';

import { useState }           from 'react';
import { Modal }              from '@/components/ui/Modal';
import { showToast }          from '@/components/ui/Toast';
import { saveDoc }            from '@/lib/firebase/firestore';
import { serverTimestamp, Timestamp } from 'firebase/firestore';
import { cn }                 from '@/lib/utils/cn';
import type { Campaign, Platform, CampaignObjective } from '@/lib/types';

const TABS = ['Identidade', 'Período e Plataformas', 'Criativos', 'Orçamento'] as const;
type Tab   = typeof TABS[number];

const OBJECTIVES: { id: CampaignObjective; label: string; icon: string }[] = [
  { id: 'awareness',    label: 'Reconhecimento', icon: '👀' },
  { id: 'consideracao', label: 'Consideração',   icon: '🤔' },
  { id: 'conversao',    label: 'Conversão',      icon: '💰' },
  { id: 'engajamento',  label: 'Engajamento',    icon: '❤️' },
];

const PLATFORMS: { id: Platform; label: string; emoji: string }[] = [
  { id: 'instagram',       label: 'Instagram',          emoji: '📸' },
  { id: 'facebook',        label: 'Facebook',           emoji: '👍' },
  { id: 'youtube',         label: 'YouTube',            emoji: '▶️' },
  { id: 'tiktok',          label: 'TikTok',             emoji: '🎵' },
  { id: 'linkedin',        label: 'LinkedIn',           emoji: '💼' },
  { id: 'threads',         label: 'Threads',            emoji: '🧵' },
  { id: 'pinterest',       label: 'Pinterest',          emoji: '📌' },
  { id: 'google_business', label: 'Google Meu Negócio', emoji: '🏢' },
];

const PRESET_COLORS = [
  '#FF5C00','#FFB800','#7C3AED','#22C55E',
  '#3B82F6','#EF4444','#EC4899','#14B8A6',
];

interface CriarCampanhaModalProps {
  isOpen:  boolean;
  onClose: () => void;
  uid:     string;
}

export function CriarCampanhaModal({ isOpen, onClose, uid }: CriarCampanhaModalProps) {
  const [tab,        setTab]        = useState<Tab>('Identidade');
  const [saving,     setSaving]     = useState(false);

  // Form state
  const [name,       setName]       = useState('');
  const [desc,       setDesc]       = useState('');
  const [objective,  setObjective]  = useState<CampaignObjective>('awareness');
  const [color,      setColor]      = useState('#FF5C00');
  const [tags,       setTags]       = useState('');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [platforms,  setPlatforms]  = useState<Platform[]>([]);
  const [frequency,  setFrequency]  = useState(3);
  const [budget,     setBudget]     = useState('');
  const [cpc,        setCpc]        = useState('');
  const [cpm,        setCpm]        = useState('');
  const [ctr,        setCtr]        = useState('');
  const [cac,        setCac]        = useState('');

  const TAB_INDEX = TABS.indexOf(tab);

  const togglePlatform = (p: Platform) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const reset = () => {
    setTab('Identidade');
    setName(''); setDesc(''); setObjective('awareness'); setColor('#FF5C00');
    setTags(''); setStartDate(''); setEndDate(''); setPlatforms([]);
    setFrequency(3); setBudget(''); setCpc(''); setCpm(''); setCtr(''); setCac('');
  };

  const handleSave = async () => {
    if (!name.trim()) { showToast('Informe o nome da campanha.', 'warning'); return; }
    setSaving(true);
    try {
      const id = `campanha_${Date.now()}`;
      const data: Omit<Campaign, 'id'> = {
        name:             name.trim(),
        description:      desc,
        objective,
        color,
        tags:             tags.split(',').map((t) => t.trim()).filter(Boolean),
        startDate:        startDate ? Timestamp.fromDate(new Date(startDate)) : null,
        endDate:          endDate   ? Timestamp.fromDate(new Date(endDate))   : null,
        platforms,
        frequency,
        budget:           parseFloat(budget) || 0,
        budgetByPlatform: {},
        kpis: {
          cpc:  parseFloat(cpc)  || 0,
          cpm:  parseFloat(cpm)  || 0,
          ctr:  parseFloat(ctr)  || 0,
          cac:  parseFloat(cac)  || 0,
          roas: 0,
        },
        status:        'ativa',
        postsTotal:    0,
        postsApproved: 0,
        createdAt:     serverTimestamp() as Campaign['createdAt'],
        updatedAt:     serverTimestamp() as Campaign['updatedAt'],
      };
      await saveDoc(`users/${uid}/campanhas`, id, data);
      showToast('Campanha criada com sucesso! 🚀', 'success');
      reset();
      onClose();
    } catch {
      showToast('Erro ao criar campanha. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { reset(); onClose(); }}
      title="Nova Campanha"
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          {/* Tab navigation */}
          <div className="flex gap-1">
            {TABS.map((t, i) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  tab === t ? 'bg-[#FF5C00] w-4' : 'bg-gray-200'
                )}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {TAB_INDEX > 0 && (
              <button
                onClick={() => setTab(TABS[TAB_INDEX - 1]!)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                ← Voltar
              </button>
            )}
            {TAB_INDEX < TABS.length - 1 ? (
              <button
                onClick={() => setTab(TABS[TAB_INDEX + 1]!)}
                className="px-5 py-2 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Continuar →
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Criando...' : '✅ Criar Campanha'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* Tab pills */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              tab === t
                ? 'bg-[#FF5C00] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            <span className="w-4 h-4 rounded-full bg-current/20 flex items-center justify-center text-[10px] font-bold">
              {i + 1}
            </span>
            {t}
          </button>
        ))}
      </div>

      {/* Tab 1 — Identidade */}
      {tab === 'Identidade' && (
        <div className="space-y-4">
          <Field label="Nome da campanha *">
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Black Friday 2026"
              className="input-base" />
          </Field>

          <Field label="Descrição">
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Descreva os objetivos desta campanha..."
              rows={3} className="input-base resize-none" />
          </Field>

          <Field label="Objetivo">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {OBJECTIVES.map((obj) => (
                <button
                  key={obj.id}
                  onClick={() => setObjective(obj.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center',
                    objective === obj.id
                      ? 'border-[#FF5C00] bg-orange-50'
                      : 'border-gray-100 hover:border-gray-200'
                  )}
                >
                  <span className="text-2xl">{obj.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{obj.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Cor da campanha">
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
                    color === c ? 'border-gray-900 scale-110' : 'border-transparent'
                  )}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
                className="w-7 h-7 rounded-full cursor-pointer border-2 border-gray-200" />
            </div>
          </Field>

          <Field label="Tags (separadas por vírgula)">
            <input value={tags} onChange={(e) => setTags(e.target.value)}
              placeholder="lançamento, produto, q4"
              className="input-base" />
          </Field>
        </div>
      )}

      {/* Tab 2 — Período e Plataformas */}
      {tab === 'Período e Plataformas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data de início">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="input-base" />
            </Field>
            <Field label="Data de término">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="input-base" />
            </Field>
          </div>

          <Field label={`Plataformas (${platforms.length} selecionada(s))`}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-left',
                    platforms.includes(p.id)
                      ? 'border-[#FF5C00] bg-orange-50'
                      : 'border-gray-100 hover:border-gray-200'
                  )}
                >
                  <span>{p.emoji}</span>
                  <span className="text-xs font-medium text-gray-700 truncate">{p.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Frequência: ${frequency} posts/semana`}>
            <input
              type="range" min={1} max={14} value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="w-full accent-[#FF5C00]"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1/semana</span><span>14/semana</span>
            </div>
          </Field>
        </div>
      )}

      {/* Tab 3 — Criativos */}
      {tab === 'Criativos' && (
        <div className="space-y-4">
          <div className="border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center hover:border-[#FF5C00]/40 transition-colors cursor-pointer"
            onClick={() => document.getElementById('creative-upload')?.click()}>
            <span className="text-4xl">🎨</span>
            <p className="text-sm font-medium text-gray-600 mt-3">
              Arraste criativos ou <span className="text-[#FF5C00]">clique para selecionar</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, MP4 • Múltiplos arquivos</p>
            <input id="creative-upload" type="file" multiple accept="image/*,video/mp4" className="hidden" />
          </div>

          <button className="w-full py-3 text-sm font-medium text-[#FF5C00] border-2 border-[#FF5C00]/30 rounded-xl hover:bg-orange-50 transition-colors">
            📅 Auto-distribuir no calendário
          </button>

          <p className="text-xs text-gray-400 text-center">
            Os criativos serão distribuídos automaticamente no calendário conforme a frequência definida.
          </p>
        </div>
      )}

      {/* Tab 4 — Orçamento */}
      {tab === 'Orçamento' && (
        <div className="space-y-4">
          <Field label="Orçamento total (R$)">
            <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)}
              placeholder="0,00" className="input-base" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="CPC meta (R$)">
              <input type="number" value={cpc} onChange={(e) => setCpc(e.target.value)}
                placeholder="0,00" className="input-base" />
            </Field>
            <Field label="CPM meta (R$)">
              <input type="number" value={cpm} onChange={(e) => setCpm(e.target.value)}
                placeholder="0,00" className="input-base" />
            </Field>
            <Field label="CTR meta (%)">
              <input type="number" value={ctr} onChange={(e) => setCtr(e.target.value)}
                placeholder="0,00" className="input-base" />
            </Field>
            <Field label="CAC meta (R$)">
              <input type="number" value={cac} onChange={(e) => setCac(e.target.value)}
                placeholder="0,00" className="input-base" />
            </Field>
          </div>

          {platforms.length > 0 && budget && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">
                Sugestão de distribuição por plataforma
              </p>
              <div className="space-y-2">
                {platforms.map((p) => {
                  const pct   = Math.round(100 / platforms.length);
                  const value = (parseFloat(budget) * pct) / 100;
                  return (
                    <div key={p} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{p}</span>
                      <span className="font-medium text-gray-900">
                        R$ {value.toFixed(2)} ({pct}%)
                      </span>
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

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Tailwind input class (injected via style tag) ────────────────────────────
// Workaround: declare inline so TS doesn't complain about .input-base
const _inputStyle = `
  .input-base {
    width: 100%;
    padding: 10px 12px;
    font-size: 0.875rem;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    transition: border-color 0.15s, box-shadow 0.15s;
    outline: none;
  }
  .input-base:focus {
    border-color: #FF5C00;
    box-shadow: 0 0 0 3px rgba(255,92,0,0.15);
  }
`;
