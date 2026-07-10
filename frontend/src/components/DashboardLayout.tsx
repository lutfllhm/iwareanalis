'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/ThemeProvider';
import {
  LayoutDashboard,
  Package,
  FileText,
  RotateCcw,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  User as UserIcon,
  UserCheck,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles?: ('admin' | 'analyst' | 'viewer')[];
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Rincian Penjualan per Barang', href: '/daftar-laporan/rincian-penjualan-per-barang', icon: Package },
  { name: 'Daftar Retur Penjualan', href: '/daftar-laporan/penjualan/daftar-retur', icon: RotateCcw },
  { name: 'Daftar Faktur Penjualan', href: '/daftar-laporan/penjualan/daftar-faktur', icon: FileText },
  { name: 'Laporan Data Analyst', href: '/laporan', icon: TrendingUp },
  { name: 'Manajemen User', href: '/users-management', icon: UserCheck, roles: ['admin'] },
  { name: 'Pengaturan', href: '/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (href: string) => {
    router.push(href);
    setIsMobileOpen(false);
  };

  // Filter items based on user role
  const filteredItems = sidebarItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const currentPageTitle =
    sidebarItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))?.name
    || 'Dashboard';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'analyst':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20';
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 1. DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.4)] ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!isCollapsed && (
            <span className="font-extrabold text-xl bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent tracking-tight">
              AIware Sales
            </span>
          )}
          {isCollapsed && (
            <span className="font-extrabold text-xl text-primary mx-auto">AI</span>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <Icon size={20} className={`${isCollapsed ? 'mx-auto' : 'mr-3'} flex-shrink-0`} />
                {!isCollapsed && <span className="text-sm truncate">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer info/Logout */}
        <div className="p-4 border-t border-border bg-muted/30">
          <button
            onClick={logout}
            className="w-full flex items-center p-2 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={20} className={isCollapsed ? 'mx-auto' : 'mr-3'} />
            {!isCollapsed && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* 2. MOBILE SIDEBAR DRAWER OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-card border-r border-border transform transition-transform duration-300 md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <span className="font-extrabold text-xl bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
            AIware Sales
          </span>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center p-3 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon size={20} className="mr-3" />
                <span className="text-sm">{item.name}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center p-3 rounded-xl text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut size={20} className="mr-3" />
            <span className="text-sm font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 z-30 dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.4)]">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-lg hover:bg-muted text-muted-foreground md:hidden"
            >
              <Menu size={20} />
            </button>
            <h1 className="text-lg font-bold text-foreground tracking-tight hidden sm:block">
              {currentPageTitle}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {/* Dark/Light mode selector */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-all duration-150"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            <div className="h-8 w-[1px] bg-border" />

            {/* Profile widget */}
            <div className="flex items-center space-x-3">
              <div className="hidden text-right lg:block">
                <p className="text-sm font-bold text-foreground leading-none">{user?.nama}</p>
                <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 mt-1 rounded-full ${getRoleBadge(user?.role || '')}`}>
                  {user?.role}
                </span>
              </div>
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-primary-foreground font-semibold shadow-md shadow-primary/10">
                <UserIcon size={18} />
              </div>
            </div>
          </div>
        </header>

        {/* Content body viewport */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
