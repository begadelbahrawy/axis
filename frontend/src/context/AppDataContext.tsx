import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet } from '../api/client';
import type { Application, Settings } from '../types';
import { useAuth, isAdminUser, isEcaaUser, isManagerUser } from './AuthContext';

export type NotificationRow = {
  id: string;
  type: string;
  category: 'manager' | 'ecaa';
  kind: string;
  status: string;
  recType: string;
  managerApprovedBy: string | null;
  managerNotes: string | null;
  ecaaNotes: string | null;
  approvalNumber: string | null;
};

type AppData = {
  settings: Settings | null;
  managerQueueCount: number;
  ecaaQueueCount: number;
  pendingUserCount: number;
  managerNotifications: NotificationRow[];
  ecaaNotifications: NotificationRow[];
  refreshAll: () => void;
};

const AppDataContext = createContext<AppData | null>(null);

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [managerQueueCount, setManagerQueueCount] = useState(0);
  const [ecaaQueueCount, setEcaaQueueCount] = useState(0);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [managerNotifications, setManagerNotifications] = useState<NotificationRow[]>([]);
  const [ecaaNotifications, setEcaaNotifications] = useState<NotificationRow[]>([]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    try {
      const s = await apiGet<{ settings: Settings }>('/settings');
      setSettings(s.settings);
    } catch {
      /* ignore */
    }
    try {
      const n = await apiGet<{ manager: NotificationRow[]; ecaa: NotificationRow[] }>('/notifications');
      setManagerNotifications(n.manager);
      setEcaaNotifications(n.ecaa);
    } catch {
      /* ignore */
    }
    if (isManagerUser(user)) {
      try {
        const q = await apiGet<{ pending: Application[]; changesRequested: Application[] }>('/manager-queue');
        setManagerQueueCount(q.pending.length);
      } catch {
        /* ignore */
      }
    }
    if (isEcaaUser(user)) {
      try {
        const q = await apiGet<{ waiting: Application[] }>('/ecaa-queue');
        setEcaaQueueCount(q.waiting.length);
      } catch {
        /* ignore */
      }
    }
    if (isAdminUser(user)) {
      try {
        const p = await apiGet<{ pending: unknown[] }>('/admin/pending-users');
        setPendingUserCount(p.pending.length);
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 20000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  return (
    <AppDataContext.Provider
      value={{ settings, managerQueueCount, ecaaQueueCount, pendingUserCount, managerNotifications, ecaaNotifications, refreshAll }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used within AppDataProvider');
  return ctx;
}
