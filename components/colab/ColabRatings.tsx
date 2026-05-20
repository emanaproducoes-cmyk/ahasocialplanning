'use client';
/**
 * components/colab/ColabRatings.tsx
 * 
 * Gamificação — avaliação Likert (1–5 estrelas) do cliente.
 * Categorias: temas, títulos, artes, legendas, hashtags, estratégia, etc.
 * Ao submeter, calcula média e envia por e-mail ao social media.
 * Dados persistem no Firebase.
 */

import { useState, useEffect }  from 'react';
import { format }               from 'date-fns';
import { ptBR }                 from 'date-fns/locale';
import { saveColabRating, getColabRating, listAdminRatings } from '@/lib/colab/firestore';
import { RATING_CATEGORIES }    from '@/lib/colab/types';
import type { ColabSession, ColabRating, RatingCategory } from '@/lib/colab/types';

// ── StarRating ─────────────────────────────────────────────────────────────
function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  const STAR_LABELS = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];

  return (
    <div>
      <div className="colab-stars" style={{ marginBottom:4 }}>
        {[1,2,3,4,5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 26, lineHeight: 1, padding: '2px',
              filter: i <= display ? 'none' : 'grayscale(1) opacity(0.25)',
              transform: i === display ? 'scale(1.15)' : 'scale(1)',
              transition: 'all 0.1s',
            }}
          >
            ⭐
          </button>
        ))}
      </div>
      {display > 0 && (
        <div style={{ fontSize:11, color:'var(--colab-lilac)', fontWeight:600 }}>
          {STAR_LABELS[display]}
        </div>
      )}
    </div>
  );
}

// ── Average donut ──────────────────────────────────────────────────────────
function AverageDonut({ avg, max=5 }: { avg: number; max?: number }) {
  const pct   = avg / max;
  const r     = 42;
  const circ  = 2 * Math.PI * r;
  const dash  = pct * circ;

  const color = avg >= 4.5 ? '#34D399' : avg >= 3.5 ? '#60A5FA' : avg >= 2.5 ? '#FBD44B' : '#F87171';

  return (
    <div style={{ position:'relative', width:110, height:110 }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
        <circle
          cx="55" cy="55" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition:'stroke-dasharray 1s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position:'absolute', inset:0, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
      }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'#fff', lineHeight:1 }}>
          {avg.toFixed(1)}
        </div>
        <div style={{ fontSize:9, color:'var(--colab-subtle)', letterSpacing:'0.08em' }}>/ 5.0</div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
interface ColabRatingsProps {
  session: ColabSession;
}

type Step = 'start' | 'rating' | 'comment' | 'summary' | 'done';

export function ColabRatings({ session }: ColabRatingsProps) {
  const currentMonth    = format(new Date(), 'yyyy-MM');
  const currentMonthLabel = format(new Date(), 'MMMM yyyy', { locale: ptBR });

  const [step,         setStep]         = useState<Step>('start');
  const [ratings,      setRatings]      = useState<Partial<Record<RatingCategory, number>>>({});
  const [comment,      setComment]      = useState('');
  const [saving,       setSaving]       = useState(false);
  const [existing,     setExisting]     = useState<ColabRating | null>(null);
  const [history,      setHistory]      = useState<ColabRating[]>([]);
  const [loadingHist,  setLoadingHist]  = useState(true);
  const [catIndex,     setCatIndex]     = useState(0);

  useEffect(() => {
    // Load existing rating for this month
    getColabRating(session.adminUid, session.clientEmail, currentMonth).then((r) => {
      if (r) { setExisting(r); setRatings(r.ratings); setComment(r.comment); }
    });
    // Load history
    listAdminRatings(session.adminUid).then((list) => {
      setHistory(list.filter((r) => r.clientEmail === session.clientEmail));
      setLoadingHist(false);
    });
  }, [session.adminUid, session.clientEmail, currentMonth]);

  const completedCount = RATING_CATEGORIES.filter((c) => (ratings[c.id] ?? 0) > 0).length;
  const allRated       = completedCount === RATING_CATEGORIES.length;
  const avgRating      = allRated
    ? Object.values(ratings as Record<string, number>).reduce((a, b) => a + b, 0) / RATING_CATEGORIES.length
    : 0;

  const currentCat = RATING_CATEGORIES[catIndex];

  const handleSubmit = async () => {
    if (!allRated) return;
    setSaving(true);
    try {
      const payload: Omit<ColabRating, 'id'> = {
        adminUid:    session.adminUid,
        clientEmail: session.clientEmail,
        month:       currentMonth,
        ratings:     ratings as Record<RatingCategory, number>,
        comment:     comment.trim(),
        submittedAt: new Date().toISOString(),
      };
      await saveColabRating(payload);

      // Send notification email via API route
      await fetch('/api/colab/notify-rating', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          adminEmail:  session.adminEmail,
          clientName:  session.clientName,
          agencyName:  session.agencyName,
          month:       currentMonthLabel,
          average:     avgRating.toFixed(2),
          ratings:     payload.ratings,
          comment:     payload.comment,
        }),
      }).catch(() => { /* silent - email is non-critical */ });

      setExisting(payload as ColabRating);
      setStep('done');
    } finally { setSaving(false); }
  };

  const progressPct = (completedCount / RATING_CATEGORIES.length) * 100;

  return (
    <div style={{ padding:'24px 20px', minHeight:'100%' }}>
      {/* Header */}
      <div className="colab-fade-up" style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'#fff', letterSpacing:'-0.02em', marginBottom:4 }}>
          Avaliações ⭐
        </h1>
        <p style={{ color:'var(--colab-muted)', fontSize:13 }}>
          Sua opinião faz a diferença. Avalie o trabalho da sua equipe!
        </p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>
        {/* LEFT: Rating flow */}
        <div>
          {/* Current month card */}
          <div className="glass colab-fade-up" style={{ borderRadius:20, padding:'22px', marginBottom:20 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
              <div>
                <div style={{ fontSize:10, color:'var(--colab-subtle)', letterSpacing:'0.10em', textTransform:'uppercase', marginBottom:3 }}>Avaliação do mês</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', textTransform:'capitalize' }}>
                  {currentMonthLabel}
                </div>
              </div>
              {existing && (
                <span style={{
                  background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.25)',
                  color:'#34D399', fontSize:11, fontWeight:600, padding:'4px 12px', borderRadius:99,
                }}>
                  ✓ Já avaliado
                </span>
              )}
            </div>

            {/* Progress */}
            {step !== 'done' && !existing && (
              <div style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'var(--colab-muted)' }}>Progresso</span>
                  <span style={{ fontSize:11, color:'var(--colab-lilac)', fontWeight:600 }}>
                    {completedCount}/{RATING_CATEGORIES.length}
                  </span>
                </div>
                <div className="colab-progress-bar">
                  <div className="colab-progress-fill" style={{ width:`${progressPct}%` }}/>
                </div>
              </div>
            )}

            {/* Step: start */}
            {step === 'start' && !existing && (
              <div>
                <p style={{ fontSize:13, color:'var(--colab-muted)', lineHeight:1.6, marginBottom:20 }}>
                  Avalie o trabalho da sua equipe neste mês em {RATING_CATEGORIES.length} categorias diferentes. A média final será enviada ao seu social media! 🚀
                </p>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:20 }}>
                  {RATING_CATEGORIES.map((c) => (
                    <span key={c.id} style={{
                      display:'inline-flex', alignItems:'center', gap:4,
                      background:'rgba(255,255,255,0.05)', border:'1px solid var(--colab-border)',
                      borderRadius:99, padding:'4px 10px', fontSize:11, color:'var(--colab-muted)',
                    }}>
                      {c.icon} {c.label}
                    </span>
                  ))}
                </div>
                <button className="btn-colab" onClick={() => setStep('rating')} style={{ width:'100%', justifyContent:'center' }}>
                  ⭐ Começar avaliação
                </button>
              </div>
            )}

            {/* Step: rating (category-by-category) */}
            {step === 'rating' && (
              <div>
                {/* Category nav dots */}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:20 }}>
                  {RATING_CATEGORIES.map((c, i) => {
                    const rated = (ratings[c.id] ?? 0) > 0;
                    return (
                      <button key={c.id} onClick={() => setCatIndex(i)} style={{
                        width:24, height:24, borderRadius:'50%', border:'none', cursor:'pointer',
                        background: i === catIndex ? 'var(--grad-btn)' : rated ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)',
                        fontSize:9, color: i === catIndex ? '#fff' : rated ? 'var(--colab-lilac)' : 'var(--colab-subtle)',
                        fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
                        boxShadow: i === catIndex ? '0 2px 8px rgba(124,58,237,0.4)' : 'none',
                      }} title={c.label}>
                        {rated ? '✓' : i+1}
                      </button>
                    );
                  })}
                </div>

                {/* Current category */}
                <div className="colab-fade-up" style={{ marginBottom:20 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{
                      width:44, height:44, borderRadius:12, flexShrink:0,
                      background:'rgba(124,58,237,0.18)', border:'1px solid rgba(124,58,237,0.25)',
                      display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                    }}>{currentCat.icon}</div>
                    <div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#fff' }}>{currentCat.label}</div>
                      <div style={{ fontSize:12, color:'var(--colab-muted)' }}>{currentCat.description}</div>
                    </div>
                  </div>

                  <StarRating
                    value={ratings[currentCat.id] ?? 0}
                    onChange={(v) => setRatings((prev) => ({ ...prev, [currentCat.id]: v }))}
                  />
                </div>

                {/* Nav buttons */}
                <div style={{ display:'flex', gap:10, justifyContent:'space-between', marginTop:8 }}>
                  <button className="btn-colab-ghost" onClick={() => setCatIndex((i) => Math.max(0,i-1))} disabled={catIndex===0}>
                    ← Anterior
                  </button>
                  {catIndex < RATING_CATEGORIES.length - 1 ? (
                    <button className="btn-colab" onClick={() => setCatIndex((i) => i+1)} disabled={!(ratings[currentCat.id])}>
                      Próximo →
                    </button>
                  ) : (
                    <button className="btn-colab" onClick={() => setStep('comment')} disabled={!allRated}>
                      Continuar ✓
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Step: comment */}
            {step === 'comment' && (
              <div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:13, color:'#fff', fontWeight:600, marginBottom:4 }}>💬 Comentário adicional</div>
                  <p style={{ fontSize:12, color:'var(--colab-muted)', marginBottom:12, lineHeight:1.6 }}>
                    Tem alguma sugestão, elogio ou ponto de melhoria? Compartilhe!
                  </p>
                  <textarea
                    className="colab-input"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Opcional, mas muito apreciado…"
                    style={{ height:100, resize:'none', fontSize:13 }}
                  />
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn-colab-ghost" onClick={() => setStep('rating')} style={{ flex:1, justifyContent:'center' }}>← Voltar</button>
                  <button className="btn-colab" onClick={() => setStep('summary')} style={{ flex:1, justifyContent:'center' }}>Ver resumo →</button>
                </div>
              </div>
            )}

            {/* Step: summary */}
            {step === 'summary' && (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:20 }}>
                  <AverageDonut avg={avgRating} />
                  <div>
                    <div style={{ fontSize:12, color:'var(--colab-muted)', marginBottom:4 }}>Sua média geral</div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'#fff' }}>
                      {avgRating.toFixed(1)}
                      <span style={{ fontSize:14, color:'var(--colab-muted)', fontWeight:400 }}>/5</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--colab-lilac)', fontWeight:600, marginTop:3 }}>
                      {avgRating >= 4.5 ? '🏆 Excelente' : avgRating >= 3.5 ? '👍 Muito bom' : avgRating >= 2.5 ? '👌 Regular' : '⚠️ Precisa melhorar'}
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
                  {RATING_CATEGORIES.map((c) => {
                    const val = (ratings[c.id] ?? 0);
                    const pct = val / 5 * 100;
                    return (
                      <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:14, width:20 }}>{c.icon}</span>
                        <span style={{ fontSize:11, color:'var(--colab-muted)', width:90, flexShrink:0 }}>{c.label}</span>
                        <div style={{ flex:1, height:5, borderRadius:99, background:'rgba(255,255,255,0.06)' }}>
                          <div style={{ height:'100%', borderRadius:99, background:'var(--grad-btn)', width:`${pct}%`, transition:'width 0.5s' }}/>
                        </div>
                        <span style={{ fontSize:11, color:'var(--colab-lilac)', fontWeight:600, width:20, textAlign:'right' }}>{val}</span>
                      </div>
                    );
                  })}
                </div>

                {comment && (
                  <div style={{ background:'rgba(255,255,255,0.04)', border:'1px solid var(--colab-border)', borderRadius:10, padding:'10px 14px', marginBottom:16, fontSize:12, color:'var(--colab-muted)', lineHeight:1.6 }}>
                    "{comment}"
                  </div>
                )}

                <div style={{ display:'flex', gap:10 }}>
                  <button className="btn-colab-ghost" onClick={() => setStep('comment')} style={{ flex:1, justifyContent:'center' }}>← Editar</button>
                  <button className="btn-colab" onClick={handleSubmit} disabled={saving} style={{ flex:2, justifyContent:'center' }}>
                    {saving ? (
                      <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }}/>
                      Enviando…</>
                    ) : '🚀 Enviar avaliação'}
                  </button>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              </div>
            )}

            {/* Step: done */}
            {(step === 'done' || existing) && (
              <div style={{ textAlign:'center', padding:'12px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', marginBottom:6 }}>
                  Avaliação enviada!
                </h3>
                <p style={{ fontSize:12, color:'var(--colab-muted)', lineHeight:1.6, marginBottom:16 }}>
                  Obrigado pelo feedback! Seu social media receberá a nota média por e-mail.
                </p>
                {existing && (
                  <div style={{ display:'flex', justifyContent:'center' }}>
                    <AverageDonut avg={
                      Object.values(existing.ratings).reduce((a,b) => a+b, 0) / Object.values(existing.ratings).length
                    }/>
                  </div>
                )}
                {existing && step === 'done' && (
                  <button className="btn-colab-ghost" onClick={() => { setExisting(null); setRatings({}); setComment(''); setStep('start'); setCatIndex(0); }}
                    style={{ marginTop:16 }}>
                    Reavaliar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: History */}
        <div>
          <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', marginBottom:14 }}>
            📊 Histórico de avaliações
          </h2>
          {loadingHist ? (
            <div style={{ color:'var(--colab-muted)', fontSize:13, textAlign:'center', padding:'32px 0' }}>Carregando…</div>
          ) : history.length === 0 ? (
            <div className="glass" style={{ borderRadius:16, padding:'32px 20px', textAlign:'center' }}>
              <p style={{ color:'var(--colab-muted)', fontSize:13 }}>Nenhuma avaliação anterior ainda.</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {history.map((r) => {
                const avg = Object.values(r.ratings).reduce((a,b) => a+b, 0) / Object.values(r.ratings).length;
                return (
                  <div key={r.month} className="glass glass-hover colab-fade-up" style={{ borderRadius:16, padding:'16px 18px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:14, color:'#fff', textTransform:'capitalize' }}>
                        {format(new Date(r.month + '-01'), 'MMMM yyyy', { locale:ptBR })}
                      </div>
                      <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color: avg >= 4 ? '#34D399' : avg >= 3 ? '#60A5FA' : '#FBD44B' }}>
                        {avg.toFixed(1)}
                        <span style={{ fontSize:12, color:'var(--colab-muted)', fontWeight:400 }}>/5</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                      {RATING_CATEGORIES.map((c) => (
                        <div key={c.id} style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'4px 8px' }}>
                          <span style={{ fontSize:12 }}>{c.icon}</span>
                          <span style={{ fontSize:10, color:'var(--colab-muted)' }}>{c.label}</span>
                          <span style={{ fontSize:10, color:'var(--colab-lilac)', fontWeight:700 }}>{r.ratings[c.id]}</span>
                        </div>
                      ))}
                    </div>
                    {r.comment && (
                      <p style={{ fontSize:11, color:'var(--colab-subtle)', marginTop:10, fontStyle:'italic', lineHeight:1.5 }}>"{r.comment}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
