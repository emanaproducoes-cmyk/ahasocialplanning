'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInviteByToken, acceptInvite } from '@/lib/colab/firestore';
import { useColabSession } from '@/lib/colab/useColabSession';

export default function InvitePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();
  const { saveSession } = useColabSession();
  const [status, setStatus] = useState<'loading'|'ready'|'expired'|'accepting'>('loading');
  const [invite, setInvite] = useState<any>(null);

  useEffect(() => {
    if (!token) return;
    getInviteByToken(token).then(inv => {
      if (!inv || inv.status === 'expired') return setStatus('expired');
      const expires = inv.expiresAt?.toDate?.() ?? new Date(inv.expiresAt);
      if (expires < new Date()) return setStatus('expired');
      setInvite(inv);
      setStatus('ready');
    });
  }, [token]);

  async function handleAccept() {
    setStatus('accepting');
    await acceptInvite(token);
    saveSession({
      token,
      adminUid: invite.adminUid,
      agencyName: invite.agencyName,
      clientEmail: invite.clientEmail,
      clientName: invite.clientName,
      isActive: true,
    });
    router.push('/colab');
  }

  const bg = { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(135deg,#1a1a4e,#0d1b4b,#1a0a3e)' };

  if (status === 'loading') return (
    <div style={bg}><p style={{ color:'#9b93c8' }}>Verificando convite...</p></div>
  );

  if (status === 'expired') return (
    <div style={bg}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:64, marginBottom:16 }}>⏰</div>
        <h1 style={{ color:'#f0eeff', fontWeight:700, fontSize:24, margin:'0 0 12px' }}>Convite expirado</h1>
        <p style={{ color:'#9b93c8', fontSize:14 }}>Solicite um novo convite ao seu social media.</p>
      </div>
    </div>
  );

  return (
    <div style={bg}>
      <div style={{ maxWidth:440, width:'100%', padding:'2rem' }}>
        <div style={{ marginBottom:'2rem' }}>
          <div style={{
            width:48, height:48, borderRadius:'50%',
            background:'linear-gradient(135deg,#7c6fff,#4f8fff)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, fontWeight:700, color:'#fff', marginBottom:16,
          }}>A</div>
          <h1 style={{ color:'#f0eeff', fontWeight:700, fontSize:28, margin:'0 0 8px' }}>Seja bem-vindo!</h1>
          <p style={{ color:'#b39dff', fontSize:15, margin:'0 0 4px', fontWeight:500 }}>
            {invite?.agencyName} convidou você
          </p>
          <p style={{ color:'#9b93c8', fontSize:14, margin:0 }}>
            para o AHA Social Colab — seu espaço de acompanhamento de conteúdo.
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:'2rem' }}>
          {[
            { icon:'📅', text:'Visualize seu calendário de conteúdo mês a mês' },
            { icon:'📋', text:'Acompanhe o planejamento semanal e mensal' },
            { icon:'⭐', text:'Avalie os conteúdos e colabore com sua equipe' },
          ].map((item, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12,
              background:'rgba(124,111,255,0.08)',
              border:'1px solid rgba(124,111,255,0.15)',
              borderRadius:10, padding:'12px 16px',
            }}>
              <span style={{ fontSize:20 }}>{item.icon}</span>
              <p style={{ color:'#c8c0f0', fontSize:13, margin:0 }}>{item.text}</p>
            </div>
          ))}
        </div>

        <button onClick={handleAccept} disabled={status === 'accepting'} style={{
          width:'100%', padding:'14px', borderRadius:12, border:'none',
          background:'linear-gradient(135deg,#7c6fff,#4f8fff)',
          color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer',
        }}>
          {status === 'accepting' ? 'Entrando...' : 'Aceitar Convite →'}
        </button>
      </div>
    </div>
  );
}
