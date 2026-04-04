'use client';

import { useState, useRef } from 'react';
import Link                 from 'next/link';
import { usePathname }      from 'next/navigation';
import { cn }               from '@/lib/utils/cn';
import { SyncIndicator }    from '@/components/ui/SyncIndicator';
import { CountBadge }       from '@/components/ui/Badge';
import type { BadgeCounts } from '@/lib/hooks/useBadges';
import type { SyncStatus }  from '@/lib/types';
import type { User }        from 'firebase/auth';

interface TopbarTab {
  href:    string;
  label:   string;
  badge?:  keyof BadgeCounts | null;
  isNew?:  boolean;
}

const TABS: TopbarTab[] = [
  { href: '/dashboard',   label: 'Dashboard'    },
  { href: '/workflow',    label: 'Workflow', isNew: true },
  { href: '/agendamentos',label: 'Agendamentos'  },
  { href: '/posts',       label: 'Posts'         },
  { href: '/campanhas',   label: 'Campanhas'     },
  { href: '/trafego-pago',label: 'Tráfego Pago'  },
  { href: '/em-analise',  label: 'Em Análise',   badge: 'emAnalise'    },
  { href: '/aprovados',   label: 'Aprovados',    badge: 'aprovados'    },
  { href: '/rejeitados',  label: 'Rejeitados',   badge: 'rejeitados'   },
  { href: '/revisao',     label: 'Revisão',      badge: 'revisao'      },
  { href: '/contas',      label: 'Contas',       badge: 'connectedAccounts' },
];

interface TopbarProps {
  user:        User | null;
  badges:      BadgeCounts;
  syncStatus:  SyncStatus;
  onMenuClick: () => void;
  actions?:    React.ReactNode;
}

export function Topbar({ user, badges, syncStatus, onMenuClick, actions }: TopbarProps) {
  const pathname       = usePathname();
  const [search, setSearch] = useState('');
  const searchRef      = useRef<HTMLInputElement>(null);

  return (
    <header
      className="fixed top-0 right-0 z-20 h-14 bg-white border-b border-gray-100 flex items-center gap-3 px-4"
      style={{ left: 'var(--sidebar-width, 220px)', transition: 'left 0.3s' }}
    >
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
        className="text-gray-500 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100 shrink-0"
      >
        ☰
      </button>

      {/* Scrollable tabs */}
      <nav className="flex items-end gap-0.5 overflow-x-auto scrollbar-none flex-1 self-stretch">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const count    = tab.badge ? badges[tab.badge] : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'shrink-0 flex items-center gap-1 px-3 h-full text-sm transition-colors border-b-2',
                isActive
                  ? 'border-[#FF5C00] text-[#FF5C00] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              )}
            >
              {tab.label}
              {tab.isNew && (
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1 rounded">NEW</span>
              )}
              {tab.badge && count > 0 && (
                <CountBadge count={count} variant="orange" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right section */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Search */}
        <div className="relative hidden md:flex items-center">
          <span className="absolute left-2.5 text-gray-400 text-sm">🔍</span>
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-[#FF5C00]/30 focus:border-[#FF5C00] transition-all focus:w-56"
          />
        </div>

        {/* Sync */}
        <SyncIndicator status={syncStatus} />

        {/* Notifications placeholder */}
        <button className="relative p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
          🔔
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#FF5C00] rounded-full" />
        </button>

        {/* Page-level actions slot */}
        {actions}

        {/* User avatar */}
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt={user.displayName ?? ''}
            className="w-7 h-7 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-[#FF5C00] flex items-center justify-center text-white text-xs font-semibold">
            {(user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
          </div>
        )}
      </div>
    </header>
  );
}
