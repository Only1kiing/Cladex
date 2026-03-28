'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  walletAddress: string | null;
  isEmailVerified: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  connectWallet: () => Promise<{ success: boolean; address?: string; error?: string }>;
  connectExchange: (exchangeId: string, apiKey: string, apiSecret: string) => Promise<{ success: boolean; exchange?: string; error?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEYS = {
  token: 'cladex_token',
  user: 'cladex_user',
  wallet: 'cladex_wallet',
} as const;

function generateToken(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `demo-token-${rand}`;
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    walletAddress: null,
    isEmailVerified: false,
    isLoading: true,
    isAuthenticated: false,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(STORAGE_KEYS.token);
      const storedUser = localStorage.getItem(STORAGE_KEYS.user);
      const storedWallet = localStorage.getItem(STORAGE_KEYS.wallet);

      if (storedToken && storedUser) {
        const user = JSON.parse(storedUser) as User;
        setState({
          user,
          token: storedToken,
          walletAddress: storedWallet,
          isEmailVerified: true,
          isLoading: false,
          isAuthenticated: true,
        });
      } else if (storedWallet) {
        setState({
          user: null,
          token: storedToken,
          walletAddress: storedWallet,
          isEmailVerified: false,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    } catch {
      localStorage.removeItem(STORAGE_KEYS.token);
      localStorage.removeItem(STORAGE_KEYS.user);
      localStorage.removeItem(STORAGE_KEYS.wallet);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Please fill in all fields.' };
    }

    if (!EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (password.length < 1) {
      return { success: false, error: 'Password is required.' };
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const now = new Date().toISOString();
    const token = generateToken();
    const user: User = {
      id: generateUserId(),
      email,
      name: email.split('@')[0],
      createdAt: now,
      updatedAt: now,
    };

    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ email, name: user.name, token }));

    setState({
      user,
      token,
      walletAddress: state.walletAddress,
      isEmailVerified: true,
      isLoading: false,
      isAuthenticated: true,
    });

    return { success: true };
  }, [state.walletAddress]);

  const signup = useCallback(async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!name || !email || !password) {
      return { success: false, error: 'Please fill in all fields.' };
    }

    if (!EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const now = new Date().toISOString();
    const token = generateToken();
    const user: User = {
      id: generateUserId(),
      email,
      name,
      createdAt: now,
      updatedAt: now,
    };

    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({ email, name, token }));

    setState({
      user,
      token,
      walletAddress: state.walletAddress,
      isEmailVerified: false,
      isLoading: false,
      isAuthenticated: true,
    });

    return { success: true };
  }, [state.walletAddress]);

  const connectWallet = useCallback(async (): Promise<{ success: boolean; address?: string; error?: string }> => {
    // Simulate MetaMask connection delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const walletAddress = '0x7a3B...4f2D';

    localStorage.setItem(STORAGE_KEYS.wallet, walletAddress);

    const token = state.token || generateToken();
    if (!state.token) {
      localStorage.setItem(STORAGE_KEYS.token, token);
    }

    setState((prev) => ({
      ...prev,
      walletAddress,
      token,
      isAuthenticated: true,
      isLoading: false,
    }));

    return { success: true, address: walletAddress };
  }, [state.token]);

  const connectExchange = useCallback(async (exchangeId: string, apiKey: string, apiSecret: string): Promise<{ success: boolean; exchange?: string; error?: string }> => {
    if (!exchangeId || !apiKey || !apiSecret) {
      return { success: false, error: 'Please fill in all fields.' };
    }

    // Simulate connection delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const token = state.token || generateToken();
    if (!state.token) {
      localStorage.setItem(STORAGE_KEYS.token, token);
    }

    const now = new Date().toISOString();
    const user = state.user || {
      id: generateUserId(),
      email: `${exchangeId}@cladex.io`,
      name: exchangeId.charAt(0).toUpperCase() + exchangeId.slice(1) + ' User',
      createdAt: now,
      updatedAt: now,
    };

    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

    setState({
      user,
      token,
      walletAddress: null,
      isEmailVerified: true,
      isLoading: false,
      isAuthenticated: true,
    });

    return { success: true, exchange: exchangeId };
  }, [state.token, state.user]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
    localStorage.removeItem(STORAGE_KEYS.wallet);

    setState({
      user: null,
      token: null,
      walletAddress: null,
      isEmailVerified: false,
      isLoading: false,
      isAuthenticated: false,
    });

    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        connectWallet,
        connectExchange,
        logout,
        loading: state.isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
