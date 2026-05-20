'use client';
/**
 * app/colab/invite/[token]/page.tsx
 * 
 * Página pública de aceite do convite AHA Social Colab.
 * Layout: banner à esquerda | formulário + textos à direita
 * Design: glassmorphism · azul/roxo/lilás · Apple-like
 */

import { useEffect, useState }  from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image                    from 'next/image';
import { validateInviteToken }  from '@/lib/colab/useColabSession';
import { acceptColabInvite }    from '@/lib/colab/firestore';
import type { ColabInvite }     from '@/lib/colab/types';

/* ── Feature pills ───────────────────────────────────────────── */
const FEATURES = [
  { icon: '📅', title: 'Calendário em tempo real',   desc: 'Acompanhe cada conteúdo mês a mês, semana a semana.'         },
  { icon: '✅', title: 'Aprovação sem fricção',       desc: 'Aprove, solicite revisões e comente diretamente no post.'    },
  { icon: '📊', title: 'Visibilidade do processo',   desc: 'Veja o status de cada peça: rascunho, revisão, publicado.'   },
  { icon: '⭐', title: 'Avalie e colabore',           desc: 'Dê feedback em temas, artes e estratégia com 1 clique.'     },
];

/* ── Stat chips ──────────────────────────────────────────────── */
const STATS = [
  { value: '100%',  label: 'Visibilidade'   },
  { value: 'Real',  label: 'Time tracking'  },
  { value: 'Zero',  label: 'Burocracia'     },
];

export default function ColabInvitePage() {
  const params   = useParams<{ token: string }>();
  const router   = useRouter();

  const [invite,   setInvite]   = useState<ColabInvite | null>(null);
  const [step,     setStep]     = useState<'loading' | 'invite' | 'form' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (!params?.token) { setStep('error'); setErrorMsg('Link inválido.'); return; }
    validateInviteToken(params.token).then(({ valid, invite: inv, reason }) => {
      if (!valid) {
        setStep('error');
        setErrorMsg(reason === 'expired' ? 'Este convite expirou.' : 'Convite não encontrado.');
        return;
      }
      setInvite(inv!);
      if (inv!.status === 'accepted') {
        // Já aceito — redireciona direto para o colab
        router.push(`/colab?adminUid=${inv!.adminUid}`);
        return;
      }
      setEmail(inv!.clientEmail || '');
      setName(inv!.clientName  || '');
      setStep('invite');
    });
  }, [params?.token, router]);

  const handleAccept = async () => {
    if (!invite || !name.trim() || !email.trim()) return;
    setSaving(true);
    try {
      await acceptColabInvite(invite.id, email.trim());
      // Salva sessão local
      const session = {
        inviteId:    invite.id,
        adminUid:    invite.adminUid,
        adminEmail:  invite.adminEmail,
        agencyName:  invite.agencyName,
        clientEmail: email.trim(),
        clientName:  name.trim(),
        acceptedAt:  new Date().toISOString(),
      };
      localStorage.setItem('aha_colab_session', JSON.stringify(session));
      setStep('success');
      setTimeout(() => router.push(`/colab?adminUid=${invite.adminUid}`), 2200);
    } catch (_e) {
      setErrorMsg('Erro ao aceitar convite. Tente novamente.');
      setStep('error');
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="colab-root" style={{ minHeight: '100vh', fontFamily: 'var(--font-body)' }}>
      {/* Full-screen layout split */}
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── LEFT BANNER ─────────────────────────────────────── */}
        <div style={{
          flex: '0 0 42%',
          background: 'linear-gradient(145deg, #0D0A2E 0%, #1A0C45 30%, #0C1A50 60%, #050518 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '48px 40px',
        }} className="colab-mesh">
          {/* Orbs */}
          <div style={{
            position:'absolute', width:380, height:380,
            top:-80, left:-80,
            background: 'radial-gradient(ellipse, rgba(124,58,237,0.30) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>
          <div style={{
            position:'absolute', width:300, height:300,
            bottom:60, right:-60,
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}/>

          {/* Logo */}
          <div style={{ position:'relative', zIndex:1, marginBottom:48 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:36, height:36, borderRadius:10,
                background: 'var(--grad-btn)',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, boxShadow:'0 4px 16px rgba(124,58,237,0.5)',
              }}>✦</div>
              <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#fff', letterSpacing:'-0.02em' }}>
                AHA Social<span style={{ color:'var(--colab-lilac)' }}> Colab</span>
              </span>
            </div>
          </div>

          {/* Main copy */}
          <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
            <p style={{ fontSize:12, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--colab-lilac)', fontWeight:600, marginBottom:14 }}>
              Plataforma de Colaboração
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 40,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              color: '#fff',
              marginBottom: 20,
            }}>
              Seu conteúdo.<br/>
              <span style={{
                background: 'linear-gradient(90deg, #A78BFA, #38BDF8)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>Sua visão.</span><br/>
              Em tempo real.
            </h1>
            <p style={{ fontSize:15, color:'rgba(241,240,255,0.65)', lineHeight:1.7, marginBottom:36, maxWidth:340 }}>
              Uma janela exclusiva para o processo criativo do seu social media — transparência total, colaboração sem ruídos.
            </p>

            {/* Stats */}
            <div style={{ display:'flex', gap:20, marginBottom:40 }}>
              {STATS.map((s) => (
                <div key={s.label} style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius:12, padding:'12px 16px', textAlign:'center', minWidth:72,
                }}>
                  <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#fff' }}>{s.value}</div>
                  <div style={{ fontSize:10, color:'rgba(241,240,255,0.5)', marginTop:2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Feature list */}
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {FEATURES.map((f) => (
                <div key={f.title} style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    background:'rgba(124,58,237,0.18)',
                    border:'1px solid rgba(124,58,237,0.25)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                  }}>{f.icon}</div>
                  <div>
                    <div style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:13, color:'#fff', marginBottom:2 }}>{f.title}</div>
                    <div style={{ fontSize:12, color:'rgba(241,240,255,0.5)', lineHeight:1.5 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom tag */}
          <div style={{ position:'relative', zIndex:1, marginTop:32 }}>
            <p style={{ fontSize:11, color:'rgba(241,240,255,0.3)', textAlign:'center' }}>
              Powered by AHA Social Planning · Seguro · Privado
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────── */}
        <div style={{
          flex: 1,
          background: 'linear-gradient(160deg, #08081F 0%, #0F0F2A 50%, #07071A 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 32px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle orb right panel */}
          <div style={{
            position:'absolute', width:400, height:400, top:'10%', right:'-10%',
            background:'radial-gradient(ellipse, rgba(79,70,229,0.12) 0%, transparent 70%)',
            pointerEvents:'none',
          }}/>

          <div style={{ width:'100%', maxWidth:440, position:'relative', zIndex:1 }}>

            {/* ─ Loading ─ */}
            {step === 'loading' && (
              <div style={{ textAlign:'center', color:'var(--colab-muted)' }}>
                <div style={{
                  width:48, height:48, margin:'0 auto 16px',
                  border:'3px solid rgba(124,58,237,0.2)',
                  borderTopColor:'var(--colab-violet)',
                  borderRadius:'50%',
                  animation:'spin 0.8s linear infinite',
                }}/>
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                <p style={{ fontSize:14 }}>Verificando convite…</p>
              </div>
            )}

            {/* ─ Error ─ */}
            {step === 'error' && (
              <div className="colab-fade-up" style={{ textAlign:'center' }}>
                <div style={{ fontSize:52, marginBottom:16 }}>🔒</div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:22, color:'#fff', marginBottom:8 }}>
                  Convite inválido
                </h2>
                <p style={{ color:'var(--colab-muted)', fontSize:14, lineHeight:1.6 }}>{errorMsg}</p>
                <p style={{ color:'var(--colab-subtle)', fontSize:12, marginTop:16 }}>
                  Entre em contato com seu social media para receber um novo link.
                </p>
              </div>
            )}

            {/* ─ Invite card ─ */}
            {step === 'invite' && invite && (
              <div className="colab-fade-up">
                {/* Greeting */}
                <div style={{ marginBottom:32 }}>
                  <div style={{
                    display:'inline-flex', alignItems:'center', gap:8,
                    background:'rgba(124,58,237,0.15)',
                    border:'1px solid rgba(124,58,237,0.25)',
                    borderRadius:99, padding:'4px 14px',
                    fontSize:12, color:'var(--colab-lilac)', fontWeight:600,
                    marginBottom:20,
                  }}>
                    ✉️ Convite recebido
                  </div>
                  <h2 style={{
                    fontFamily:'var(--font-display)', fontWeight:800,
                    fontSize:30, color:'#fff', lineHeight:1.15, letterSpacing:'-0.02em', marginBottom:10,
                  }}>
                    Seja bem-vindo,<br/>
                    <span style={{
                      background:'linear-gradient(90deg, #A78BFA, #60A5FA)',
                      WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
                    }}>
                      {invite.clientName || 'Colaborador'}!
                    </span>
                  </h2>
                  <p style={{ color:'var(--colab-muted)', fontSize:14, lineHeight:1.7, marginBottom:6 }}>
                    <strong style={{ color:'#fff' }}>{invite.agencyName}</strong> convidou você para participar do AHA Social Colab.
                  </p>
                  <p style={{ color:'var(--colab-subtle)', fontSize:13, lineHeight:1.6 }}>
                    Aqui você terá visibilidade total do seu calendário de conteúdo, podendo acompanhar cada etapa da criação, aprovar publicações e colaborar em tempo real.
                  </p>
                </div>

                {/* Invite meta card */}
                <div style={{
                  background:'rgba(255,255,255,0.04)',
                  border:'1px solid rgba(124,58,237,0.20)',
                  borderRadius:16, padding:'16px 20px', marginBottom:28,
                }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    {[
                      { label:'Agência',    value: invite.agencyName    },
                      { label:'Convite de', value: invite.adminEmail    },
                    ].map((r) => (
                      <div key={r.label}>
                        <div style={{ fontSize:10, color:'var(--colab-subtle)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:3 }}>{r.label}</div>
                        <div style={{ fontSize:13, color:'#fff', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Form */}
                <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:24 }}>
                  <div>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--colab-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
                      Seu nome completo
                    </label>
                    <input
                      className="colab-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Como quer ser chamado?"
                    />
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--colab-muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
                      Seu e-mail
                    </label>
                    <input
                      className="colab-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                {/* CTA */}
                <button
                  className="btn-colab"
                  style={{ width:'100%', fontSize:15, padding:'14px', justifyContent:'center' }}
                  disabled={saving || !name.trim() || !email.trim()}
                  onClick={handleAccept}
                >
                  {saving ? (
                    <>
                      <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }}/>
                      Entrando…
                    </>
                  ) : (
                    <>✦ Aceitar convite e acessar o Colab</>
                  )}
                </button>

                <p style={{ textAlign:'center', fontSize:11, color:'var(--colab-subtle)', marginTop:16, lineHeight:1.6 }}>
                  Ao aceitar, você terá acesso exclusivo ao calendário de conteúdo.
                  Nenhuma informação financeira ou estratégica será exibida.
                </p>
              </div>
            )}

            {/* ─ Success ─ */}
            {step === 'success' && (
              <div className="colab-fade-up" style={{ textAlign:'center' }}>
                <div style={{
                  width:80, height:80, margin:'0 auto 24px',
                  background:'linear-gradient(135deg, rgba(52,211,153,0.2), rgba(79,70,229,0.2))',
                  border:'2px solid rgba(52,211,153,0.4)',
                  borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:36,
                }}>✓</div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color:'#fff', marginBottom:8 }}>
                  Tudo certo!
                </h2>
                <p style={{ color:'var(--colab-muted)', fontSize:14, lineHeight:1.6, marginBottom:20 }}>
                  Convite aceito com sucesso. Preparando seu espaço…
                </p>
                <div style={{
                  height:4, borderRadius:99, background:'var(--colab-border)',
                  overflow:'hidden', maxWidth:200, margin:'0 auto',
                }}>
                  <div style={{
                    height:'100%', background:'var(--grad-btn)', borderRadius:99,
                    animation:'loadBar 2s ease forwards',
                  }}/>
                </div>
                <style>{`@keyframes loadBar { from { width:0 } to { width:100% } }`}</style>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
