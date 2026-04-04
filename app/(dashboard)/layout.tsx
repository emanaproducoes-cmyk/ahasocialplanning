'use client';

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import { Sidebar }             from '@/components/layout/Sidebar';
import { Topbar }              from '@/components/layout/Topbar';
import { useAuth }             from '@/lib/hooks/useAuth';
import { useBadges }           from '@/lib/hooks/useBadges';
import { usePreferences }      from '@/lib/hooks/usePreferences';
import { cn }                  from '@/lib/utils/cn';
import type { SyncStatus }     from '@/lib/types';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router               = useRouter();
  const { user, loading, logout } = useAuth();
  const badges               = useBadges(user?.uid ?? null);
  const { prefs, loading: prefsLoading, setSidebarCollapsed } = usePreferences(user?.uid ?? null);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  // Sync sidebar collapsed preference
  useEffect(() => {
    if (!prefsLoading) setSidebarOpen(!prefs.sidebarCollapsed);
  }, [prefsLoading, prefs.sidebarCollapsed]);

  const handleToggleSidebar = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    setSidebarCollapsed(!next);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7FF]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#FF5C00]/20 border-t-[#FF5C00] rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  const sidebarWidth = sidebarOpen ? '220px' : '64px';

  return (
    <div className="min-h-screen bg-[#F8F7FF]">
      <Sidebar
        user={user}
        badges={badges}
        collapsed={!sidebarOpen}
        onToggle={handleToggleSidebar}
        onLogout={logout}
      />

      {/* Main content shifted right of sidebar */}
      <div
        className="transition-all duration-300 min-h-screen flex flex-col"
        style={{ marginLeft: sidebarWidth }}
      >
        <Topbar
          user={user}
          badges={badges}
          syncStatus={syncStatus}
          onMenuClick={handleToggleSidebar}
        />

        {/* Page content */}
        <main className="flex-1 pt-14 p-6 animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
