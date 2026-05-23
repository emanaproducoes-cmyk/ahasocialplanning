'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { ColabSession, PlanningEntry, PlanningPeriod } from '@/lib/colab/types';

interface Props { session: ColabSession }

const TABS: { id: PlanningPeriod; label: string; icon: string }[] = [
  { id: 'day',      label: 'Dia',       icon: '📌' },
  { id: 'week',     label: 'Semana',    icon: '📆' },
  { id: 'month',    label: 'Mês',       icon: '🗓' },
  { id: 'quarter',  label: 'Trimestre', icon: '📊' },
  { id: 'semester', label: 'Semestre',  icon: '🗺️' },
];

const PERIOD_COLORS: Record<PlanningPeriod, { bg: string; text: string; border: string; dot: string }> = {
  day:      { bg: 'rgba(236,72,153,0.10)',  text: '#9D174D', border: 'rgba(219,39,119,0.22)',  dot: '#EC4899' },
  week:     { bg: 'rgba(14,165,233,0.10)',  text: '#0369A1', border: 'rgba(3,105,161,0.22)',  dot: '#0EA5E9' },
  month:    { bg: 'rgba(99,102,241,0.10)', text: '#3730A3', border: 'rgba(67,56,202,0.22)',  dot: '#6366F1' },
  quarter:  { bg: 'rgba(16,185,129,0.10)', text: '#047857', border: 'rgba(4,120,87,0.22)',   dot: '#10B981' },
  semester: { bg: 'rgba(217,119,6,0.10)',  text: '#92400E', border: 'rgba(180,83,9,0.22)',   dot: '#D97706' },
};

export default function ColabPlanning({ session }: Props) {
  const [entries, setEntries] = useState<PlanningEntry[]>([]);
  const [tab, setTab]         = useState<PlanningPeriod>('month');
  const [editing, setEditing] = useState<PlanningEntry | null | 'new'>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users', session.adminUid, 'planning'));
      const items: PlanningEntry[] = snap.docs.map(d => ({ id: d.id, ...d.data() } as PlanningEntry));
      // ordena por updatedAt desc
      items.sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
      setEntries(items);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (session?.adminUid && tab) reload(); }, [session.adminUid, tab]);

  const filtered = tab ? entries.filter(e => e.period === tab) : [];
  const col = PERIOD_COLORS[tab];

  const handleSave = async (e: PlanningEntry) => {
    if (e.id) {
      await updateDoc(doc(db, 'users', session.adminUid, 'planning', e.id), {
        period: e.period, periodLabel: e.periodLabel, theme: e.theme,
        emphasis: e.emphasis, notes: e.notes, updatedAt: new Date().toISOString(),
      });
    } else {
      await addDoc(collection(db, 'users', session.adminUid, 'planning'), {
        adminUid: session.adminUid, period: e.period, periodLabel: e.periodLabel,
        theme: e.theme, emphasis: e.emphasis, notes: e.notes,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
    setEditing(null);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este planejamento?')) return;
    await deleteDoc(doc(db, 'users', session.adminUid, 'planning', id));
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div style={{ padding: '24px 28px', minHeight: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 21, color: '#0F172A', letterSpacing: '-0.02em', marginBottom: 2 }}>
            Planejamento de Conteúdo
          </h2>
          <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>
            Estratégia organizada por período · {loading ? '…' : entries.length} entrada{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setEditing('new')} style={{
          padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
          fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
          background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
        }}>
          + Novo planejamento
        </button>
      </div>

      {/* Period tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => {
          const c = PERIOD_COLORS[t.id];
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: active ? c.bg : '#FFFFFF',
              color: active ? c.text : '#64748B',
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: active ? 700 : 500, fontSize: 13,
              outline: `1px solid ${active ? c.border : '#E2E8F0'}`,
              boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            }}>
              <span>{t.icon}</span>
              {t.label}
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 18, height: 18, borderRadius: '50%',
                background: active ? c.text : '#E2E8F0',
                color: active ? '#fff' : '#94A3B8',
                fontSize: 10, fontWeight: 800,
              }}>
                {entries.filter(e => e.period === t.id).length}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#64748B' }}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ borderRadius: 18, padding: 48, textAlign: 'center', background: '#FFFFFF', border: `1px solid ${col.border}` }}>
          <div style={{ fontSize: 38, marginBottom: 12 }}>{TABS.find(t => t.id === tab)?.icon}</div>
          <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 6 }}>
            Nenhum planejamento para {TABS.find(t => t.id === tab)?.label.toLowerCase()}
          </h3>
          <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Crie o primeiro planejamento para este período.</p>
          <button onClick={() => setEditing('new')} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
            fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
            background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
          }}>+ Criar planejamento</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map((e, i) => (
            <EntryCard key={e.id} entry={e} col={col} delay={i * 0.04}
              onEdit={() => setEditing(e)}
              onDelete={() => handleDelete(e.id)} />
          ))}
        </div>
      )}

      {editing !== null && (
        <EntryModal
          entry={editing === 'new' ? null : editing}
          adminUid={session.adminUid}
          currentPeriod={tab}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function EntryCard({ entry, col, delay, onEdit, onDelete }: {
  entry: PlanningEntry;
  col: { bg: string; text: string; border: string; dot: string };
  delay: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{
      borderRadius: 14, padding: '18px',
      background: '#FFFFFF', border: '1px solid #E2E8F0',
      borderLeft: `3px solid ${col.dot}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span style={{ padding: '3px 9px', borderRadius: 999, background: col.bg, color: col.text, fontSize: 11, fontWeight: 700, fontFamily: 'Plus Jakarta Sans, sans-serif', border: `1px solid ${col.border}` }}>
          {entry.periodLabel}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onEdit}
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '3px 8px', cursor: 'pointer', fontSize: 12, color: '#64748B', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = '#0F172A'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}>✏️</button>
          <button onClick={onDelete}
            style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 7, padding: '3px 8px', cursor: 'pointer', fontSize: 12, color: '#64748B', transition: 'all 0.12s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'; e.currentTarget.style.color = '#B91C1C'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}>🗑️</button>
        </div>
      </div>
      <h4 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 15, color: '#0F172A', marginBottom: 6, letterSpacing: '-0.01em' }}>
        {entry.theme}
      </h4>
      {entry.emphasis && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 13 }}>🎯</span>
          <span style={{ fontSize: 12, color: '#64748B' }}>{entry.emphasis}</span>
        </div>
      )}
      {entry.notes && (
        <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.55, margin: 0, borderTop: '1px solid #F1F5F9', paddingTop: 10, marginTop: 8 }}>
          {entry.notes}
        </p>
      )}
    </div>
  );
}

function EntryModal({ entry, adminUid, currentPeriod, onSave, onClose }: {
  entry: PlanningEntry | null; adminUid: string; currentPeriod: PlanningPeriod;
  onSave: (e: PlanningEntry) => void; onClose: () => void;
}) {
  const [period,      setPeriod]      = useState<PlanningPeriod>(entry?.period ?? currentPeriod);
  const [periodLabel, setPeriodLabel] = useState(entry?.periodLabel ?? '');
  const [theme,       setTheme]       = useState(entry?.theme ?? '');
  const [emphasis,    setEmphasis]    = useState(entry?.emphasis ?? '');
  const [notes,       setNotes]       = useState(entry?.notes ?? '');
  const [saving,      setSaving]      = useState(false);

  const handleSave = async () => {
    if (!theme.trim() || !periodLabel.trim()) return;
    setSaving(true);
    await onSave({
      id: entry?.id ?? '',
      adminUid,
      period, periodLabel: periodLabel.trim(), theme: theme.trim(),
      emphasis: emphasis.trim(), notes: notes.trim(),
      createdAt: entry?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setSaving(false);
  };

  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: '1px solid #E2E8F0', fontSize: 14, color: '#0F172A',
    background: '#F8FAFC', fontFamily: 'Inter, sans-serif',
    outline: 'none', boxSizing: 'border-box' as const,
  };

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 700, color: '#64748B',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    letterSpacing: '0.06em', textTransform: 'uppercase' as const, marginBottom: 6,
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ borderRadius: 20, width: '100%', maxWidth: 480, overflow: 'hidden', background: '#FFFFFF', boxShadow: '0 20px 60px rgba(0,0,0,0.22)' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 16, color: '#0F172A', margin: 0 }}>
            {entry ? 'Editar Planejamento' : 'Novo Planejamento'}
          </h3>
          <button onClick={onClose} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', color: '#64748B', width: 28, height: 28, borderRadius: '50%', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Período</label>
              <select value={period} onChange={e => setPeriod(e.target.value as PlanningPeriod)}
                style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
                {TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Label do período</label>
              <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="Ex: Janeiro 2026" style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tema principal *</label>
            <input value={theme} onChange={e => setTheme(e.target.value)} placeholder="Ex: Lançamento do produto X" style={inputStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Ênfase / CTA</label>
            <input value={emphasis} onChange={e => setEmphasis(e.target.value)} placeholder="Ex: Engajamento e conversão" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Notas estratégicas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações, referências ou diretrizes…" rows={3}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600 }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving || !theme.trim() || !periodLabel.trim()} style={{
              padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 13,
              fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 700,
              background: saving || !theme.trim() || !periodLabel.trim() ? '#CBD5E1' : 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: '#fff',
            }}>
              {saving ? '…' : entry ? '✅ Salvar alterações' : '✅ Criar planejamento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
