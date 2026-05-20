'use client';
import { useState } from 'react';
import { ColabPlanning } from '@/lib/colab/types';
import { saveColabPlanning } from '@/lib/colab/firestore';

const PERIODS = [
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'semestre', label: 'Semestre' },
] as const;

interface Props {
  adminUid: string;
  plannings: ColabPlanning[];
  onSaved: () => void;
}

export default function ColabPlanning({ adminUid, plannings, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<ColabPlanning['period']>('mes');
  const [title, setTitle] = useState('');
  const [themes, setThemes] = useState('');
  const [emphasis, setEmphasis] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title || !startDate || !endDate) return;
    setSaving(true);
    await saveColabPlanning({
      adminUid, period, title,
      themes: themes.split(',').map(t => t.trim()).filter(Boolean),
      emphasis, startDate, endDate, notes,
    });
    setSaving(false);
    setOpen(false);
    setTitle(''); setThemes(''); setEmphasis(''); setNotes('');
    onSaved();
  }

  return (
    <div className="colab-card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ color: '#f0eeff', fontWeight: 600, fontSize: 16, margin: 0 }}>Planejamento de Conteúdo</h3>
        <button className="colab-btn" onClick={() => setOpen(o => !o)} style={{ padding: '7px 18px', fontSize: 13 }}>
          {open ? 'Fechar' : '+ Novo'}
        </button>
      </div>

      {open && (
        <div style={{ background: 'rgba(124,111,255,0.06)', borderRadius: 10, padding: '1.2rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                style={{
                  padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', border: 'none',
                  background: period === p.key ? 'linear-gradient(135deg,#7c6fff,#4f8fff)' : 'rgba(255,255,255,0.06)',
                  color: period === p.key ? '#fff' : '#9b93c8', fontWeight: period === p.key ? 600 : 400,
                }}>
                {p.label}
              </button>
            ))}
          </div>
          <input className="colab-input" placeholder="Título do planejamento" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="colab-input" placeholder="Temas (separados por vírgula)" value={themes} onChange={e => setThemes(e.target.value)} />
          <input className="colab-input" placeholder="Ênfase principal" value={emphasis} onChange={e => setEmphasis(e.target.value)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <input className="colab-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            <input className="colab-input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <textarea className="colab-input" placeholder="Observações" value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          <button className="colab-btn" onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-end' }}>
            {saving ? 'Salvando...' : 'Salvar Planejamento'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plannings.length === 0 && (
          <p style={{ color: '#9b93c8', fontSize: 13, textAlign: 'center', padding: '1rem 0' }}>Nenhum planejamento criado ainda.</p>
        )}
        {plannings.map(p => (
          <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '0.8rem 1rem', border: '1px solid rgba(124,111,255,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(124,111,255,0.18)', color: '#b39dff', fontWeight: 600 }}>{p.period}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#f0eeff' }}>{p.title}</span>
            </div>
            {p.themes.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                {p.themes.map((t, i) => (
                  <span key={i} style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, background: 'rgba(79,143,255,0.15)', color: '#6fcfff' }}>{t}</span>
                ))}
              </div>
            )}
            {p.emphasis && <p style={{ fontSize: 12, color: '#9b93c8', margin: '4px 0 0' }}>{p.emphasis}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
