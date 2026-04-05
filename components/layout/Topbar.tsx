'use client';

import { useState, useRef, useEffect } from 'react';
import Link                  from 'next/link';
import { usePathname }       from 'next/navigation';
import { cn }                from '@/lib/utils/cn';
import { SyncIndicator }     from '@/components/ui/SyncIndicator';
import type { BadgeCounts }  from '@/lib/hooks/useBadges';
import type { SyncStatus }   from '@/lib/types';
import type { User }         from 'firebase/auth';

const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

interface TopbarTab {
  href:   string;
  label:  string;
  badge?: keyof BadgeCounts;
  isNew?: boolean;
  dotColor?: string;
}

const TABS: TopbarTab[] = [
  { href: '/dashboard',    label: 'Dashboard'    },
  { href: '/workflow',     label: 'Workflow',     isNew: true },
  { href: '/agendamentos', label: 'Agendamentos'  },
  { href: '/posts',        label: 'Posts'         },
  { href: '/campanhas',    label: 'Campanhas'     },
  { href: '/trafego-pago', label: 'Tráfego Pago'  },
  { href: '/em-analise',   label: 'Em Análise',   badge: 'emAnalise',  dotColor: '#F59E0B' },
  { href: '/aprovados',    label: 'Aprovados',    badge: 'aprovados',  dotColor: '#22C55E' },
  { href: '/rejeitados',   label: 'Rejeitados',   badge: 'rejeitados', dotColor: '#EF4444' },
  { href: '/revisao',      label: 'Revisão',      badge: 'revisao',    dotColor: '#3B82F6' },
  { href: '/contas',       label: 'Contas',       badge: 'connectedAccounts' },
];

interface Account {
  id:       string;
  name:     string;
  platform: string;
  handle:   string;
}

interface TopbarProps {
  user:          User | null;
  badges:        BadgeCounts;
  syncStatus:    SyncStatus;
  onMenuClick:   () => void;
  accounts?:     Account[];
  selectedAccount?: Account | null;
  onSelectAccount?: (account: Account | null) => void;
  actions?:      React.ReactNode;
}

export function Topbar({
  user, badges, syncStatus, onMenuClick,
  accounts = [], selectedAccount, onSelectAccount,
}: TopbarProps) {
  const pathname               = usePathname();
  const [showAccounts, setShowAccounts] = useState(false);
  const [showNotifs,   setShowNotifs]   = useState(false);
  const dropRef                = useRef<HTMLDivElement>(null);
  const isAdmin                = user?.email === ADMIN_EMAIL;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowAccounts(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Page title from current path
  const currentTab  = TABS.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'));
  const pageTitle   = currentTab?.label ?? 'AHA Social';

  return (
    <header
      className="fixed top-0 right-0 z-20 bg-white border-b border-gray-100 flex items-center"
      style={{ left: 'var(--sidebar-w, 220px)', height: '56px', transition: 'left 0.3s' }}
    >
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-3 px-4 border-r border-gray-100 h-full shrink-0">
        <button
          onClick={onMenuClick}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
          aria-label="Toggle sidebar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="font-semibold text-gray-800 text-[15px]">{pageTitle}</span>
      </div>

      {/* Center: scrollable tabs */}
      <nav className="flex items-end overflow-x-auto scrollbar-none flex-1 h-full px-2" style={{ scrollbarWidth: 'none' }}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const count    = tab.badge ? (badges[tab.badge] ?? 0) : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 h-full text-[13px] font-medium border-b-2 transition-all whitespace-nowrap',
                isActive
                  ? 'border-[#FF5C00] text-[#FF5C00]'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
              )}
            >
              {tab.label}
              {tab.isNew && (
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">NEW</span>
              )}
              {tab.badge && count > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                  style={{ background: tab.dotColor ?? '#FF5C00' }}
                >
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Right: account selector + actions */}
      <div className="flex items-center gap-2 px-3 shrink-0" ref={dropRef}>

        {/* Account selector — admin only */}
        {isAdmin && (
          <div className="relative">
            <button
              onClick={() => setShowAccounts((p) => !p)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[13px] font-medium text-gray-700 hover:border-[#FF5C00]/50 hover:text-[#FF5C00] transition-colors"
            >
              <span className="text-base">🔗</span>
              <span className="max-w-[120px] truncate">
                {selectedAccount ? selectedAccount.name : 'Todas as Contas'}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showAccounts && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-modal z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Selecionar conta</p>
                </div>
                <button
                  onClick={() => { onSelectAccount?.(null); setShowAccounts(false); }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors',
                    !selectedAccount ? 'text-[#FF5C00] font-semibold' : 'text-gray-700'
                  )}
                >
                  <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">🌐</span>
                  Todas as Contas
                  {!selectedAccount && <span className="ml-auto text-[#FF5C00]">✓</span>}
                </button>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => { onSelectAccount?.(acc); setShowAccounts(false); }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors',
                      selectedAccount?.id === acc.id ? 'text-[#FF5C00] font-semibold' : 'text-gray-700'
                    )}
                  >
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#FFB800] flex items-center justify-center text-white text-[10px] font-bold">
                      {acc.name[0]?.toUpperCase()}
                    </span>
                    <span className="flex-1 text-left truncate">{acc.name}</span>
                    {selectedAccount?.id === acc.id && <span className="text-[#FF5C00]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sync */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Sync
        </button>

        {/* Export */}
        <button className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        {/* New Post */}
        <Link
          href="/criar-post"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-[13px] font-semibold rounded-lg transition-colors"
        >
          <span className="text-base leading-none">+</span>
          Novo Post
        </Link>

        {/* Notifications */}
        <button
          className="relative p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          onClick={() => setShowNotifs((p) => !p)}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF5C00] rounded-full"/>
        </button>

        {/* User avatar */}
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 cursor-pointer" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#FF5C00] flex items-center justify-center text-white text-sm font-bold cursor-pointer">
            {(user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
          </div>
        )}

        <SyncIndicator status={syncStatus} />
      </div>
    </header>
  );
}
