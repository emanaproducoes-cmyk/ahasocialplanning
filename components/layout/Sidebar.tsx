'use client';

import Link            from 'next/link';
import { usePathname } from 'next/navigation';
import { useState }    from 'react';
import { cn }          from '@/lib/utils/cn';
import type { BadgeCounts } from '@/lib/hooks/useBadges';
import type { User }        from 'firebase/auth';

// ─── Nav config ───────────────────────────────────────────────────────────────
interface NavItem {
  href:      string;
  label:     string;
  icon:      React.ReactNode;
  badge?:    keyof BadgeCounts;
  dotColor?: string;
  isNew?:    boolean;
  children?: NavItem[];
}

// SVG Icons matching the screenshot exactly
const Icons = {
  dashboard:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  contas:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  workflow:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  agendamentos:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  posts:      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  campanhas:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  trafego:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
};

const NAV: { title: string; items: NavItem[] }[] = [
  {
    title: 'VISÃO GERAL',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: Icons.dashboard },
      { href: '/contas',    label: 'Contas',    icon: Icons.contas,   badge: 'connectedAccounts', dotColor: '#FF5C00' },
    ],
  },
  {
    title: 'CONTEÚDO',
    items: [
      { href: '/workflow',      label: 'Workflow',     icon: Icons.workflow,    isNew: true },
      { href: '/agendamentos',  label: 'Agendamentos', icon: Icons.agendamentos },
      {
        href: '/posts', label: 'Posts', icon: Icons.posts,
        children: [
          { href: '/posts',      label: 'Todos os Posts', icon: <span className="w-3.5 h-3.5 opacity-0" /> },
          { href: '/revisao',    label: 'Revisão',        icon: <span className="w-3.5 h-3.5 opacity-0" />, badge: 'revisao',    dotColor: '#EF4444' },
          { href: '/em-analise', label: 'Em Análise',     icon: <span className="w-3.5 h-3.5 opacity-0" />, badge: 'emAnalise',  dotColor: '#3B82F6' },
          { href: '/aprovados',  label: 'Aprovados',      icon: <span className="w-3.5 h-3.5 opacity-0" />, badge: 'aprovados',  dotColor: '#22C55E' },
          { href: '/rejeitados', label: 'Rejeitados',     icon: <span className="w-3.5 h-3.5 opacity-0" />, badge: 'rejeitados', dotColor: '#EF4444' },
        ],
      },
    ],
  },
  {
    title: 'ESTRATÉGIA',
    items: [
      { href: '/campanhas',    label: 'Campanhas',    icon: Icons.campanhas },
      { href: '/trafego-pago', label: 'Tráfego Pago', icon: Icons.trafego   },
    ],
  },
];

// ─── Dot badge ────────────────────────────────────────────────────────────────
function DotBadge({ color, count }: { color: string; count: number }) {
  return (
    <span
      className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white shrink-0"
      style={{ background: color }}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ─── Nav link ─────────────────────────────────────────────────────────────────
function NavLink({
  item, badges, collapsed, depth = 0,
}: {
  item: NavItem; badges: BadgeCounts; collapsed: boolean; depth?: number;
}) {
  const pathname   = usePathname();
  const isActive   = pathname === item.href || pathname.startsWith(item.href + '/');
  const [open, setOpen] = useState(isActive);
  const count      = item.badge ? (badges[item.badge] ?? 0) : 0;

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((p) => !p)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-[14px]',
            isActive
              ? 'bg-[#FF5C00]/15 text-[#FF5C00]'
              : 'text-[#8B8BA7] hover:text-white hover:bg-white/5'
          )}
        >
          <span className="shrink-0 opacity-80">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 font-medium">{item.label}</span>
              <svg
                width="12" height="12" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5"
                className={cn('shrink-0 transition-transform opacity-50', open && 'rotate-180')}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </>
          )}
        </button>

        {open && !collapsed && (
          <div className="mt-0.5 ml-2 pl-5 border-l border-white/10 space-y-0.5">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} badges={badges} collapsed={false} depth={1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[14px]',
        isActive
          ? 'bg-[#FF5C00]/15 text-[#FF5C00] font-semibold'
          : 'text-[#8B8BA7] hover:text-white hover:bg-white/5',
        collapsed && 'justify-center px-2',
        depth === 1 && 'py-1.5'
      )}
    >
      <span className={cn('shrink-0', isActive ? 'opacity-100' : 'opacity-70')}>
        {item.icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.isNew && (
            <span className="text-[10px] font-bold bg-[#FF5C00] text-white px-1.5 py-0.5 rounded-full shrink-0">
              NEW
            </span>
          )}
          {item.dotColor && (
            <DotBadge color={item.dotColor} count={count} />
          )}
          {!item.dotColor && item.badge && count > 0 && (
            <DotBadge color="#FF5C00" count={count} />
          )}
        </>
      )}
    </Link>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────
interface SidebarProps {
  user:      User | null;
  badges:    BadgeCounts;
  collapsed: boolean;
  onToggle:  () => void;
  onLogout:  () => void;
}

export function Sidebar({ user, badges, collapsed, onToggle, onLogout }: SidebarProps) {
  return (
    <>
      {!collapsed && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onToggle} />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen flex flex-col bg-[#1A1A2E]',
          'transition-all duration-300 ease-in-out overflow-hidden',
          collapsed ? 'w-[56px]' : 'w-[220px]'
        )}
      >
        {/* ── Logo ── */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center shrink-0 border-b border-white/8 hover:bg-white/5 transition-colors',
            collapsed ? 'justify-center py-4 px-2' : 'gap-2.5 px-4 py-4'
          )}
        >
          {/* AHA orange square logo */}
          <div className="w-10 h-10 rounded-xl bg-[#FF5C00] flex items-center justify-center shrink-0">
            <span
              style={{ fontFamily: "'StribeMarker','Bebas Neue',cursive", fontSize: '16px', letterSpacing: '0.02em' }}
              className="text-white font-bold leading-none"
            >
              AHA
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white text-[13px] font-bold leading-tight tracking-wide uppercase">
                Social Planning
              </p>
              <p className="text-[#8B8BA7] text-[10px] leading-tight uppercase tracking-wider">
                Gestão de Conteúdo
              </p>
            </div>
          )}
        </Link>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {NAV.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="text-[10px] font-bold tracking-[0.12em] text-[#8B8BA7]/60 px-3 mb-2 uppercase">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} badges={badges} collapsed={collapsed} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── User footer ── */}
        <div className={cn('border-t border-white/8 shrink-0', collapsed ? 'p-2' : 'p-3')}>
          {user && !collapsed && (
            <div className="flex items-center gap-2.5 mb-2">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#FF5C00] flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {(user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-white text-[13px] font-semibold truncate">
                  {user.displayName?.split(' ')[0] ?? 'Usuário'}
                </p>
                <p className="text-[#8B8BA7] text-[11px] truncate">Gerente de Conteúdo</p>
              </div>
            </div>
          )}
          {collapsed && user && (
            <div className="flex justify-center mb-2">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#FF5C00] flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {(user.displayName?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}
          {!collapsed && (
            <button
              onClick={onLogout}
              className="w-full text-left text-[13px] text-[#8B8BA7] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Sair da conta
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
