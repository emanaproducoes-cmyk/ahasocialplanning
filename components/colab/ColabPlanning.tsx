'use client';
import { useState } from 'react';
import { saveColabPlanning } from '@/lib/colab/firestore';
import { ColabPlanning as ColabPlanningType } from '@/lib/colab/types';

type Period = 'day' | 'week' | 'month' | 'quarter' | 'semester';

const TABS: { id: Period; label: string; icon: string }[] = [
  { id: 'day',      label: 'Dia',       icon: '📅' },
  { id: 'week',     label: 'Semana',    icon: '📆' },
  { id: 'month',    label: 'Mês',       icon: '🗓' },
  { id: 'quarter',  label: 'Trimestre', icon: '📊' },
  { id: 'semester', label: 'Semestre',  icon: '🗺️' },
];

const COLORS: Record<Period, { bg:string; text:string; border:string; dot:string }> = {
  day:      { bg:'rgba(236,72,153,0.10)',  text:'#9D174D', border:'rgba(157,23,77,0.22)',  dot:'#EC4899' },
  week:     { bg:'rgba(14,165,233,0.10)',  text:'#0369A1', border:'rgba(3,105,161,0.22)',  dot:'#0EA5E9' },
  month:    { bg:'rgba(99,102,241,0.10)',  text:'#3730A3', border:'rgba(67,56,202,0.22)',  dot:'#6366F1' },
  quarter:  { bg:'rgba(16,185,129,0.10)',  text:'#047857', border:'rgba(4,120,87,0.22)',   dot:'#10B981' },
  semester: { bg:'rgba(217,119,6,0.10)',   text:'#92400E', border:'rgba(180,83,9,0.22)',   dot:'#D97706' },
};

interface Props {
  adminUid: string;
  plannings: ColabPlanningType[];
}

function EntryModal({ entry, adminUid, currentPeriod, onSave, onClose }: {
  entry: ColabPlanningType | null; adminUid: string; currentPeriod: Period;
  onSave: (e: any) => void; onClose: () => void;
}) {
  const [period,      setPeriod]      = useState<Period>((entry?.period as Period) ?? currentPeriod);
  const [periodLabel, setPeriodLabel] = useState(entry?.periodLabel ?? '');
  const [theme,       setTheme]       = useState(entry?.theme ?? '');
  const [emphasis,    setEmphasis]    = useState(entry?.emphasis ?? '');
  const [notes,       setNotes]       = useState(entry?.notes ?? '');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!theme.trim() || !periodLabel.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: entry?.id ?? '', adminUid, period, periodLabel: periodLabel.trim(), theme: theme.trim(), emphasis: emphasis.trim(), notes: notes.trim() });
    } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = { width:'100%', border:'1px solid #E2E8F0', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#0F172A', background:'#F8FAFC', outline:'none', fontFamily:"'Inter',sans-serif", transition:'border-color 0.15s', boxSizing:'border-box' };
  const labelStyle: React.CSSProperties = { fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:7, display:'block', fontFamily:"'Plus Jakarta Sans',sans-serif" };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480, overflow:'hidden', boxShadow:'0 20px 60px rgba(15,23,42,0.2)' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:'#0F172A', margin:0 }}>
            {entry ? 'Editar Planejamento' : 'Novo Planejamento'}
          </h3>
          <button onClick={onClose} style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', color:'#64748B', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
        </div>
        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={labelStyle}>Período</label>
              <select value={period} onChange={e => setPeriod(e.target.value as Period)} style={{ ...inputStyle, appearance:'none', cursor:'pointer' }}>
                {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Label do período</label>
              <input style={inputStyle} value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="Ex: Janeiro 2026" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tema principal *</label>
            <input style={inputStyle} value={theme} onChange={e => setTheme(e.target.value)} placeholder="Ex: Lançamento do produto X" autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Ênfase / CTA</label>
            <input style={inputStyle} value={emphasis} onChange={e => setEmphasis(e.target.value)} placeholder="Ex: Engajamento e conversão" />
          </div>
          <div>
            <label style={labelStyle}>Notas estratégicas</label>
            <textarea style={{ ...inputStyle, resize:'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações, referências ou diretrizes…" rows={3} />
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', paddingTop:4 }}>
            <button onClick={onClose} style={{ padding:'9px 18px', borderRadius:10, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, color:'#64748B', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !theme.trim() || !periodLabel.trim()}
              style={{ padding:'9px 18px', borderRadius:10, border:'none', cursor: saving || !theme.trim() || !periodLabel.trim() ? 'not-allowed' : 'pointer', fontSize:13, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", background: saving || !theme.trim() || !periodLabel.trim() ? '#E2E8F0' : 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: saving || !theme.trim() || !periodLabel.trim() ? '#94A3B8' : '#fff', boxShadow: saving ? 'none' : '0 4px 12px rgba(79,70,229,0.3)', transition:'all 0.15s' }}>
              {saving ? '...' : entry ? '✅ Salvar' : '✅ Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ViewModal({ entry, col, onEdit, onClose }: {
  entry: ColabPlanningType;
  col: { bg:string; text:string; border:string; dot:string };
  onEdit: () => void; onClose: () => void;
}) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:460, overflow:'hidden', boxShadow:'0 20px 60px rgba(15,23,42,0.2)' }}>
        <div style={{ padding:'18px 22px 14px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <span style={{ padding:'3px 10px', borderRadius:999, background:col.bg, color:col.text, fontSize:11, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", border:`1px solid ${col.border}`, display:'inline-block', marginBottom:8 }}>{entry.periodLabel}</span>
            <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:17, color:'#0F172A', margin:0, letterSpacing:'-0.01em' }}>{entry.theme}</h3>
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0, marginLeft:12 }}>
            <button onClick={onEdit} style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', borderRadius:8, padding:'5px 10px', cursor:'pointer', fontSize:12, color:'#64748B', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, transition:'all 0.12s' }}
              onMouseEnter={e=>{e.currentTarget.style.background='#EEF2FF';e.currentTarget.style.color='#4F46E5'}}
              onMouseLeave={e=>{e.currentTarget.style.background='#F1F5F9';e.currentTarget.style.color='#64748B'}}>✏️ Editar</button>
            <button onClick={onClose} style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', color:'#64748B', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:15, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
          </div>
        </div>
        <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:16 }}>
          {entry.emphasis && (
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:10 }}>
              <span style={{ fontSize:16, flexShrink:0 }}>🎯</span>
              <div>
                <div style={{ fontSize:10, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Ênfase / CTA</div>
                <div style={{ fontSize:13, color:'#0F172A', fontWeight:600, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{entry.emphasis}</div>
              </div>
            </div>
          )}
          {entry.notes && (
            <div>
              <div style={{ fontSize:10, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Notas estratégicas</div>
              <p style={{ fontSize:13, color:'#475569', lineHeight:1.65, margin:0, fontFamily:"'Inter',sans-serif" }}>{entry.notes}</p>
            </div>
          )}
          {!entry.emphasis && !entry.notes && (
            <p style={{ color:'#94A3B8', fontSize:13, textAlign:'center', padding:'16px 0' }}>Nenhum detalhe adicional.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ColabPlanning({ adminUid, plannings: initialPlannings }: Props) {
  const [plannings, setPlannings] = useState<ColabPlanningType[]>(initialPlannings);
  const [tab,       setTab]       = useState<Period>('month');
  const [editing,   setEditing]   = useState<ColabPlanningType | null | 'new'>(null);
  const [viewing,   setViewing]   = useState<ColabPlanningType | null>(null);

  const filtered = plannings.filter(e => e.period === tab);
  const col = COLORS[tab];

  const handleSave = async (data: any) => {
    const id = await saveColabPlanning({ adminUid, period: data.period, periodLabel: data.periodLabel, theme: data.theme, emphasis: data.emphasis, notes: data.notes, startDate: new Date().toISOString().slice(0,10), endDate: new Date().toISOString().slice(0,10) });
    const updated = { ...data, id };
    setPlannings(prev => {
      const idx = prev.findIndex(p => p.id === data.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = updated; return n; }
      return [...prev, updated];
    });
    setEditing(null);
  };

  return (
    <div style={{ padding:'24px 28px', minHeight:'100%', fontFamily:"'Inter',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap')`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
        <div>
          <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:21, color:'#0F172A', letterSpacing:'-0.02em', marginBottom:3 }}>Planejamento de Conteúdo</h2>
          <p style={{ color:'#64748B', fontSize:13, margin:0 }}>Estratégia organizada por período · {plannings.length} entrada{plannings.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setEditing('new')}
          style={{ padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", boxShadow:'0 4px 12px rgba(79,70,229,0.3)', transition:'all 0.15s' }}>
          + Novo planejamento
        </button>
      </div>

      {/* Period tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:24, flexWrap:'wrap' }}>
        {TABS.map(t => {
          const c = COLORS[t.id];
          const active = tab === t.id;
          const count = plannings.filter(e => e.period === t.id).length;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'7px 16px', borderRadius:10, border:'none', cursor:'pointer', background: active ? c.bg : '#fff', color: active ? c.text : '#64748B', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight: active ? 700 : 500, fontSize:13, outline:`1px solid ${active ? c.border : '#E2E8F0'}`, transition:'all 0.15s', boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
              <span>{t.icon}</span>
              {t.label}
              <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:18, height:18, borderRadius:'50%', background: active ? c.text : '#E2E8F0', color: active ? '#fff' : '#64748B', fontSize:10, fontWeight:800 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ background:'#fff', border:`1px solid ${col.border}`, borderRadius:18, padding:48, textAlign:'center', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}>
          <div style={{ fontSize:38, marginBottom:12 }}>{TABS.find(t => t.id === tab)?.icon}</div>
          <h3 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:16, color:'#0F172A', marginBottom:6 }}>Nenhum planejamento para {TABS.find(t => t.id === tab)?.label.toLowerCase()}</h3>
          <p style={{ color:'#64748B', fontSize:13, marginBottom:20 }}>Crie o primeiro planejamento para este período.</p>
          <button onClick={() => setEditing('new')}
            style={{ padding:'9px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#4F46E5,#7C3AED)', color:'#fff', cursor:'pointer', fontSize:13, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            + Criar planejamento
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:14 }}>
          {filtered.map(e => (
            <div key={e.id} onClick={() => setViewing(e)}
              style={{ background:'#fff', borderRadius:14, padding:'18px', borderLeft:`3px solid ${col.dot}`, border:`1px solid #E2E8F0`, borderLeftWidth:3, borderLeftColor:col.dot, cursor:'pointer', transition:'all 0.15s', boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}
              onMouseEnter={e2=>{e2.currentTarget.style.boxShadow='0 4px 16px rgba(15,23,42,0.1)';e2.currentTarget.style.transform='translateY(-1px)'}}
              onMouseLeave={e2=>{e2.currentTarget.style.boxShadow='0 1px 3px rgba(15,23,42,0.06)';e2.currentTarget.style.transform='translateY(0)'}}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <span style={{ padding:'3px 9px', borderRadius:999, background:col.bg, color:col.text, fontSize:11, fontWeight:700, fontFamily:"'Plus Jakarta Sans',sans-serif", border:`1px solid ${col.border}` }}>{e.periodLabel}</span>
                <div style={{ display:'flex', gap:4 }} onClick={ev => ev.stopPropagation()}>
                  <button onClick={() => setEditing(e)}
                    style={{ background:'#F1F5F9', border:'1px solid #E2E8F0', borderRadius:7, padding:'3px 8px', cursor:'pointer', fontSize:12, color:'#64748B', transition:'all 0.12s' }}
                    onMouseEnter={e2=>{e2.currentTarget.style.background='#EEF2FF';e2.currentTarget.style.color='#4F46E5'}}
                    onMouseLeave={e2=>{e2.currentTarget.style.background='#F1F5F9';e2.currentTarget.style.color='#64748B'}}>✏️</button>
                </div>
              </div>
              <h4 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:15, color:'#0F172A', marginBottom:6, letterSpacing:'-0.01em' }}>{e.theme}</h4>
              {e.emphasis && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                  <span style={{ fontSize:13 }}>🎯</span>
                  <span style={{ fontSize:12, color:'#64748B', fontFamily:"'Inter',sans-serif" }}>{e.emphasis}</span>
                </div>
              )}
              {e.notes && (
                <p style={{ fontSize:12, color:'#64748B', lineHeight:1.55, margin:0, borderTop:'1px solid #F1F5F9', paddingTop:10, marginTop:8, fontFamily:"'Inter',sans-serif" }}>{e.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <EntryModal
          entry={editing === 'new' ? null : editing}
          adminUid={adminUid}
          currentPeriod={tab}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {viewing && (
        <ViewModal
          entry={viewing}
          col={col}
          onEdit={() => { setEditing(viewing); setViewing(null); }}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
