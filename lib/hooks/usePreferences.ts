'use client';

import { useState, useEffect, useCallback } from 'react';
import { loadPreferences, savePreference } from '@/lib/firebase/firestore';
import type { AppPreferences, ViewMode } from '@/lib/types';

const DEFAULT_PREFS: AppPreferences = {
  viewModes: {
    agendamentos: 'grade',
    posts:        'grade',
    campanhas:    'grade',
  },
  filters: {
    periodo:    'mes',
    plataforma: 'todas',
    tipo:       'todos',
    status:     'todos',
  },
  sidebarCollapsed: false,
  updatedAt: null,
};

export function usePreferences(uid: string | null) {
  const [prefs,   setPrefs]   = useState<AppPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }

    loadPreferences(uid).then((saved) => {
      setPrefs((prev) => ({
        ...prev,
        ...saved,
        viewModes: { ...prev.viewModes, ...(saved.viewModes ?? {}) },
        filters:   { ...prev.filters,   ...(saved.filters   ?? {}) },
      }));
      setLoading(false);
    });
  }, [uid]);

  const setViewMode = useCallback(
    async (page: keyof AppPreferences['viewModes'], mode: ViewMode) => {
      if (!uid) return;
      setPrefs((prev) => ({
        ...prev,
        viewModes: { ...prev.viewModes, [page]: mode },
      }));
      await savePreference(uid, `viewModes.${page}`, mode);
    },
    [uid]
  );

  const setFilter = useCallback(
    async <K extends keyof AppPreferences['filters']>(
      key: K,
      value: AppPreferences['filters'][K]
    ) => {
      if (!uid) return;
      setPrefs((prev) => ({
        ...prev,
        filters: { ...prev.filters, [key]: value },
      }));
      await savePreference(uid, `filters.${key}`, value);
    },
    [uid]
  );

  const setSidebarCollapsed = useCallback(
    async (collapsed: boolean) => {
      if (!uid) return;
      setPrefs((prev) => ({ ...prev, sidebarCollapsed: collapsed }));
      await savePreference(uid, 'sidebarCollapsed', collapsed);
    },
    [uid]
  );

  return {
    prefs,
    loading,
    setViewMode,
    setFilter,
    setSidebarCollapsed,
  };
}
