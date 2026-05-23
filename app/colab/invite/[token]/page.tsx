'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInviteByToken, acceptInvite } from '@/lib/colab/firestore';

const FEATURES = [
  { icon: '📅', title: 'Calendário em tempo real',  desc: 'Acompanhe cada conteúdo mês a mês, semana a semana.' },
  { icon: '✅', title: 'Aprovação sem fricção',      desc: 'Aprove, solicite revisões e comente diretamente.' },
  { icon: '📊', title: 'Visibilidade do processo',  desc: 'Veja o status de cada peça: rascunho, revisão, publicado.' },
  { icon: '⭐', title: 'Avalie e colabore',          desc: 'Dê feedback em temas, artes e estratégia.' },
];

const STATS = [
  { value: '100%', label: 'Visibilidade'  },
  { value: 'Real', label: 'Time tracking' },
  { value: 'Zero', label: 'Burocracia'    },
];

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params?.token as string;

  const [step, setStep]       = useState<'loading'|'invite'|'success'|'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!token) { setErrorMsg('Link inválido.'); setStep('error'); return; }
    getInviteByToken(token).then(inv => {
      if (!inv) { setErrorMsg('Convite não encontrado.'); setStep('error'); return; }
      const exp = inv.expiresAt?.toDate?.() ?? new Date(inv.expiresAt);
      if (exp < new Date()) { router.push('/colab/expired'); return; }
      if (inv.status === 'accepted') { 
        sessionStorage.setItem('aha_colab_session', JSON.stringify({ token, adminUid: inv.adminUid, agencyName: inv.agencyName, clientEmail: inv.clientEmail, clientName: inv.clientName, isActive: true }));
        router.push('/colab'); return; 
      }
      setAgencyName(inv.agencyName ?? '');
      setEmail(inv.clientEmail ?? '');
      setName(inv.clientName ?? '');
      setStep('invite');
    }).catch(() => { setErrorMsg('Erro ao carregar convite.'); setStep('error'); });
  }, [token]);

  const handleAccept = async () => {
    if (!name.trim() || !email.trim() || saving) return;
    setSaving(true);
    try {
      await acceptInvite(token);
      const inv = await getInviteByToken(token);
      sessionStorage.setItem('aha_colab_session', JSON.stringify({ token, adminUid: inv?.adminUid, agencyName: inv?.agencyName ?? agencyName, clientEmail: email.trim(), clientName: name.trim(), isActive: true }));
      setStep('success');
      setTimeout(() => router.push('/colab'), 2000);
    } catch { setErrorMsg('Erro ao aceitar convite.'); setStep('error'); }
    finally { setSaving(false); }
  };

  if (step === 'loading') return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(124,58,237,0.2)', borderTopColor:'#7C3AED', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (step === 'error') return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:380 }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
        <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:24, color:'#F8FAFC', marginBottom:10 }}>Ops!</h2>
        <p style={{ color:'#64748B', fontSize:15, marginBottom:28 }}>{errorMsg}</p>
        <button onClick={() => router.push('/')} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:10, color:'#F8FAFC', padding:'10px 24px', cursor:'pointer', fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:600, fontSize:13 }}>← Página inicial</button>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap')`}</style>
    </div>
  );

  if (step === 'success') return (
    <div style={{ minHeight:'100vh', background:'#0F172A', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ textAlign:'center', maxWidth:380 }}>
        <div style={{ fontSize:52, marginBottom:16 }}>🚀</div>
        <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:26, color:'#F8FAFC', marginBottom:10, letterSpacing:'-0.02em' }}>Bem-vindo, {name.split(' ')[0]}!</h2>
        <p style={{ color:'#64748B', fontSize:15, lineHeight:1.6 }}>Convite aceito! Redirecionando para o seu espaço…</p>
        <div style={{ marginTop:24 }}>
          <div style={{ width:32, height:32, border:'3px solid rgba(124,58,237,0.2)', borderTopColor:'#7C3AED', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} />
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&display=swap')`}</style>
    </div>
  );

  return (
    <div style={{ display:'flex', minHeight:'100vh', fontFamily:"'Inter',-apple-system,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.5s ease forwards}
        .colab-input{width:100%;border:1px solid #E2E8F0;border-radius:10px;padding:11px 14px;font-size:13px;color:#0F172A;background:#F8FAFC;outline:none;font-family:'Inter',sans-serif;transition:border-color 0.15s;box-sizing:border-box}
        .colab-input:focus{border-color:#4F46E5;background:#fff}
        .colab-input::placeholder{color:#94A3B8}
        .feat-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.09);border-radius:12px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start;transition:background 0.15s}
        .feat-card:hover{background:rgba(255,255,255,0.08)}
      `}</style>

      {/* ── LEFT BANNER ── */}
      <div style={{ flex:'0 0 44%', background:'linear-gradient(160deg,#0F172A 0%,#1E1B4B 55%,#0F172A 100%)', padding:'48px 40px', display:'flex', flexDirection:'column', justifyContent:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-80, right:-80, width:260, height:260, borderRadius:'50%', background:'rgba(124,58,237,0.1)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-60, width:200, height:200, borderRadius:'50%', background:'rgba(79,70,229,0.08)', pointerEvents:'none' }} />

        <div style={{ position:'relative', zIndex:1 }}>
          {/* Logo */}
          <div className="fade-up" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:36 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#4F46E5,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, boxShadow:'0 4px 14px rgba(124,58,237,0.45)' }}>⚡</div>
            <span style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:16, color:'#F8FAFC', letterSpacing:'-0.01em' }}>AHA Social Colab</span>
          </div>

          {/* Headline */}
          <h1 className="fade-up" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:'clamp(24px,2.6vw,34px)', color:'#F8FAFC', letterSpacing:'-0.03em', lineHeight:1.12, marginBottom:14 }}>
            Seu espaço de<br />
            <span style={{ background:'linear-gradient(90deg,#A78BFA,#38BDF8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>colaboração</span>
          </h1>
          <p className="fade-up" style={{ color:'#64748B', fontSize:14, lineHeight:1.65, marginBottom:32, maxWidth:320 }}>
            <strong style={{ color:'#A78BFA' }}>{agencyName}</strong> convida você para acompanhar e aprovar o planejamento de redes sociais em tempo real.
          </p>

          {/* Stats */}
          <div className="fade-up" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:32 }}>
            {STATS.map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'14px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:18, fontWeight:800, color:'#F8FAFC', marginBottom:3 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'#64748B', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feat-card">
                <span style={{ fontSize:18, flexShrink:0 }}>{f.icon}</span>
                <div>
                  <div style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:700, fontSize:13, color:'#F8FAFC', marginBottom:3 }}>{f.title}</div>
                  <div style={{ fontSize:12, color:'#64748B', lineHeight:1.55 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM ── */}
      <div style={{ flex:1, background:'#F8FAFC', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 32px' }}>
        <div className="fade-up" style={{ width:'100%', maxWidth:400 }}>
          <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:20, padding:'36px 32px', boxShadow:'0 4px 24px rgba(15,23,42,0.08)' }}>
            <div style={{ textAlign:'center', marginBottom:28 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🎉</div>
              <h2 style={{ fontFamily:"'Plus Jakarta Sans',sans-serif", fontWeight:800, fontSize:22, color:'#0F172A', letterSpacing:'-0.02em', marginBottom:8 }}>Você foi convidado!</h2>
              <p style={{ color:'#64748B', fontSize:13, lineHeight:1.6, margin:0 }}>
                <strong style={{ color:'#4F46E5' }}>{agencyName}</strong> convida você para o AHA Social Colab
              </p>
            </div>

            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:7, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Seu nome</div>
              <input className="colab-input" value={name} onChange={e => setName(e.target.value)} placeholder="Como você prefere ser chamado?" />
            </div>
            <div style={{ marginBottom:28 }}>
              <div style={{ fontSize:11, fontWeight:600, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:7, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Seu e-mail</div>
              <input className="colab-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>

            <button onClick={handleAccept} disabled={saving || !name.trim() || !email.trim()}
              style={{ width:'100%', padding:'13px', borderRadius:12, border:'none', cursor: saving || !name.trim() || !email.trim() ? 'not-allowed' : 'pointer', fontWeight:700, fontSize:14, display:'flex', alignItems:'center', justifyContent:'center', gap:8, background: saving || !name.trim() || !email.trim() ? '#E2E8F0' : 'linear-gradient(135deg,#4F46E5,#7C3AED)', color: saving || !name.trim() || !email.trim() ? '#94A3B8' : '#fff', boxShadow: saving || !name.trim() || !email.trim() ? 'none' : '0 4px 14px rgba(79,70,229,0.35)', transition:'all 0.15s', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
              {saving
                ? <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.8s linear infinite' }} />
                : '✅'}
              {saving ? 'Acessando…' : 'Aceitar convite e entrar'}
            </button>

            <div style={{ marginTop:16, textAlign:'center', fontSize:11, color:'#94A3B8' }}>
              🔒 Acesso seguro e protegido · Válido por 7 dias
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
