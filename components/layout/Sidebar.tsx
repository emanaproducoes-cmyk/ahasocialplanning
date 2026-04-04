'use client';

import Link      from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn }    from '@/lib/utils/cn';
import { CountBadge, NewBadge } from '@/components/ui/Badge';
import type { BadgeCounts }     from '@/lib/hooks/useBadges';
import type { User }            from 'firebase/auth';
import { initials }             from '@/lib/utils/formatters';

// ─── Nav item config ─────────────────────────────────────────────────────────
interface NavItem {
  href:     string;
  label:    string;
  icon:     string;
  badge?:   keyof BadgeCounts | null;
  badgeVariant?: 'orange' | 'green' | 'red';
  isNew?:   boolean;
  children?: NavItem[];
}

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'VISÃO GERAL',
    items: [
      { href: '/dashboard', label: 'Dashboard',    icon: '▤'  },
      { href: '/contas',    label: 'Contas',        icon: '🔗', badge: 'connectedAccounts', badgeVariant: 'orange' },
    ],
  },
  {
    title: 'CONTEÚDO',
    items: [
      { href: '/workflow',     label: 'Workflow',     icon: '⬚',  isNew: true },
      { href: '/agendamentos', label: 'Agendamentos', icon: '📅' },
      {
        href: '/posts', label: 'Posts', icon: '🗂',
        children: [
          { href: '/posts',       label: 'Todos os Posts', icon: '' },
          { href: '/revisao',     label: 'Revisão',        icon: '', badge: 'revisao',   badgeVariant: 'orange' },
          { href: '/em-analise',  label: 'Em Análise',     icon: '', badge: 'emAnalise', badgeVariant: 'orange' },
          { href: '/aprovados',   label: '✅ Aprovados',   icon: '', badge: 'aprovados', badgeVariant: 'green'  },
          { href: '/rejeitados',  label: '❌ Rejeitados',  icon: '', badge: 'rejeitados',badgeVariant: 'red'    },
        ],
      },
    ],
  },
  {
    title: 'ESTRATÉGIA',
    items: [
      { href: '/campanhas',    label: 'Campanhas',     icon: '🚀' },
      { href: '/trafego-pago', label: 'Tráfego Pago',  icon: '📈' },
    ],
  },
];

// ─── NavLink ─────────────────────────────────────────────────────────────────
function NavLink({
  item,
  badges,
  depth = 0,
}: {
  item:   NavItem;
  badges: BadgeCounts;
  depth?: number;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const [open, setOpen] = useState(isActive);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen((p) => !p)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-sm',
            isActive
              ? 'bg-orange-500/10 text-[#FF5C00] border-l-2 border-[#FF5C00]'
              : 'text-[#A0A0B8] hover:bg-orange-500/8 hover:text-white'
          )}
        >
          <span className="text-base w-4 text-center">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          <span className="text-xs opacity-60">{open ? '▾' : '▸'}</span>
        </button>

        {open && (
          <div className="ml-3 mt-1 space-y-0.5 pl-3 border-l border-white/10">
            {item.children.map((child) => (
              <NavLink key={child.href} item={child} badges={badges} depth={1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const badgeCount = item.badge ? badges[item.badge] : 0;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        depth === 0 && isActive && 'border-l-2 border-[#FF5C00]',
        isActive
          ? 'bg-orange-500/10 text-[#FF5C00]'
          : 'text-[#A0A0B8] hover:bg-orange-500/8 hover:text-white'
      )}
    >
      {item.icon && (
        <span className="text-base w-4 text-center shrink-0">{item.icon}</span>
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.isNew && <NewBadge />}
      {item.badge && badgeCount > 0 && (
        <CountBadge count={badgeCount} variant={item.badgeVariant} />
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
      {/* Mobile overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-screen flex flex-col',
          'bg-[#1A1A2E] transition-all duration-300 ease-in-out',
          collapsed ? '-translate-x-full lg:translate-x-0 lg:w-16' : 'translate-x-0 w-[220px]'
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-white/8 shrink-0">
          <div className={cn('flex items-center gap-2', collapsed && 'lg:justify-center')}>
            <div className="w-8 h-8 rounded-lg bg-gradient-aha flex items-center justify-center shrink-0">
              <span className="text-white font-display font-bold text-xs">A</span>
            </div>
            {!collapsed && (
              <div>
                <div className="font-display font-bold text-white text-sm leading-none">AHA</div>
                <div className="text-[9px] text-[#A0A0B8] tracking-wider uppercase leading-tight">Social Planning</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              {!collapsed && (
                <p className="text-[10px] font-semibold tracking-widest text-[#A0A0B8]/50 px-3 mb-1.5 uppercase">
                  {section.title}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} badges={badges} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-white/8 shrink-0">
          {user && (
            <div className={cn('flex items-center gap-2.5', collapsed && 'lg:justify-center')}>
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? ''}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#FF5C00] flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-semibold">
                    {initials(user.displayName)}
                  </span>
                </div>
              )}

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">
                    {user.displayName?.split(' ')[0] ?? user.email}
                  </p>
                  <p className="text-[10px] text-[#A0A0B8] truncate">{user.email}</p>
                </div>
              )}
            </div>
          )}

          {!collapsed && (
            <button
              onClick={onLogout}
              className="mt-2 w-full text-left text-xs text-[#A0A0B8] hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2"
            >
              <span>→</span> Sair da conta
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
