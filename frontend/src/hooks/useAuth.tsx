'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api, { setAccessToken } from '../lib/api';

interface User {
  id: number;
  nama: string;
  email: string;
  role: 'admin' | 'analyst' | 'viewer';
  twoFaEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, captchaToken?: string) => Promise<{ twoFaRequired?: boolean; userId?: number; message?: string }>;
  verifyOtp: (userId: number, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Load user profile on startup if cookies are active
  const refreshUser = async () => {
    try {
      // Attempt to silently refresh access token first
      const refreshRes = await api.post('/auth/refresh');
      setAccessToken(refreshRes.data.accessToken);

      // Fetch user profile info
      const meRes = await api.get('/auth/me');
      setUser(meRes.data);
    } catch (err) {
      // No active session
      setUser(null);
      setAccessToken('');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  // Simple route guarding
  useEffect(() => {
    if (loading) return;

    const publicPages = ['/login'];
    const isPublic = publicPages.includes(pathname);

    if (!user && !isPublic) {
      router.push('/login');
    } else if (user && isPublic) {
      router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  const login = async (email: string, password: string, captchaToken?: string) => {
    try {
      const res = await api.post('/auth/login', { email, password, captchaToken });
      
      if (res.data.twoFaRequired) {
        return { twoFaRequired: true, userId: res.data.userId };
      }

      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      router.push('/dashboard');
      return { message: res.data.message };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Login gagal, periksa email & password Anda');
    }
  };

  const verifyOtp = async (userId: number, code: string) => {
    try {
      const res = await api.post('/auth/verify-2fa', { userId, code });
      setAccessToken(res.data.accessToken);
      setUser(res.data.user);
      router.push('/dashboard');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kode OTP salah atau kedaluwarsa');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    } finally {
      setUser(null);
      setAccessToken('');
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
