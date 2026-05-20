'use client';
import { useState } from 'react';
import { ColabRating } from '@/lib/colab/types';
import { saveColabRating } from '@/lib/colab/firestore';

const CRITERIA = [
  { key: 'themes', label: 'Temas' },
  { key: 'titles', label: 'Títulos' },
  { key: 'digitalArts', label: 'Artes Digitais' },
  { key: 'captions', label: 'Legendas' },
  { key: 'strategy', label: 'Estratégia' },
  { key: 'overall', label: 'Avaliação Geral' },
] as const;

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(124,111,255,0.08)' }}>
      <span style={{ fontSize: 13, color: '#f0eeff', minWidth: 130 }}>{label}</span>
      <div style={{ display: 'flex', gap: 6 }}>
        {[1,2,3,4,5].map(star => (
          <span key={star}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              fontSize: 22, cursor: 'pointer', transition: 'transform 0.1s',
              color: star <= (hover || value) ? '#f5c842' : 'rgba(255,255,255,0.15)',
              transform: star <= hover ? 'scale(1.2)' : 'scale(1)',
            }}>★</span>
        ))}
      </div>
      <span style={{ fontSize: 12, color: '#9b93c8', minWidth: 20, textAlign: 'right' }}>{value > 0 ? `${value}/5` : '—'}</span>
    </div>
  );
}

interface Props { adminUid: string; ratings: ColabRating[]; onSave: () => void; }

export default function ColabRatings({ adminUid, ratings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState({ themes: 0, titles: 0, digitalArts: 0, captions: 0, strategy: 0, overall: 0 });
  const [comment, setComment] = useState('');
  const month = new Date().toISOString().slice(0, 7);

  function setScore(key: string, val: number) {
    setScores(s => ({ ...s, [key]: val }));
  }

  const allFilled = Object.values(scores).every(v => v > 0);
  const avg = allFilled ? (Object.values(scores).reduce((a, b) => a + b, 0) / 6).toFixed(1) : null;

  async function handleSubmit() {
    if (!allFilled) return;
    setSaving(true);
    await saveColabRating({ adminUid, month, ...scores, comment });
    setSaving(false);
    setOpen(false);
    setScores({ themes: 0, titles: 0, digitalArts: 0, captions: 0, strategy: 0, overall: 0 });
    setComment('');
    onSave();
  }

  return (
    <div className="colab-card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ color: '#f0eeff', fontWeight: 600, fontSize: 16, margin: 0 }}>Avaliações</h3>
        <button className="colab-btn" style={{ padding: '6px 16px', fontSize: 12 }} onClick={() => setOpen(o => !o)}>
          {open ? 'Fechar' : '+ Nova Avaliação'}
        </button>
      </div>

      {open && (
        <div style={{ background: 'rgba(124,111,255,0.06)', borderRadius: 10, padding: '1.25rem', marginBottom: '1rem', border: '1px solid rgba(124,111,255,0.12)' }}>
          <p style={{ color: '#9b93c8', fontSize: 12, marginBottom: '1rem', marginTop: 0 }}>
            Avalie o trabalho deste mês — sua nota será enviada ao social media responsável.
          </p>
          {CRITERIA.map(c => (
            <StarRow key={c.key} label={c.label} value={(scores as any)[c.key]} onChange={v => setScore(c.key, v)} />
          ))}
          {allFilled && (
            <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem', borderTop: '1px solid rgba(124,111,255,0.12)', marginTop: 8 }}>
              <p style={{ color: '#9b93c8', fontSize: 12, margin: '0 0 4px' }}>Média geral</p>
              <p style={{ fontSize: 32, fontWeight: 700, color: '#f5c842', margin: 0 }}>{avg} <span style={{ fontSize: 18 }}>★</span></p>
            </div>
          )}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 11, color: '#9b93c8', display: 'block', marginBottom: 4 }}>Comentário (opcional)</label>
            <textarea className="colab-input" value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Deixe um comentário para o social media..." style={{ resize: 'vertical' }} />
          </div>
          <button className="colab-btn" onClick={handleSubmit} disabled={!allFilled || saving} style={{ marginTop: 12, opacity: allFilled ? 1 : 0.4 }}>
            {saving ? 'Enviando...' : 'Enviar Avaliação'}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {ratings.length === 0 && (
          <p style={{ color: '#9b93c8', fontSize: 13, textAlign: 'center', padding: '1rem' }}>Nenhuma avaliação registrada ainda.</p>
        )}
        {ratings.map(r => (
          <div key={r.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px', border: '1px solid rgba(124,111,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#f0eeff', fontWeight: 600, fontSize: 14 }}>{r.month}</span>
              <span style={{ color: '#f5c842', fontWeight: 700 }}>
                {((r.themes + r.titles + r.digitalArts + r.captions + r.strategy + r.overall) / 6).toFixed(1)} ★
              </span>
            </div>
            {r.comment && <p style={{ color: '#9b93c8', fontSize: 12, marginTop: 6, marginBottom: 0 }}>{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
