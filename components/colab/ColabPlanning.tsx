'use client';
import { useState } from 'react';
import { ColabPlanning } from '@/lib/colab/types';
import { saveColabPlanning } from '@/lib/colab/firestore';

interface Props { adminUid: string; plannings: ColabPlanning[]; }

const PERIODS = ['semana','mes','trimestre','semestre'] as const;
const PERIOD_LABEL: Record<string, string> = {
  semana:'Semana', mes:'Mês', trimestre:'Trimestre', semestre:'Semestre'
};

export default function ColabPlanning({ adminUid, plannings }: Props) {
  const [active, setActive] = useState<string>('mes');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:'', themes:'', emphasis:'', startDate:'', endDate:'', notes:'' });

  const current = plannings.find(p => p.period === active);

  async function handleSave() {
    setSaving(true);
    await saveColabPlanning({
      adminUid, period: active as any,
      title: form.title,
      themes: form.themes.split(',').map(t => t.trim()).filter(Boolean),
      emphasis: form.emphasis,
      startDate: form.startDate,
      endDate: form.endDate,
      notes: form.notes,
    });
    setSaving(false);
    setEditing(false);
  }

  function startEdit() {
    setForm({
      title: current?.title ?? '',
      themes: current?.themes.join(', ') ?? '',
      emphasis: current?.emphasis ?? '',
      startDate: current?.startDate ?? '',
      endDate: current?.endDate ?? '',
      notes: current?.notes ?? '',
    });
    setEditing(true);
  }

  return (
    <div className="colab-card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1rem' }}>
        <h3 style={{ color:'#f0eeff', fontWeight:600, fontSize:16, margin:0 }}>Planejamento de Conteúdo</h3>
        <div style={{ display:'flex', gap:6 }}>
          {PERIODS.map(p => (
            <button key={p} onClick={() => { setActive(p); setEditing(false); }}
              style={{
                padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer', border:'none',
                background: active===p ? 'linear-gradient(135deg,#7c6fff,#4f8fff)' : 'rgba(255,255,255,0.06)',
                color: active===p ? '#fff' : '#9b93c8',
              }}>{PERIOD_LABEL[p]}</button>
          ))}
        </div>
      </div>

      {!editing ? (
        <div>
          {current ? (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'12px' }}>
                  <p style={{ fontSize:11, color:'#9b93c8', margin:'0 0 4px' }}>TÍTULO</p>
                  <p style={{ fontSize:14, color:'#f0eeff', margin:0 }}>{current.title || '—'}</p>
                </div>
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'12px' }}>
                  <p style={{ fontSize:11, color:'#9b93c8', margin:'0 0 4px' }}>ÊNFASE</p>
                  <p style={{ fontSize:14, color:'#f0eeff', margin:0 }}>{current.emphasis || '—'}</p>
                </div>
              </div>
              <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'12px' }}>
                <p style={{ fontSize:11, color:'#9b93c8', margin:'0 0 6px' }}>TEMAS</p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {current.themes.length > 0 ? current.themes.map((t,i) => (
                    <span key={i} style={{ background:'rgba(124,111,255,0.2)', color:'#b39dff', borderRadius:20, padding:'3px 10px', fontSize:12 }}>{t}</span>
                  )) : <span style={{ color:'#9b93c8', fontSize:13 }}>—</span>}
                </div>
              </div>
              {current.notes && (
                <div style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'12px' }}>
                  <p style={{ fontSize:11, color:'#9b93c8', margin:'0 0 4px' }}>NOTAS</p>
                  <p style={{ fontSize:13, color:'#c8c0f0', margin:0 }}>{current.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <p style={{ color:'#9b93c8', fontSize:14 }}>Nenhum planejamento para este período.</p>
          )}
          <button className="colab-btn" onClick={startEdit} style={{ marginTop:'1rem', padding:'8px 20px', fontSize:13 }}>
            {current ? 'Editar' : 'Criar Planejamento'}
          </button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input className="colab-input" placeholder="Título do planejamento" value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} />
          <input className="colab-input" placeholder="Temas (separados por vírgula)" value={form.themes} onChange={e => setForm(f=>({...f,themes:e.target.value}))} />
          <input className="colab-input" placeholder="Ênfase / foco principal" value={form.emphasis} onChange={e => setForm(f=>({...f,emphasis:e.target.value}))} />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <input className="colab-input" type="date" value={form.startDate} onChange={e => setForm(f=>({...f,startDate:e.target.value}))} />
            <input className="colab-input" type="date" value={form.endDate} onChange={e => setForm(f=>({...f,endDate:e.target.value}))} />
          </div>
          <textarea className="colab-input" placeholder="Notas adicionais..." rows={3} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} style={{ resize:'vertical' }} />
          <div style={{ display:'flex', gap:8 }}>
            <button className="colab-btn" onClick={handleSave} disabled={saving} style={{ padding:'8px 20px', fontSize:13 }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className="colab-btn-ghost" onClick={() => setEditing(false)} style={{ padding:'8px 20px', fontSize:13 }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
