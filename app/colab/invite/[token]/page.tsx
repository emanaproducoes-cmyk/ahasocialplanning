'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getInviteByToken, acceptInvite } from '@/lib/colab/firestore';
import { useColabSession } from '@/lib/colab/useColabSession';
import type { ColabInvite } from '@/lib/colab/types';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { saveSession } = useColabSession();
  const [invite, setInvite] = useState<ColabInvite | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'invalid' | 'expired' | 'accepting'>('loading');

  useEffect(() => {
    async function load() {
      const inv = await getInviteByToken(token);
      if (!inv) { setStatus('invalid'); return; }
      if (inv.status === 'expired' || new Date(inv.expiresAt as any) < new Date()) {
        setStatus('expired'); return;
      }
      setInvite(inv);
      setStatus('ready');
    }
    load();
  }, [token]);

  async function handleAccept() {
    if (!invite) return;
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

  const base: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a4e 0%, #0d1b4b 40%, #1a0a3e 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, SF Pro Display, sans-serif',
    padding: '2rem',
  };

  if (status === 'loading') return (
    <div style={base}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(124,111,255,0.2)', borderTopColor: '#7c6fff', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
        <p style={{ color: '#9b93c8' }}>Verificando convite...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (status === 'invalid' || status === 'expired') return (
    <div style={base}>
      <div style={{ textAlign: 'center', maxWidth: 400, background: 'rgba(124,111,255,0.08)', border: '1px solid rgba(124,111,255,0.2)', borderRadius: 20, padding: '2.5rem', backdropFilter: 'blur(12px)' }}>
        <div style={{ fontSize: 48, marginBottom: '1rem' }}>{status === 'expired' ? '⏳' : '❌'}</div>
        <h2 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 20, margin: '0 0 0.75rem' }}>
          {status === 'expired' ? 'Convite Expirado' : 'Convite Inválido'}
        </h2>
        <p style={{ color: '#9b93c8', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          {status === 'expired' ? 'Este convite expirou. Solicite um novo ao social media responsável.' : 'Este link de convite não é válido ou já foi utilizado.'}
        </p>
      </div>
    </div>
  );

  return (
    <div style={{ ...base, padding: 0 }}>
      <div style={{ display: 'flex', width: '100%', minHeight: '100vh', flexWrap: 'wrap' }}>

        {/* Lado esquerdo — banner */}
        <div style={{
          flex: '1 1 420px', minHeight: 320,
          background: 'linear-gradient(160deg, #2a1a6e 0%, #1a0a4e 50%, #0d1b4b 100%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '3rem 2.5rem', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(124,111,255,0.12)' }} />
          <div style={{ position: 'absolute', bottom: -60, right: -60, width: 250, height: 250, borderRadius: '50%', background: 'rgba(79,143,255,0.1)' }} />

          <div style={{ position: 'relative', textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, margin: '0 auto 1.5rem',
              boxShadow: '0 0 40px rgba(124,111,255,0.4)',
            }}>✦</div>

            <h1 style={{ color: '#f0eeff', fontWeight: 800, fontSize: 32, margin: '0 0 0.5rem', lineHeight: 1.2 }}>
              AHA Social<br /><span style={{ color: '#b39dff' }}>Colab</span>
            </h1>
            <p style={{ color: '#9b93c8', fontSize: 14, margin: '0 0 2.5rem', lineHeight: 1.6 }}>
              Calendário colaborativo de conteúdo
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'left' }}>
              {[
                { icon: '📅', title: 'Calendário visual', desc: 'Acompanhe todos os conteúdos mês a mês' },
                { icon: '📋', title: 'Planejamento estratégico', desc: 'Temas, ênfases e períodos em um só lugar' },
                { icon: '⭐', title: 'Avalie o trabalho', desc: 'Dê feedback direto ao social media' },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 20, marginTop: 2 }}>{item.icon}</div>
                  <div>
                    <p style={{ color: '#f0eeff', fontWeight: 600, fontSize: 14, margin: '0 0 2px' }}>{item.title}</p>
                    <p style={{ color: '#9b93c8', fontSize: 12, margin: 0 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lado direito — aceitar convite */}
        <div style={{
          flex: '1 1 380px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '3rem 2.5rem',
        }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{
              background: 'rgba(124,111,255,0.08)',
              border: '1px solid rgba(124,111,255,0.2)',
              borderRadius: 20, padding: '2.5rem',
              backdropFilter: 'blur(12px)',
            }}>
              <p style={{ color: '#b39dff', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', margin: '0 0 0.5rem' }}>
                Convite recebido
              </p>
              <h2 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 24, margin: '0 0 0.5rem', lineHeight: 1.3 }}>
                Seja bem-vindo ao<br />AHA Social Colab ✦
              </h2>
              <p style={{ color: '#9b93c8', fontSize: 13, lineHeight: 1.7, margin: '0 0 1.5rem' }}>
                A equipe <strong style={{ color: '#b39dff' }}>{invite?.agencyName}</strong> convidou você para acompanhar de perto a criação dos seus conteúdos. Aqui você tem visão completa do calendário, planejamento e pode avaliar cada entrega.
              </p>

              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px', marginBottom: '1.5rem', border: '1px solid rgba(124,111,255,0.1)' }}>
                <p style={{ color: '#9b93c8', fontSize: 11, margin: '0 0 4px' }}>Acesso vinculado a</p>
                <p style={{ color: '#f0eeff', fontWeight: 600, fontSize: 14, margin: 0 }}>{invite?.clientEmail}</p>
              </div>

              <button
                onClick={handleAccept}
                disabled={status === 'accepting'}
                style={{
                  width: '100%',
                  background: status === 'accepting' ? 'rgba(124,111,255,0.4)' : 'linear-gradient(135deg, #7c6fff, #4f8fff)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  padding: '14px', fontSize: 15, fontWeight: 700,
                  cursor: status === 'accepting' ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s', letterSpacing: 0.3,
                }}
              >
                {status === 'accepting' ? 'Entrando...' : 'Aceitar Convite →'}
              </button>

              <p style={{ color: '#9b93c8', fontSize: 11, textAlign: 'center', marginTop: '1rem', marginBottom: 0, lineHeight: 1.6 }}>
                Ao aceitar, você terá acesso somente ao calendário desta agência. Seus dados estão seguros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
