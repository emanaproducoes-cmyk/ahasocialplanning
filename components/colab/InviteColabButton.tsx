'use client';
import { useState } from 'react';
import { createColabInvite } from '@/lib/colab/firestore';

interface Props {
  adminUid: string;
  adminEmail: string;
  agencyName: string;
}

export function InviteColabButton({ adminUid, adminEmail, agencyName }: Props) {
  const [open, setOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');

  async function handleInvite() {
    if (!clientEmail) return;
    setLoading(true);
    const { token } = await createColabInvite({ adminUid, adminEmail, agencyName, clientEmail, clientName });
    const url = `${window.location.origin}/colab/invite/${token}`;
    setLink(url);
    setLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(link);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(124,111,255,0.3)',
        }}
      >
        <span>🔗</span> Convidar para Colab
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a1a4e 0%, #0d1b4b 40%, #1a0a3e 100%)',
            border: '1px solid rgba(124,111,255,0.25)',
            borderRadius: 16,
            padding: '2rem',
            width: '100%',
            maxWidth: 420,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 18, margin: 0 }}>Convidar para Colab</h3>
                <p style={{ color: '#9b93c8', fontSize: 12, margin: '4px 0 0' }}>O cliente terá acesso visual ao calendário</p>
              </div>
              <button onClick={() => { setOpen(false); setLink(''); setClientEmail(''); setClientName(''); }}
                style={{ background: 'none', border: 'none', color: '#9b93c8', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            {!link ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <input
                  placeholder="Nome do cliente (opcional)"
                  value={clientName}
                  onChange={e => setClientName(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(124,111,255,0.25)',
                    borderRadius: 8, color: '#f0eeff', padding: '10px 14px', fontSize: 14,
                    outline: 'none', width: '100%', boxSizing: 'border-box',
                  }}
                />
                <input
                  placeholder="E-mail do cliente *"
                  value={clientEmail}
                  onChange={e => setClientEmail(e.target.value)}
                  type="email"
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(124,111,255,0.25)',
                    borderRadius: 8, color: '#f0eeff', padding: '10px 14px', fontSize: 14,
                    outline: 'none', width: '100%', boxSizing: 'border-box',
                  }}
                />
                <button onClick={handleInvite} disabled={loading || !clientEmail}
                  style={{
                    background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '11px', fontSize: 14, fontWeight: 600,
                    cursor: clientEmail ? 'pointer' : 'not-allowed',
                    opacity: clientEmail ? 1 : 0.5, marginTop: 4,
                  }}>
                  {loading ? 'Gerando link...' : 'Gerar Link de Convite'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                  <span style={{ fontSize: 32 }}>✅</span>
                  <p style={{ color: '#b39dff', fontWeight: 600, margin: '8px 0 4px' }}>Link gerado com sucesso!</p>
                  <p style={{ color: '#9b93c8', fontSize: 12, margin: 0 }}>Válido por 7 dias</p>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(124,111,255,0.2)',
                  borderRadius: 8, padding: '10px 14px', fontSize: 12,
                  color: '#b39dff', wordBreak: 'break-all',
                }}>{link}</div>
                <button onClick={handleCopy}
                  style={{
                    background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '11px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                  📋 Copiar Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
