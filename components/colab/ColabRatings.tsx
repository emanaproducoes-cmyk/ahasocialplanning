'use client';
import { useState, useEffect } from 'react';
import { getColabRatings, saveColabRating } from '@/lib/colab/firestore';

const RATING_CATEGORIES = [
  { id: 'themes',       label: 'Temas',          icon: '🎯', description: 'Relevância e criatividade dos temas', details: 'Avalia se os temas são relevantes para o seu público, alinhados ao momento de mercado e trabalhados com criatividade.' },
  { id: 'titles',       label: 'Títulos',         icon: '✍️', description: 'Clareza e impacto dos títulos', details: 'Avalia se os títulos são claros, atrativos e capazes de gerar curiosidade. Um bom título interrompe o scroll.' },
  { id: 'digital_arts', label: 'Artes Digitais',  icon: '🎨', description: 'Qualidade visual das artes', details: 'Avalia a qualidade gráfica: composição, paleta de cores, tipografia e identidade visual.' },
  { id: 'captions',     label: 'Legendas',        icon: '💬', description: 'Engajamento e qualidade das legendas', details: 'Avalia se as legendas têm tom de voz adequado, CTA clara e capacidade de gerar conversa.' },
  { id: 'hashtags',     label: 'Hashtags',        icon: '#️⃣', description: 'Relevância e alcance das hashtags', details: 'Avalia se as hashtags são estratégicas para maximizar o alcance orgânico.' },
  { id: 'strategy',     label: 'Estratégia',      icon: '📊', description: 'Coerência estratégica do planejamento', details: 'Avalia o equilíbrio entre conteúdo educativo, comercial e de relacionamento.' },
];

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${MONTHS[parseInt(m)-1]} de ${y}`;
}

function StarRow({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button"
          onClick={e => { e.stopPropagation(); !readonly && onChange?.(i); }}
          onMouseEnter={() => !readonly && setHovered(i)}
          onMouseLeave={() => !readonly && setHovered(0)}
          style={{ background: 'none', border: 'none', cursor: readonly ? 'default' : 'pointer', fontSize: 18, lineHeight: 1, padding: '2px', opacity: i <= display ? 1 : 0.18, transform: !readonly && i === display ? 'scale(1.28)' : 'scale(1)', transition: 'all 0.12s' }}>⭐</button>
      ))}
    </div>
  );
}

function ScoreDonut({ avg }: { avg: number }) {
  const r = 36, circ = 2 * Math.PI * r, dash = (avg / 5) * circ;
  const color = avg >= 4.5 ? '#059669' : avg >= 3.5 ? '#4F46E5' : avg >= 2.5 ? '#D97706' : '#DC2626';
  return (
    <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#E2E8F0" strokeWidth="8" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`} strokeDashoffset={circ / 4}
          style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{avg.toFixed(1)}</span>
        <span style={{ fontSize: 9, color: '#94A3B8', marginTop: 1 }}>/5.0</span>
      </div>
    </div>
  );
}

interface Props { adminUid: string }

export default function ColabRatings({ adminUid }: Props) {
  const monthKey = currentMonthKey();
  const [tab, setTab] = useState<'rate' | 'history'>('rate');
  const [ratings, setRatings] = useState<Record<string, number>>(() => Object.fromEntries(RATING_CATEGORIES.map(c => [c.id, 0])));
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getColabRatings(adminUid).then(data => {
      setHistory(data);
      const existing = data.find((r: any) => r.month === monthKey);
      if (existing) { setRatings(existing.ratings); setComment(existing.comment ?? ''); setSubmitted(true); }
    });
  }, [adminUid]);

  const avg = (() => { const vals = Object.values(ratings).filter(v => v > 0); return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : 0; })();
  const allFilled = RATING_CATEGORIES.every(c => ratings[c.id] > 0);

  const handleSubmit = async () => {
    if (!allFilled || saving) return;
    setSaving(true);
    try {
      await saveColabRating({ adminUid, clientEmail: '', clientName: '', month: monthKey, ratings, average: parseFloat(avg.toFixed(2)), comment: comment.trim(), submittedAt: new Date().toISOString() });
      setSubmitted(true);
      const data = await getColabRatings(adminUid);
      setHistory(data);
    } finally { setSaving(false); }
  };

  return (
    <div style={{ padding: '28px 24px', minHeight: '100%', background: '#F1F5F9' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 4px', letterSpacing: '-0.02em' }}>Avaliações & Feedback</h2>
        <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>Avalie a qualidade do trabalho — sua opinião melhora o nosso desempenho</p>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {(['rate', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: 10, border: tab === t ? 'none' : '1px solid #E2E8F0', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.15s', background: tab === t ? '#0F172A' : '#FFFFFF', color: tab === t ? '#FFFFFF' : '#64748B', boxShadow: tab === t ? '0 2px 8px rgba(15,23,42,0.2)' : 'none' }}>
            {t === 'rate' ? '⭐ Avaliar' : `📈 Histórico (${history.length})`}
          </button>
        ))}
      </div>

      {tab === 'rate' ? (
        <div style={{ display: 'grid', gridTemplateColumns: submitted ? '1fr 320px' : '1fr', gap: 20, alignItems: 'start' }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, boxShadow: '0 1px 3px rgba(15,23,42,0.08)', overflow: 'hidden' }}>
            {/* Month header */}
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid #F1F5F9' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Avaliação de</div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#0F172A', textTransform: 'capitalize' }}>{monthLabel(monthKey)}</div>
                {submitted && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 3 }}>✅ Avaliação enviada</div>}
              </div>
              {avg > 0 && <ScoreDonut avg={avg} />}
            </div>

            {/* Categories */}
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {RATING_CATEGORIES.map(cat => {
                const val = ratings[cat.id] ?? 0;
                const isOpen = expanded === cat.id;
                const barColor = val >= 4 ? '#10B981' : val >= 3 ? '#4F46E5' : val > 0 ? '#D97706' : 'transparent';
                return (
                  <div key={cat.id} onClick={() => setExpanded(isOpen ? null : cat.id)}
                    style={{ borderRadius: 10, overflow: 'hidden', border: `1px solid ${isOpen ? '#C7D2FE' : '#F1F5F9'}`, background: isOpen ? '#EEF2FF' : '#FAFAFA', cursor: 'pointer', transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                      <span style={{ fontSize: 16, flexShrink: 0, width: 28, textAlign: 'center' }}>{cat.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>{cat.label}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{cat.description}</div>
                        <div style={{ height: 3, background: '#E2E8F0', borderRadius: 2, overflow: 'hidden', marginTop: 5 }}>
                          <div style={{ height: '100%', borderRadius: 2, width: `${(val/5)*100}%`, background: barColor, transition: 'width 0.5s ease' }} />
                        </div>
                      </div>
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <StarRow value={val} onChange={v => !submitted && setRatings(r => ({...r, [cat.id]: v}))} readonly={submitted} />
                        <span style={{ color: '#CBD5E1', fontSize: 12, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ padding: '10px 14px 12px 54px', borderTop: '1px solid #F1F5F9', background: '#F8FAFC' }}>
                        <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.65, margin: 0 }}>{cat.details}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Comment */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Comentário geral (opcional)</div>
              <textarea value={comment} onChange={e => !submitted && setComment(e.target.value)} readOnly={submitted}
                placeholder="Compartilhe sua opinião geral sobre o trabalho deste mês…" rows={3}
                style={{ width: '100%', borderRadius: 10, border: '1px solid #E2E8F0', padding: '10px 14px', fontSize: 13, color: '#0F172A', background: '#F8FAFC', resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }} />
            </div>

            {/* Button */}
            {!submitted ? (
              <div style={{ padding: '0 20px 20px' }}>
                <button onClick={handleSubmit} disabled={!allFilled || saving}
                  style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: !allFilled || saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: !allFilled || saving ? '#E2E8F0' : 'linear-gradient(135deg, #4F46E5, #7C3AED)', color: !allFilled || saving ? '#94A3B8' : '#FFFFFF', boxShadow: !allFilled || saving ? 'none' : '0 4px 14px rgba(79,70,229,0.35)', transition: 'all 0.15s' }}>
                  {saving ? '...' : '⭐'} {saving ? 'Enviando...' : allFilled ? 'Enviar avaliação' : `Preencha todas as ${RATING_CATEGORIES.length} categorias`}
                </button>
              </div>
            ) : (
              <div style={{ margin: '0 20px 20px', padding: '14px', borderRadius: 12, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>🎉</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#059669' }}>Avaliação enviada!</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Obrigado pelo seu feedback.</div>
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          {submitted && (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '24px 20px', position: 'sticky', top: 80, boxShadow: '0 1px 3px rgba(15,23,42,0.08)' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <ScoreDonut avg={avg} />
                <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', marginTop: 12 }}>Média Geral</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{avg >= 4.5 ? '⭐ Excelente!' : avg >= 3.5 ? '👍 Bom trabalho' : avg >= 2.5 ? '👌 Regular' : '⚠️ Precisa melhorar'}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {RATING_CATEGORIES.map(cat => {
                  const val = ratings[cat.id] ?? 0;
                  return (
                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0 }}>{cat.icon}</span>
                      <span style={{ flex: 1, fontSize: 12, color: '#475569', fontWeight: 600 }}>{cat.label}</span>
                      <div style={{ display: 'flex', gap: 2 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 12, opacity: i <= val ? 1 : 0.15 }}>⭐</span>)}</div>
                    </div>
                  );
                })}
              </div>
              {comment && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Comentário</div>
                  <p style={{ color: '#64748B', fontSize: 12, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{comment}"</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {history.length === 0 ? (
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 16, padding: '48px 24px', textAlign: 'center', boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 6 }}>Sem histórico ainda</h3>
              <p style={{ color: '#64748B', fontSize: 13, margin: 0 }}>Envie sua primeira avaliação para ver o histórico aqui.</p>
            </div>
          ) : history.map((r: any) => <HistoryCard key={r.id} rating={r} />)}
        </div>
      )}
    </div>
  );
}

function HistoryCard({ rating }: { rating: any }) {
  const [open, setOpen] = useState(false);
  const avg = rating.average ?? 0;
  const color = avg >= 4.5 ? '#059669' : avg >= 3.5 ? '#4F46E5' : avg >= 2.5 ? '#D97706' : '#DC2626';
  const bg    = avg >= 4.5 ? '#ECFDF5' : avg >= 3.5 ? '#EEF2FF' : avg >= 2.5 ? '#FFFBEB' : '#FEF2F2';
  const border= avg >= 4.5 ? '#A7F3D0' : avg >= 3.5 ? '#C7D2FE' : avg >= 2.5 ? '#FDE68A' : '#FECACA';
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const label = (() => { try { const [y,m] = rating.month.split('-'); return `${MONTHS[parseInt(m)-1]} de ${y}`; } catch { return rating.month; } })();

  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', boxShadow: '0 1px 3px rgba(15,23,42,0.06)', transition: 'box-shadow 0.15s' }}>
      <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 900, color }}>{avg.toFixed(1)}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', textTransform: 'capitalize', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 11, color: '#94A3B8' }}>{rating.clientName || 'Cliente'}</div>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 13, opacity: i <= Math.round(avg) ? 1 : 0.15 }}>⭐</span>)}</div>
        <span style={{ color: '#CBD5E1', fontSize: 13, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', marginLeft: 4 }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '0 18px 16px', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {[{id:'themes',icon:'🎯',label:'Temas'},{id:'titles',icon:'✍️',label:'Títulos'},{id:'digital_arts',icon:'🎨',label:'Artes Digitais'},{id:'captions',icon:'💬',label:'Legendas'},{id:'hashtags',icon:'#️⃣',label:'Hashtags'},{id:'strategy',icon:'📊',label:'Estratégia'}].map(cat => {
              const val = rating.ratings?.[cat.id] ?? 0;
              return (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{cat.icon}</span>
                  <span style={{ flex: 1, fontSize: 12, color: '#475569', fontWeight: 500 }}>{cat.label}</span>
                  <div style={{ display: 'flex', gap: 1 }}>{[1,2,3,4,5].map(i => <span key={i} style={{ fontSize: 11, opacity: i <= val ? 1 : 0.15 }}>⭐</span>)}</div>
                </div>
              );
            })}
          </div>
          {rating.comment && (
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>"{rating.comment}"</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
