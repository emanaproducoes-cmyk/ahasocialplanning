'use client';
import { useRouter } from 'next/navigation';
import { clearColabSession } from '@/lib/colab/useColabSession';
import Icon from '@/components/colab/ui/Icon';
import type { ColabSession } from '@/lib/colab/types';
import type { NavSection } from '@/app/colab/page';

interface Props {
  session:    ColabSession;
  children:   React.ReactNode;
  section:    NavSection;
  onNavigate: (s: NavSection) => void;
}

const NAV: { id: NavSection; icon: string; label: string }[] = [
  { id: 'calendar', icon: 'Calendar',      label: 'Calendário'   },
  { id: 'planning', icon: 'List_Checklist', label: 'Planejamento' },
  { id: 'ratings',  icon: 'Star',          label: 'Avaliações'   },
];

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
}

export default function ColabShell({ session, children, section, onNavigate }: Props) {
  const router = useRouter();

  const handleLogout = () => {
    clearColabSession();
    router.push('/colab/expired');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#F1F5F9' }}>

      {/* TOPBAR */}
      <header style={{
        background: '#0F172A', height: 58,
        display: 'flex', alignItems: 'center', padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 50, flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg,#4F46E5,#7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
          }}>
            <Icon name="Bulb" size={17} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: 14, color: '#F8FAFC', letterSpacing: '-0.01em', lineHeight: 1.1 }}>Social Colab</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.5)', marginTop: 1 }}>{session.agencyName}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          {NAV.map(item => {
            const active = section === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '7px 16px', borderRadius: 10, cursor: 'pointer',
                border: active ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                background: active ? 'rgba(255,255,255,0.13)' : 'transparent',
                color: active ? '#FFFFFF' : 'rgba(248,250,252,0.58)',
                fontSize: 13, fontFamily: 'Plus Jakarta Sans, sans-serif',
                fontWeight: active ? 700 : 500, transition: 'all 0.18s', position: 'relative',
              }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(248,250,252,0.85)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(248,250,252,0.58)'; } }}
              >
                <Icon name={item.icon} size={15} color={active ? '#FFFFFF' : 'rgba(248,250,252,0.58)'} />
                {item.label}
                {active && <span style={{ position: 'absolute', bottom: -2, left: '50%', transform: 'translateX(-50%)', width: 24, height: 2, borderRadius: 2, background: 'linear-gradient(90deg,#8B5CF6,#6366F1)' }} />}
              </button>
            );
          })}
        </nav>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 32, flexShrink: 0 }}>
          {/* Online badge */}
          <div style={{ padding: '4px 10px', borderRadius: 999, background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.30)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#34D399', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Online</span>
          </div>
          <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />
          {/* Avatar */}
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#9333EA)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif', flexShrink: 0 }}>
            {initials(session?.clientName ?? "")}
          </div>
          {/* Name */}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#F8FAFC', fontFamily: 'Plus Jakarta Sans, sans-serif', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.clientName}</div>
            <div style={{ fontSize: 10, color: 'rgba(248,250,252,0.48)', whiteSpace: 'nowrap', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis' }}>{session?.clientEmail}</div>
          </div>
          {/* Logout */}
          <button onClick={handleLogout} title="Sair" style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8, cursor: 'pointer', padding: '6px 10px',
            transition: 'all 0.15s', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'rgba(248,250,252,0.55)',
            fontSize: 12, fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 600,
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.35)'; (e.currentTarget.style as any).color = '#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; (e.currentTarget.style as any).color = 'rgba(248,250,252,0.55)'; }}
          >
            <Icon name="Log_Out" size={14} />
            Sair
          </button>
        </div>
      </header>

      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>

      <footer style={{ background: '#0F172A', height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: 'rgba(248,250,252,0.38)', fontFamily: 'Inter, sans-serif' }}>
          © 2026 AHA Social Colab. Todos os direitos reservados.
        </span>
      </footer>
    </div>
  );
}
