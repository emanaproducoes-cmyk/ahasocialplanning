'use client';

import { useEffect, useState }   from 'react';
import { useRouter }             from 'next/navigation';
import { Sidebar }               from '@/components/layout/Sidebar';
import { Topbar }                from '@/components/layout/Topbar';
import { useAuth }               from '@/lib/hooks/useAuth';
import { useBadges }             from '@/lib/hooks/useBadges';
import { usePreferences }        from '@/lib/hooks/usePreferences';
import { useUserCollection }     from '@/lib/hooks/useCollection';
import type { SyncStatus, ConnectedAccount } from '@/lib/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router                     = useRouter();
  const { user, loading, logout }  = useAuth();
  const badges                     = useBadges(user?.uid ?? null);
  const { prefs, loading: prefsLoading, setSidebarCollapsed } = usePreferences(user?.uid ?? null);
  const { data: accounts }         = useUserCollection<ConnectedAccount>(
    user?.uid ?? null, 'connectedAccounts'
  );

  const [syncStatus,       setSyncStatus]       = useState<SyncStatus>('online');
  const [sidebarOpen,      setSidebarOpen]      = useState(true);
  const [selectedAccount,  setSelectedAccount]  = useState<ConnectedAccount | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!prefsLoading) setSidebarOpen(!prefs.sidebarCollapsed);
  }, [prefsLoading, prefs.sidebarCollapsed]);

  const handleToggle = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    setSidebarCollapsed(!next);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7FF]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-orange-200 border-t-[#FF5C00] rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const sidebarW = sidebarOpen ? '220px' : '56px';

  // Topbar height: 44px top row + 36px tabs = 80px total
  const topbarH = '80px';

  return (
    <div
      className="min-h-screen bg-[#F8F7FF]"
      style={{ '--sidebar-w': sidebarW } as React.CSSProperties}
    >
      <Sidebar
        user={user}
        badges={badges}
        collapsed={!sidebarOpen}
        onToggle={handleToggle}
        onLogout={logout}
      />

      <div
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{ marginLeft: sidebarW }}
      >
        <Topbar
          user={user}
          badges={badges}
          syncStatus={syncStatus}
          onMenuClick={handleToggle}
          accounts={accounts as ConnectedAccount[]}
          selectedAccount={selectedAccount}
          onSelectAccount={setSelectedAccount}
        />

        {/* Push content below topbar — 80px + 32px gap */}
        <main
          className="flex-1 px-6 pb-6"
          style={{ paddingTop: `calc(${topbarH} + 28px)` }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
