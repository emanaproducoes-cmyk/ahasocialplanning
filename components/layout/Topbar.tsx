'use client';

import { useState, useRef, useEffect } from 'react';
import Link            from 'next/link';
import { usePathname } from 'next/navigation';
import { cn }          from '@/lib/utils/cn';
import { SyncIndicator } from '@/components/ui/SyncIndicator';
import type { BadgeCounts } from '@/lib/hooks/useBadges';
import type { SyncStatus }  from '@/lib/types';
import type { User }        from 'firebase/auth';

const ADMIN_EMAIL = 'emanaproducoes@gmail.com';

interface TopbarTab {
  href:      string;
  label:     string;
  badge?:    keyof BadgeCounts;
  dotColor?: string;
  isNew?:    boolean;
  icon?:     string;
}

const TABS: TopbarTab[] = [
  { href: '/dashboard',    label: 'Dashboard'                                        },
  { href: '/workflow',     label: 'Workflow',     isNew: true                        },
  { href: '/agendamentos', label: 'Agendamentos'                                     },
  { href: '/posts',        label: 'Posts'                                            },
  { href: '/campanhas',    label: 'Campanhas'                                        },
  { href: '/trafego-pago', label: 'Tráfego Pago'                                    },
  { href: '/em-analise',   label: 'Em Análise',   badge: 'emAnalise',  dotColor: '#F59E0B' },
  { href: '/aprovados',    label: 'Aprovados',    badge: 'aprovados',  dotColor: '#22C55E' },
  { href: '/rejeitados',   label: 'Rejeitados',   badge: 'rejeitados', dotColor: '#EF4444' },
  { href: '/revisao',      label: 'Revisão',      badge: 'revisao',    dotColor: '#3B82F6' },
  { href: '/contas',       label: 'Contas',       badge: 'connectedAccounts', icon: '🔗' },
];

interface ConnectedAccount {
  id:       string;
  name:     string;
  platform: string;
  handle:   string;
}

interface TopbarProps {
  user:             User | null;
  badges:           BadgeCounts;
  syncStatus:       SyncStatus;
  onMenuClick:      () => void;
  accounts?:        ConnectedAccount[];
  selectedAccount?: ConnectedAccount | null;
  onSelectAccount?: (account: ConnectedAccount | null) => void;
}

export function Topbar({
  user,
  badges,
  syncStatus,
  onMenuClick,
  accounts = [],
  selectedAccount,
  onSelectAccount,
}: TopbarProps) {
  const pathname          = usePathname();
  const [showDrop, setShowDrop] = useState(false);
  const dropRef           = useRef<HTMLDivElement>(null);
  const isAdmin           = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowDrop(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  // Current page label
  const currentTab = TABS.find(
    (t) => pathname === t.href || pathname.startsWith(t.href + '/')
  );
  const pageTitle = currentTab?.label ?? 'Dashboard';

  return (
    <header
      className="fixed top-0 right-0 z-20 bg-white border-b border-gray-100 flex flex-col"
      style={{ left: 'var(--sidebar-w, 220px)', transition: 'left 0.3s' }}
    >
      {/* ── Top row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center h-[44px] px-5 gap-3">

        {/* Hamburger */}
        <button
          onClick={onMenuClick}
          className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="3" y1="6"  x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Page title */}
        <span className="font-bold text-gray-900 text-[15px] shrink-0">{pageTitle}</span>

        {/* Account selector */}
        <div className="relative shrink-0" ref={dropRef}>
          <button
            onClick={() => isAdmin && setShowDrop((p) => !p)}
            title={!isAdmin ? 'Apenas o administrador pode trocar de conta' : undefined}
            className={cn(
              'flex items-center gap-2 h-8 pl-2 pr-3 rounded-lg text-[13px] font-semibold transition-colors',
              isAdmin
                ? 'bg-[#FF5C00] hover:bg-[#E54E00] text-white cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            <span className="w-5 h-5 rounded-md bg-white/20 flex items-center justify-center text-[10px] font-bold">
              +
            </span>
            <div className="text-left">
              <p className="text-[12px] font-bold leading-none">
                {selectedAccount ? selectedAccount.name : 'Todas as Contas'}
              </p>
              <p className="text-[10px] opacity-75 leading-none mt-0.5">
                {selectedAccount ? `@${selectedAccount.handle}` : 'Exibindo tudo'}
              </p>
            </div>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="opacity-75">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown */}
          {showDrop && isAdmin && (
            <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-gray-200 rounded-xl shadow-modal z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Selecionar conta
                </p>
              </div>
              <button
                onClick={() => { onSelectAccount?.(null); setShowDrop(false); }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors',
                  !selectedAccount ? 'text-[#FF5C00] font-semibold' : 'text-gray-700'
                )}
              >
                <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#FFB800] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                  🌐
                </span>
                <span className="flex-1 text-left">Todas as Contas</span>
                {!selectedAccount && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  onClick={() => { onSelectAccount?.(acc); setShowDrop(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] hover:bg-gray-50 transition-colors',
                    selectedAccount?.id === acc.id ? 'text-[#FF5C00] font-semibold' : 'text-gray-700'
                  )}
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#FFB800] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
                    {acc.name[0]?.toUpperCase()}
                  </span>
                  <div className="flex-1 text-left min-w-0">
                    <p className="truncate">{acc.name}</p>
                    <p className="text-[11px] text-gray-400 truncate">@{acc.handle}</p>
                  </div>
                  {selectedAccount?.id === acc.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF5C00" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sync */}
        <button className="flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Sync
        </button>

        {/* Export */}
        <button className="flex items-center justify-center w-8 h-8 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>

        {/* New Post */}
        <Link
          href="/criar-post"
          className="flex items-center gap-1.5 h-8 px-4 bg-[#FF5C00] hover:bg-[#E54E00] text-white text-[13px] font-bold rounded-lg transition-colors shrink-0"
        >
          <span className="text-base leading-none">+</span>
          Novo Post
        </Link>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF5C00] rounded-full" />
        </button>

        {/* Avatar */}
        {user?.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.photoURL}
            alt=""
            className="w-8 h-8 rounded-full object-cover border-2 border-gray-200 shrink-0 cursor-pointer"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#FF5C00] flex items-center justify-center text-white text-sm font-bold shrink-0 cursor-pointer">
            {(user?.displayName?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
          </div>
        )}

        <SyncIndicator status={syncStatus} />
      </div>

      {/* ── Tabs row ─────────────────────────────────────────────────────── */}
      <div className="flex items-end overflow-x-auto px-4 border-t border-gray-100" style={{ height: '36px', scrollbarWidth: 'none' }}>
        {TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const count    = tab.badge ? (badges[tab.badge] ?? 0) : 0;

          // Special "Contas" style — pill with icon
          if (tab.icon && isActive) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 flex items-center gap-1.5 px-3 h-[28px] mb-1 text-[12px] font-semibold rounded-full bg-orange-100 text-[#FF5C00] border border-orange-200 whitespace-nowrap mr-1"
              >
                <span>{tab.icon}</span>
                {tab.label}
                {count > 0 && (
                  <span className="w-4 h-4 rounded-full bg-[#FF5C00] text-white text-[10px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            );
          }

          if (tab.icon && !isActive) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="shrink-0 flex items-center gap-1.5 px-3 h-[28px] mb-1 text-[12px] font-medium rounded-full text-gray-500 hover:bg-gray-100 whitespace-nowrap mr-1 transition-colors"
              >
                <span>{tab.icon}</span>
                {tab.label}
                {count > 0 && (
                  <span
                    className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                    style={{ background: '#FF5C00' }}
                  >
                    {count}
                  </span>
                )}
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 h-full text-[13px] font-medium border-b-2 transition-all whitespace-nowrap',
                isActive
                  ? 'border-[#FF5C00] text-[#FF5C00] font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
              )}
            >
              {tab.label}

              {tab.isNew && (
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                  NEW
                </span>
              )}

              {tab.badge && count > 0 && !tab.isNew && (
                tab.dotColor ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white min-w-[18px] text-center"
                    style={{ background: tab.dotColor }}
                  >
                    {count > 99 ? '99+' : count}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {count > 99 ? '99+' : count}
                  </span>
                )
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
