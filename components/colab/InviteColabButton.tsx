'use client';
/**
 * components/colab/InviteColabButton.tsx
 * 
 * Botão "Convidar para AHA Social Colab" exibido na área de agendamentos
 * do Social Planning (visão do social media/admin).
 * Cria o convite no Firestore e exibe o link + opções de compartilhamento.
 */

import { useState, useEffect } from 'react';
import { createColabInvite, listAdminInvites, revokeColabInvite } from '@/lib/colab/firestore';
import type { ColabInvite } from '@/lib/colab/types';

interface InviteColabButtonProps {
  adminUid:   string;
  adminEmail: string;
  agencyName: string;
}

function copyText(text: string) {
  return navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
  });
}

function buildWhatsApp(url: string, agencyName: string) {
  const msg = encodeURIComponent(`Olá! Você foi convidado para acessar o AHA Social Colab da ${agencyName}. Clique para aceitar: ${url}`);
  return `https://wa.me/?text=${msg}`;
}

function buildMailto(url: string, agencyName: string) {
  const subj = encodeURIComponent(`Convite: AHA Social Colab — ${agencyName}`);
  const body = encodeURIComponent(`Olá,\n\nVocê foi convidado para acompanhar o calendário de conteúdo no AHA Social Colab.\n\nClique no link abaixo para aceitar o convite:\n${url}\n\nAté breve!`);
  return `mailto:?subject=${subj}&body=${body}`;
}

// ── Invite Form Modal ─────────────────────────────────────────────────────────
function CreateInviteModal({
  adminUid, adminEmail, agencyName,
  onCreated, onClose,
}: InviteColabButtonProps & { onCreated: (inv: ColabInvite & { url: string }) => void; onClose: () => void }) {
  const [clientName,  setClientName]  = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [creating,    setCreating]    = useState(false);

  const handleCreate = async () => {
    if (!clientName.trim() || !clientEmail.trim()) return;
    setCreating(true);
    try {
      const { inviteId, url } = await createColabInvite({
        adminUid, adminEmail, agencyName,
        clientName:  clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
      });
      onCreated({
        id: inviteId, adminUid, adminEmail, agencyName,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        status:    'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
        token:     '',
        url,
      } as ColabInvite & { url: string });
    } finally { setCreating(false); }
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(6,6,26,0.80)',
      backdropFilter:'blur(12px)', zIndex:200, display:'flex',
      alignItems:'center', justifyContent:'center', padding:16,
    }} onClick={(e) => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        width:'100%', maxWidth:400,
        background:'linear-gradient(135deg, rgba(15,12,40,0.98), rgba(10,8,30,0.99))',
        border:'1px solid rgba(124,58,237,0.25)',
        borderRadius:22, padding:28,
        boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'#fff', margin:0 }}>
              ✦ Convidar para o Colab
            </h3>
            <p style={{ fontSize:12, color:'rgba(241,240,255,0.45)', margin:'4px 0 0' }}>AHA Social Colab</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(241,240,255,0.4)', fontSize:20 }}>✕</button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:20 }}>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'rgba(241,240,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
              Nome do cliente
            </label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ex: João Silva"
              style={{
                width:'100%', background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.10)',
                borderRadius:10, color:'#fff', padding:'10px 14px',
                fontSize:14, outline:'none', fontFamily:'inherit',
              }}
            />
          </div>
          <div>
            <label style={{ display:'block', fontSize:11, fontWeight:600, color:'rgba(241,240,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
              E-mail do cliente
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="cliente@empresa.com"
              style={{
                width:'100%', background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.10)',
                borderRadius:10, color:'#fff', padding:'10px 14px',
                fontSize:14, outline:'none', fontFamily:'inherit',
              }}
            />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:10 }}>
          <button
            onClick={onClose}
            style={{
              background:'transparent', border:'1px solid rgba(167,139,250,0.30)',
              color:'#A78BFA', borderRadius:10, padding:'11px 0', fontSize:13, cursor:'pointer', fontWeight:500,
            }}
          >Cancelar</button>
          <button
            disabled={creating || !clientName.trim() || !clientEmail.trim()}
            onClick={handleCreate}
            style={{
              background:'linear-gradient(135deg,#4F46E5,#7C3AED,#9333EA)',
              border:'none', color:'#fff', borderRadius:10,
              padding:'11px 0', fontSize:13, fontWeight:600,
              cursor:'pointer', opacity: (creating || !clientName.trim() || !clientEmail.trim()) ? 0.5 : 1,
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              boxShadow:'0 4px 16px rgba(124,58,237,0.4)',
            }}
          >
            {creating ? (
              <><span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite', display:'inline-block' }}/>Criando…</>
            ) : '✦ Gerar convite'}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Invite Link Modal ─────────────────────────────────────────────────────────
function InviteLinkModal({ invite, onClose }: { invite: ColabInvite & { url: string }; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyText(invite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(6,6,26,0.85)',
      backdropFilter:'blur(12px)', zIndex:200, display:'flex',
      alignItems:'center', justifyContent:'center', padding:16,
    }} onClick={(e) => { if(e.target===e.currentTarget) onClose(); }}>
      <div style={{
        width:'100%', maxWidth:420,
        background:'linear-gradient(135deg, rgba(15,12,40,0.98), rgba(10,8,30,0.99))',
        border:'1px solid rgba(124,58,237,0.25)',
        borderRadius:22, padding:28,
        boxShadow:'0 24px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ textAlign:'center', marginBottom:22 }}>
          <div style={{ fontSize:40, marginBottom:10 }}>🔗</div>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'#fff', margin:'0 0 4px' }}>
            Convite gerado!
          </h3>
          <p style={{ fontSize:12, color:'rgba(241,240,255,0.45)', margin:0 }}>
            Válido por 7 dias para <strong style={{ color:'#fff' }}>{invite.clientName}</strong>
          </p>
        </div>

        {/* Link field */}
        <div style={{ marginBottom:16 }}>
          <div style={{ display:'flex', gap:8 }}>
            <input
              readOnly
              value={invite.url}
              style={{
                flex:1, background:'rgba(255,255,255,0.05)',
                border:'1px solid rgba(255,255,255,0.10)',
                borderRadius:10, color:'rgba(241,240,255,0.7)',
                padding:'10px 14px', fontSize:12, outline:'none',
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(124,58,237,0.2)',
                border: `1px solid ${copied ? 'rgba(52,211,153,0.3)' : 'rgba(124,58,237,0.3)'}`,
                color: copied ? '#34D399' : '#A78BFA',
                borderRadius:10, padding:'10px 14px',
                fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.2s', flexShrink:0,
              }}
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Share options */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
          <a
            href={buildWhatsApp(invite.url, invite.agencyName)}
            target="_blank" rel="noreferrer"
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.25)',
              color:'#25D366', borderRadius:10, padding:'10px 0',
              fontSize:13, fontWeight:600, textDecoration:'none', transition:'background 0.15s',
            }}
          >
            📱 WhatsApp
          </a>
          <a
            href={buildMailto(invite.url, invite.agencyName)}
            style={{
              display:'flex', alignItems:'center', justifyContent:'center', gap:6,
              background:'rgba(96,165,250,0.12)', border:'1px solid rgba(96,165,250,0.22)',
              color:'#60A5FA', borderRadius:10, padding:'10px 0',
              fontSize:13, fontWeight:600, textDecoration:'none', transition:'background 0.15s',
            }}
          >
            📧 E-mail
          </a>
        </div>

        <button
          onClick={onClose}
          style={{
            width:'100%', background:'transparent', border:'1px solid rgba(255,255,255,0.10)',
            color:'rgba(241,240,255,0.5)', borderRadius:10, padding:'11px 0',
            fontSize:13, cursor:'pointer',
          }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export function InviteColabButton({ adminUid, adminEmail, agencyName }: InviteColabButtonProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [createdInvite, setCreatedInvite] = useState<(ColabInvite & { url: string }) | null>(null);
  const [invites, setInvites]       = useState<ColabInvite[]>([]);
  const [showList, setShowList]     = useState(false);
  const [loading, setLoading]       = useState(false);

  const loadInvites = async () => {
    setLoading(true);
    const list = await listAdminInvites(adminUid);
    setInvites(list);
    setLoading(false);
  };

  const handleRevoke = async (inviteId: string) => {
    if (!window.confirm('Revogar este convite?')) return;
    await revokeColabInvite(inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
  };

  return (
    <>
      {/* Main button */}
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            display:'inline-flex', alignItems:'center', gap:7,
            background:'linear-gradient(135deg,#4F46E5,#7C3AED,#9333EA)',
            border:'none', color:'#fff', borderRadius:12,
            padding:'9px 18px', fontSize:13, fontWeight:600,
            cursor:'pointer', boxShadow:'0 4px 16px rgba(124,58,237,0.45)',
            fontFamily:'inherit', transition:'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(124,58,237,0.55)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 16px rgba(124,58,237,0.45)'; }}
        >
          <span>✦</span>
          Convidar para Colab
        </button>

        <button
          onClick={() => { setShowList((v) => !v); if (!showList) loadInvites(); }}
          style={{
            display:'inline-flex', alignItems:'center', gap:5,
            background:'rgba(167,139,250,0.12)',
            border:'1px solid rgba(167,139,250,0.25)',
            color:'#A78BFA', borderRadius:10,
            padding:'9px 14px', fontSize:12, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit',
          }}
        >
          👥 {showList ? 'Ocultar' : 'Ver convites'}
        </button>
      </div>

      {/* Invite list panel */}
      {showList && (
        <div style={{
          marginTop:12,
          background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(167,139,250,0.15)',
          borderRadius:14, overflow:'hidden',
        }}>
          {loading ? (
            <div style={{ padding:'20px', textAlign:'center', color:'rgba(241,240,255,0.4)', fontSize:13 }}>
              Carregando…
            </div>
          ) : invites.length === 0 ? (
            <div style={{ padding:'20px', textAlign:'center', color:'rgba(241,240,255,0.4)', fontSize:13 }}>
              Nenhum convite enviado ainda.
            </div>
          ) : (
            <div>
              {invites.map((inv) => (
                <div key={inv.id} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
                  borderBottom:'1px solid rgba(255,255,255,0.04)',
                  flexWrap:'wrap',
                }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {inv.clientName}
                    </div>
                    <div style={{ fontSize:11, color:'rgba(241,240,255,0.4)' }}>{inv.clientEmail}</div>
                  </div>
                  <span style={{
                    padding:'3px 10px', borderRadius:99, fontSize:10, fontWeight:600,
                    background: inv.status==='accepted' ? 'rgba(52,211,153,0.15)' : inv.status==='pending' ? 'rgba(251,212,75,0.15)' : 'rgba(248,113,113,0.15)',
                    color:       inv.status==='accepted' ? '#34D399' : inv.status==='pending' ? '#FBD44B' : '#F87171',
                  }}>
                    {inv.status==='accepted' ? '✓ Aceito' : inv.status==='pending' ? '⏳ Pendente' : '✕ Expirado'}
                  </span>
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(248,113,113,0.6)', fontSize:16, padding:4 }}
                    title="Revogar"
                  >🗑</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateInviteModal
          adminUid={adminUid}
          adminEmail={adminEmail}
          agencyName={agencyName}
          onCreated={(inv) => { setCreatedInvite(inv); setShowCreate(false); }}
          onClose={() => setShowCreate(false)}
        />
      )}
      {createdInvite && (
        <InviteLinkModal
          invite={createdInvite}
          onClose={() => setCreatedInvite(null)}
        />
      )}
    </>
  );
}
