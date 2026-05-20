'use client';
/**
 * components/colab/ColabPlanning.tsx
 * 
 * Planejamento de Conteúdo — visão do cliente.
 * Tabs: Semana | Mês | Trimestre | Semestre
 * Cada card tem título, tema, ênfase, notas — editáveis pelo admin.
 * Cliente vê o conteúdo carregado.
 */

import { useState, useEffect }  from 'react';
import { listPlanningEntries, savePlanningEntry, deletePlanningEntry } from '@/lib/colab/firestore';
import type { ColabSession, PlanningEntry, PlanningPeriod }           from '@/lib/colab/types';

const PERIOD_TABS: { id: PlanningPeriod; label: string; icon: string; desc: string }[] = [
  { id: 'week',     label: 'Semana',    icon: '📆', desc: 'Planejamento semana a semana'   },
  { id: 'month',    label: 'Mês',       icon: '🗓', desc: 'Visão mensal de conteúdo'       },
  { id: 'quarter',  label: 'Trimestre', icon: '📊', desc: 'Estratégia trimestral'          },
  { id: 'semester', label: 'Semestre',  icon: '🗺️', desc: 'Visão semestral e macro'       },
];

// ── Entry Modal ───────────────────────────────────────────────────────────────
function EntryModal({
  entry, adminUid, onSave, onClose,
}: {
  entry?: PlanningEntry | null;
  adminUid: string;
  onSave: (e: PlanningEntry) => void;
  onClose: () => void;
}) {
  const [period,      setPeriod]      = useState<PlanningPeriod>(entry?.period ?? 'month');
  const [periodLabel, setPeriodLabel] = useState(entry?.periodLabel ?? '');
  const [theme,       setTheme]       = useState(entry?.theme       ?? '');
  const [emphasis,    setEmphasis]    = useState(entry?.emphasis    ?? '');
  const [notes,       setNotes]       = useState(entry?.notes       ?? '');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!theme.trim() || !periodLabel.trim()) return;
    setSaving(true);
    try {
      const id = await savePlanningEntry({
        id:         entry?.id,
        adminUid,
        period,
        periodLabel: periodLabel.trim(),
        theme:       theme.trim(),
        emphasis:    emphasis.trim(),
        notes:       notes.trim(),
      });
      onSave({
        id,
        adminUid,
        period,
        periodLabel: periodLabel.trim(),
        theme:       theme.trim(),
        emphasis:    emphasis.trim(),
        notes:       notes.trim(),
        createdAt:   entry?.createdAt ?? new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      });
    } finally { setSaving(false); }
  };

  return (
    <div className="colab-modal-overlay" onClick={(e) => { if(e.target===e.currentTarget) onClose(); }}>
      <div className="glass colab-modal colab-fade-up" style={{ borderRadius:24 }}>
        <div style={{ padding:'20px 22px 14px', borderBottom:'1px solid var(--colab-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', margin:0 }}>
            {entry ? 'Editar Planejamento' : 'Novo Planejamento'}
          </h3>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--colab-muted)', fontSize:20 }}>✕</button>
        </div>
        <div className="colab-scroll" style={{ padding:22, overflowY:'auto', maxHeight:'calc(90vh - 80px)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Period type */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--colab-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
                Tipo de período
              </label>
              <div className="colab-tabs">
                {PERIOD_TABS.map((t) => (
                  <button key={t.id} className={`colab-tab${period===t.id?' active':''}`} onClick={() => setPeriod(t.id)}>
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--colab-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
                Período (ex: "Semana 3 - Janeiro 2026")
              </label>
              <input className="colab-input" value={periodLabel} onChange={(e) => setPeriodLabel(e.target.value)} placeholder="Identifique o período" />
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--colab-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
                Tema Principal
              </label>
              <input className="colab-input" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Ex: Lançamento de produto, Verão 2026…" />
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--colab-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
                Ênfase / Objetivo
              </label>
              <input className="colab-input" value={emphasis} onChange={(e) => setEmphasis(e.target.value)} placeholder="Ex: Aumentar engajamento, converter leads…" />
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--colab-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
                Notas & Observações
              </label>
              <textarea className="colab-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalhes, referências, datas importantes…" style={{ height:100, resize:'none' }}/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, paddingTop:4 }}>
              <button className="btn-colab-ghost" onClick={onClose} style={{ justifyContent:'center' }}>Cancelar</button>
              <button className="btn-colab" onClick={handleSave} disabled={saving || !theme.trim() || !periodLabel.trim()} style={{ justifyContent:'center' }}>
                {saving ? '…' : entry ? '💾 Salvar' : '✦ Criar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PlanningCard ──────────────────────────────────────────────────────────────
function PlanningCard({ entry, onEdit, onDelete }: {
  entry: PlanningEntry; onEdit: () => void; onDelete: () => void;
}) {
  const period = PERIOD_TABS.find((p) => p.id === entry.period)!;

  return (
    <div className="glass glass-hover colab-fade-up" style={{ borderRadius:18, padding:'18px 20px' }}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          <div style={{
            width:36, height:36, borderRadius:10, flexShrink:0,
            background:'rgba(124,58,237,0.18)',
            border:'1px solid rgba(124,58,237,0.22)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:17,
          }}>{period?.icon}</div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:10, color:'var(--colab-subtle)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:2 }}>
              {period?.label}
            </div>
            <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {entry.periodLabel}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:4, flexShrink:0 }}>
          <button onClick={onEdit}
            style={{ background:'rgba(167,139,250,0.12)', border:'1px solid rgba(167,139,250,0.20)', color:'var(--colab-lilac)', borderRadius:8, padding:'5px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
            ✏️ Editar
          </button>
          <button onClick={onDelete}
            style={{ background:'rgba(248,113,113,0.10)', border:'1px solid rgba(248,113,113,0.18)', color:'#F87171', borderRadius:8, padding:'5px 10px', fontSize:11, cursor:'pointer', fontWeight:600 }}>
            🗑
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom: entry.notes ? 12 : 0 }}>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--colab-border)', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:'var(--colab-subtle)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:5 }}>🎯 TEMA</div>
          <div style={{ fontSize:13, color:'#fff', fontWeight:600 }}>{entry.theme}</div>
        </div>
        <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--colab-border)', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:'var(--colab-subtle)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:5 }}>📌 ÊNFASE</div>
          <div style={{ fontSize:13, color:'#fff', fontWeight:600 }}>{entry.emphasis || '—'}</div>
        </div>
      </div>

      {entry.notes && (
        <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid var(--colab-border)', borderRadius:10, padding:'10px 12px' }}>
          <div style={{ fontSize:9, color:'var(--colab-subtle)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:5 }}>📝 NOTAS</div>
          <p style={{ fontSize:12, color:'var(--colab-muted)', lineHeight:1.6, margin:0, whiteSpace:'pre-wrap' }}>{entry.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface ColabPlanningProps {
  session: ColabSession;
}

export function ColabPlanning({ session }: ColabPlanningProps) {
  const [activePeriod, setActivePeriod] = useState<PlanningPeriod>('month');
  const [entries,      setEntries]      = useState<PlanningEntry[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editEntry,    setEditEntry]    = useState<PlanningEntry | null>(null);

  useEffect(() => {
    listPlanningEntries(session.adminUid).then((list) => {
      setEntries(list);
      setLoading(false);
    });
  }, [session.adminUid]);

  const filtered = entries.filter((e) => e.period === activePeriod);

  const handleSave = (e: PlanningEntry) => {
    setEntries((prev) => {
      const idx = prev.findIndex((x) => x.id === e.id);
      if (idx >= 0) { const copy = [...prev]; copy[idx] = e; return copy; }
      return [e, ...prev];
    });
    setModalOpen(false);
    setEditEntry(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remover este planejamento?')) return;
    await deletePlanningEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div style={{ padding:'24px 20px', minHeight:'100%' }}>
      {/* Header */}
      <div className="colab-fade-up" style={{ marginBottom:24, display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
        <div>
          <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'#fff', letterSpacing:'-0.02em', marginBottom:4 }}>
            Planejamento 📋
          </h1>
          <p style={{ color:'var(--colab-muted)', fontSize:13 }}>
            Temas e estratégias de conteúdo por período
          </p>
        </div>
        <button
          className="btn-colab"
          onClick={() => { setEditEntry(null); setModalOpen(true); }}
          style={{ fontSize:13, padding:'10px 20px' }}
        >
          + Novo Planejamento
        </button>
      </div>

      {/* Period tabs */}
      <div className="colab-fade-up colab-fade-up-d1" style={{ marginBottom:20 }}>
        <div className="colab-tabs" style={{ maxWidth:440 }}>
          {PERIOD_TABS.map((t) => (
            <button key={t.id} className={`colab-tab${activePeriod===t.id?' active':''}`} onClick={() => setActivePeriod(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding:48, textAlign:'center', color:'var(--colab-muted)' }}>
          <div style={{ width:32, height:32, border:'3px solid rgba(124,58,237,0.2)', borderTopColor:'var(--colab-violet)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass colab-fade-up" style={{ borderRadius:20, padding:'48px 24px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:16 }}>📋</div>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'#fff', marginBottom:8 }}>
            Sem planejamento para {PERIOD_TABS.find(t=>t.id===activePeriod)?.label}
          </h3>
          <p style={{ color:'var(--colab-muted)', fontSize:13, lineHeight:1.6, maxWidth:320, margin:'0 auto 24px' }}>
            Adicione o primeiro planejamento para este período e fique alinhado com sua equipe.
          </p>
          <button className="btn-colab" onClick={() => { setEditEntry(null); setModalOpen(true); }}>
            + Criar planejamento
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:16 }}>
          {filtered.map((entry) => (
            <PlanningCard
              key={entry.id}
              entry={entry}
              onEdit={() => { setEditEntry(entry); setModalOpen(true); }}
              onDelete={() => handleDelete(entry.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <EntryModal
          entry={editEntry}
          adminUid={session.adminUid}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditEntry(null); }}
        />
      )}
    </div>
  );
}
