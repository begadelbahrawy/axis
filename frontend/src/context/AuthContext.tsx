import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiGet, apiPatch, apiPost, ApiError } from '../api/client';
import type { User } from '../types';

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (name: string, email: string, password: string, passwordConfirm: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await apiGet<{ user: User }>('/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const res = await apiPost<{ user: User }>('/auth/login', { email, password, remember });
    setUser(res.user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, passwordConfirm: string) => {
    if (!name || !email || !email.includes('@')) throw new ApiError('Enter your full name and a valid email.', 400);
    if (!password || password.length < 6) throw new ApiError('Choose a password with at least 6 characters.', 400);
    if (password !== passwordConfirm) throw new ApiError('Passwords do not match.', 400);
    const res = await apiPost<{ message: string }>('/auth/register', { name, email, password });
    return res.message;
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    const res = await apiPost<{ message: string }>('/auth/forgot-password', { email });
    return res.message;
  }, []);

  const logout = useCallback(async () => {
    await apiPost('/auth/logout');
    setUser(null);
  }, []);

  const updateName = useCallback(async (name: string) => {
    const res = await apiPatch<{ user: User }>('/auth/me', { name });
    setUser(res.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, forgotPassword, logout, updateName, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Role helpers — mirror isManager()/isECAA()/isAdmin()/canEditApplications()/etc. exactly.
export const isManagerUser = (u: User | null) => !!u && (u.role === 'MANAGER' || u.role === 'ADMIN');
export const isAdminUser = (u: User | null) => u?.role === 'ADMIN';
export const isEcaaUser = (u: User | null) => u?.role === 'ECAA';
export const isSpecialistUser = (u: User | null) => u?.role === 'SPECIALIST';
export const canEditApplications = (u: User | null) => !!u && ['SPECIALIST', 'MANAGER', 'ADMIN'].includes(u.role);
export const canManageReferenceData = canEditApplications;
export const canPrintApplication = canEditApplications;
export const canUploadEcaaApproval = canEditApplications;
export const roleLabel = (role: string) => ({ ADMIN: 'Admin', MANAGER: 'Manager', SPECIALIST: 'Specialist', ECAA: 'ECAA' } as Record<string, string>)[role] || 'User';
