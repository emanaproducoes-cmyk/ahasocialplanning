'use client';
import { useState } from 'react';
import { saveColabRating } from '@/lib/colab/firestore';

interface Props { adminUid: string; }

const CRITERIA = [
  { key: 'themes', label: 'Temas' },
  { key: 'titles', label: 'Títulos' },
  { key: 'digitalArts', label: 'Artes Digitais' },
  { key: 'captions', label: 'Legendas' },
  { key: 'strategy', label: 'Estratégia' },
];

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(124,111,255,0.08)' }}>
      <span style={{ fontSize:14, color:'#c8c0f0' }}>{label}</span>
      <div style={{ display:'flex', gap:4 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} onClick={() => onChange(s)}
            onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}
            style={{ fontSize:24, cursor:'pointer', color: s <= (hover || value) ? '#f5c842' : 'rgba(255,255,255,0.15)', transition:'color 0.1s' }}>★</span>
        ))}
      </div>
    </div>
  );
}

export default function ColabRatings({ adminUid }: Props) {
  const [ratings, setRatings] = useState({ themes:0, titles:0, digitalArts:0, captions:0, strategy:0 });
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const overall = Object.values(ratings).reduce((a,b) => a+b, 0) / CRITERIA.length;

  async function handleSubmit() {
    if (Object.values(ratings).some(v => v === 0)) return;
    setSaving(true);
    const month = new Date().toISOString().slice(0,7);
    await saveColabRating({ adminUid, month, ...ratings, overall: Math.round(overall * 10) / 10, comment });
    setSaving(false);
    setDone(true);
  }

  if (done) return (
    <div className="colab-card" style={{ marginTop:'1.5rem', textAlign:'center', padding:'2rem' }}>
      <div style={{ fontSize:48, marginBottom:12 }}>⭐</div>
      <h3 style={{ color:'#f0eeff', fontWeight:600, margin:'0 0 8px' }}>Obrigado pela avaliação!</h3>
      <p style={{ color:'#9b93c8', fontSize:14, margin:0 }}>Sua nota <strong style={{ color:'#b39dff' }}>{overall.toFixed(1)}</strong> foi enviada ao social media.</p>
    </div>
  );

  return (
    <div className="colab-card" style={{ marginTop:'1.5rem' }}>
      <h3 style={{ color:'#f0eeff', fontWeight:600, fontSize:16, margin:'0 0 1rem' }}>Avaliação do Trabalho</h3>
      <div>
        {CRITERIA.map(c => (
          <StarRow key={c.key} label={c.label}
            value={ratings[c.key as keyof typeof ratings]}
            onChange={v => setRatings(r => ({ ...r, [c.key]: v }))} />
        ))}
      </div>
      <div style={{ margin:'1rem 0', padding:'12px', background:'rgba(245,200,66,0.08)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:13, color:'#9b93c8' }}>Média geral</span>
        <span style={{ fontSize:20, fontWeight:700, color:'#f5c842' }}>{overall > 0 ? overall.toFixed(1) : '—'} ★</span>
      </div>
      <textarea className="colab-input" placeholder="Comentário opcional..." rows={3}
        value={comment} onChange={e => setComment(e.target.value)}
        style={{ resize:'vertical', marginBottom:'1rem' }} />
      <button className="colab-btn" onClick={handleSubmit} disabled={saving || Object.values(ratings).some(v=>v===0)}
        style={{ width:'100%', padding:'12px', fontSize:14 }}>
        {saving ? 'Enviando...' : 'Enviar Avaliação'}
      </button>
    </div>
  );
}
