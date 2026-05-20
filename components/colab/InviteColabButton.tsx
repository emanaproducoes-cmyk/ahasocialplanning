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
  const [copied, setCopied] = useState(false);

  async function handleInvite() {
    if (!clientEmail) return;
    setLoading(true);
    const { token } = await createColabInvite({ adminUid, adminEmail, agencyName, clientEmail, clientName });
    const url = `${window.location.origin}/colab/invite/${token}`;
    setLink(url);
    try {
      await fetch('/api/colab/notify-rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: clientEmail, agencyName, inviteUrl: url, type: 'invite' }),
      });
    } catch {}
    setLoading(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
          color: '#fff', border: 'none', borderRadius: 8,
          padding: '8px 18px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <span>＋</span> Convidar para Colab
      </button>

      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#12122a', border: '1px solid rgba(124,111,255,0.2)',
            borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 420,
          }}>
            <h3 style={{ color: '#f0eeff', fontWeight: 700, fontSize: 18, margin: '0 0 0.5rem' }}>
              Convidar Cliente
            </h3>
            <p style={{ color: '#9b93c8', fontSize: 13, margin: '0 0 1.5rem' }}>
              O cliente receberá acesso ao calendário da {agencyName}.
            </p>

            {!link ? (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#9b93c8', display: 'block', marginBottom: 4 }}>Nome do cliente</label>
                  <input
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    placeholder="Nome completo"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(124,111,255,0.2)', borderRadius: 8,
                      color: '#f0eeff', padding: '10px 14px', fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 11, color: '#9b93c8', display: 'block', marginBottom: 4 }}>E-mail do cliente *</label>
                  <input
                    value={clientEmail}
                    onChange={e => setClientEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    type="email"
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(124,111,255,0.2)', borderRadius: 8,
                      color: '#f0eeff', padding: '10px 14px', fontSize: 14,
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={handleInvite}
                    disabled={!clientEmail || loading}
                    style={{
                      flex: 1, background: 'linear-gradient(135deg, #7c6fff, #4f8fff)',
                      color: '#fff', border: 'none', borderRadius: 8,
                      padding: '10px', fontSize: 14, fontWeight: 600,
                      cursor: clientEmail ? 'pointer' : 'not-allowed', opacity: clientEmail ? 1 : 0.5,
                    }}
                  >{loading ? 'Gerando...' : 'Gerar Convite'}</button>
                  <button
                    onClick={() => { setOpen(false); setClientEmail(''); setClientName(''); setLink(''); }}
                    style={{
                      background: 'rgba(255,255,255,0.05)', color: '#9b93c8',
                      border: '1px solid rgba(124,111,255,0.15)', borderRadius: 8,
                      padding: '10px 18px', fontSize: 14, cursor: 'pointer',
                    }}
                  >Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: 'rgba(124,111,255,0.1)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                  <p style={{ color: '#9b93c8', fontSize: 11, margin: '0 0 6px' }}>Link de convite gerado:</p>
                  <p style={{ color: '#b39dff', fontSize: 12, wordBreak: 'break-all', margin: 0 }}>{link}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={copyLink}
                    style={{
                      flex: 1, background: copied ? 'rgba(79,255,143,0.15)' : 'linear-gradient(135deg, #7c6fff, #4f8fff)',
                      color: copied ? '#4fff8f' : '#fff', border: 'none', borderRadius: 8,
                      padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >{copied ? '✓ Copiado!' : 'Copiar Link'}</button>
                  <button
                    onClick={() => { setOpen(false); setClientEmail(''); setClientName(''); setLink(''); }}
                    style={{
                      background: 'rgba(255,255,255,0.05)', color: '#9b93c8',
                      border: '1px solid rgba(124,111,255,0.15)', borderRadius: 8,
                      padding: '10px 18px', fontSize: 14, cursor: 'pointer',
                    }}
                  >Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
