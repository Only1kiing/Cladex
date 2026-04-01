'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
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

// --- Demo/mock helpers used as offline fallback when the backend is unreachable ---

function generateToken(): string {
  const rand = Math.random().toString(36).substring(2, 10);
  return `demo-token-${rand}`;
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function isNetworkError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { status?: number }).status === 0;
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

  // Restore session on mount by verifying the token with the backend.
  // Falls back to localStorage-only restore if the backend is unreachable so the
  // app still works offline / in demo mode.
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEYS.token);
        const storedUser = localStorage.getItem(STORAGE_KEYS.user);
        const storedWallet = localStorage.getItem(STORAGE_KEYS.wallet);

        if (storedToken) {
          try {
            // Verify the token is still valid with the backend
            const { user } = await api.get<{ user: User }>('/auth/me');
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
            setState({
              user,
              token: storedToken,
              walletAddress: storedWallet,
              isEmailVerified: true,
              isLoading: false,
              isAuthenticated: true,
            });
            return;
          } catch (err) {
            if (isNetworkError(err)) {
              // Backend unreachable – fall back to cached localStorage data so the
              // app still works offline / in demo mode.
              if (storedUser) {
                const user = JSON.parse(storedUser) as User;
                setState({
                  user,
                  token: storedToken,
                  walletAddress: storedWallet,
                  isEmailVerified: true,
                  isLoading: false,
                  isAuthenticated: true,
                });
                return;
              }
            }
            // Token invalid (401 etc.) – clear stored credentials
            localStorage.removeItem(STORAGE_KEYS.token);
            localStorage.removeItem(STORAGE_KEYS.user);
          }
        }

        // No token but wallet present – keep wallet-only auth
        if (storedWallet) {
          setState({
            user: null,
            token: null,
            walletAddress: storedWallet,
            isEmailVerified: false,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }

        setState((prev) => ({ ...prev, isLoading: false }));
      } catch {
        localStorage.removeItem(STORAGE_KEYS.token);
        localStorage.removeItem(STORAGE_KEYS.user);
        localStorage.removeItem(STORAGE_KEYS.wallet);
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (!email || !password) {
      return { success: false, error: 'Please fill in all fields.' };
    }

    if (!EMAIL_REGEX.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters.' };
    }

    try {
      const { user, token } = await api.post<{ user: User; token: string }>('/auth/login', { email, password });

      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

      setState((prev) => ({
        ...prev,
        user,
        token,
        isEmailVerified: true,
        isLoading: false,
        isAuthenticated: true,
      }));

      return { success: true };
    } catch (err) {
      if (isNetworkError(err)) {
        return { success: false, error: 'Server is starting up, please try again in a moment.' };
      }

      const message = (err as { message?: string }).message || 'Login failed. Please try again.';
      return { success: false, error: message };
    }
  }, []);

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

    try {
      const { user, token } = await api.post<{ user: User; token: string }>('/auth/signup', { name, email, password });

      localStorage.setItem(STORAGE_KEYS.token, token);
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));

      setState((prev) => ({
        ...prev,
        user,
        token,
        isEmailVerified: true,
        isLoading: false,
        isAuthenticated: true,
      }));

      return { success: true };
    } catch (err) {
      if (isNetworkError(err)) {
        return { success: false, error: 'Server is starting up, please try again in a moment.' };
      }

      const message = (err as { message?: string }).message || 'Signup failed. Please try again.';
      return { success: false, error: message };
    }
  }, []);

  // Simulated wallet connection – no backend endpoint exists yet.
  // Keeps the same behavior as before (mock address stored in localStorage).
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

    try {
      await api.post('/exchange/connect', { name: exchangeId, apiKey, apiSecret });

      setState((prev) => ({
        ...prev,
        isEmailVerified: true,
        isLoading: false,
        isAuthenticated: true,
      }));

      return { success: true, exchange: exchangeId };
    } catch (err) {
      if (isNetworkError(err)) {
        return { success: false, error: 'Server is starting up, please try again in a moment.' };
      }

      const message = (err as { message?: string }).message || 'Failed to connect exchange. Please try again.';
      return { success: false, error: message };
    }
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
