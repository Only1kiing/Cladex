'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { PointsWidget } from '@/components/dashboard/PointsSystem';
import { Logo } from '@/components/ui/Logo';

const navItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 10.5L10 4l7 6.5V17a1 1 0 01-1 1h-3.5a1 1 0 01-1-1v-3.5a1 1 0 00-1-1h-1a1 1 0 00-1 1V17a1 1 0 01-1 1H4a1 1 0 01-1-1v-6.5z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'My Agents',
    href: '/dashboard/agents',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7.5" cy="7.5" r="1" fill="currentColor" />
        <circle cx="12.5" cy="7.5" r="1" fill="currentColor" />
        <path d="M7 17l1.5-4h3L13 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Explore',
    href: '/dashboard/marketplace',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M3 3h1l1.5 8h9L16 5H5.5M7 17a1 1 0 100-2 1 1 0 000 2zM14 17a1 1 0 100-2 1 1 0 000 2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: 'Build Agent',
    href: '/dashboard/build',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 4v12M4 10h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('cladex_theme');
    if (saved === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.setItem('cladex_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.setItem('cladex_theme', 'light');
    }
  };

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || 'U';

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 mb-2">
        <Link href="/dashboard">
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const isDisabled = 'disabled' in item && item.disabled;
          const badge = 'badge' in item ? (item as any).badge : undefined;
          if (isDisabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium opacity-50 cursor-not-allowed text-gray-400"
              >
                <span>{item.icon}</span>
                {item.label}
                {badge && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                    {badge}
                  </span>
                )}
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-white/[0.08] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <span className={active ? 'text-[#B8FF3C]' : ''}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Plans Link */}
      <div className="px-3 mb-3">
        <Link
          href="/pricing"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-all duration-200"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Plans
        </Link>
      </div>

      {/* Points Widget */}
      <div className="px-3 mb-3">
        <PointsWidget />
      </div>

      {/* Theme Toggle */}
      <div className="px-3 mb-3">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-all duration-200"
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>

      {/* User section */}
      <div className="px-3 pb-5 mt-auto border-t border-white/[0.06] pt-4">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-oracle-500 flex items-center justify-center text-white text-sm font-semibold">
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.name || 'User'}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-500/15 text-gray-400 border border-gray-500/20 font-medium">Free Plan</span>
              <span className="text-[10px] text-gray-600">1/1 agents</span>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.04] transition-colors duration-200"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 14H3.5A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H6M11 11.5L14.5 8 11 4.5M14.5 8H5.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#07070b]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 bg-[#0a0a0f] border-r border-white/[0.06] shrink-0">
        {sidebarContent}
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-50 w-60 bg-[#0a0a0f] border-r border-white/[0.06] transform transition-transform duration-300 ease-out lg:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 lg:hidden bg-[#07070b]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M3 5h14M3 10h14M3 15h14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <Logo size="sm" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-oracle-500 flex items-center justify-center text-white text-xs font-semibold">
              {userInitial}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
