'use client';

import React, { useState } from 'react';
import Image from 'next/image';
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
  Search,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

interface SidebarItem {
  name: string;
  shortName?: string;
  href: string;
  icon: LucideIcon;
  roles?: ('admin' | 'analyst' | 'viewer')[];
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const sidebarSections: SidebarSection[] = [
  {
    label: 'Menu',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Laporan Data Analyst', href: '/laporan', icon: TrendingUp },
    ],
  },
  {
    label: 'Daftar Laporan',
    items: [
      { name: 'Rincian Penjualan per Barang', shortName: 'Rincian Penjualan', href: '/daftar-laporan/rincian-penjualan-per-barang', icon: Package },
      { name: 'Daftar Retur Penjualan', shortName: 'Retur Penjualan', href: '/daftar-laporan/penjualan/daftar-retur', icon: RotateCcw },
      { name: 'Daftar Faktur Penjualan', shortName: 'Faktur Penjualan', href: '/daftar-laporan/penjualan/daftar-faktur', icon: FileText },
    ],
  },
  {
    label: 'Pengaturan',
    items: [
      { name: 'Manajemen User', href: '/users-management', icon: UserCheck, roles: ['admin'] },
      { name: 'Pengaturan', href: '/settings', icon: Settings },
    ],
  },
];

const allSidebarItems: SidebarItem[] = sidebarSections.flatMap((s) => s.items);

interface NavListProps {
  sections: SidebarSection[];
  pathname: string;
  collapsed: boolean;
  onNavigate: (href: string) => void;
}

function NavList({ sections, pathname, collapsed, onNavigate }: NavListProps) {
  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
      {sections.map((section) => (
        <div key={section.label} className="space-y-0.5">
          {!collapsed && (
            <p className="px-3.5 mb-1.5 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => onNavigate(item.href)}
                className={`relative w-full flex items-center rounded-lg transition-all duration-150 group ${
                  collapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/30'
                    : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
                }`}
                title={collapsed ? item.name : undefined}
              >
                <Icon size={19} strokeWidth={isActive ? 2.4 : 2} className={`${collapsed ? '' : 'mr-3'} shrink-0`} />
                {!collapsed && <span className="text-sm truncate">{item.shortName || item.name}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

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
  const filteredSections = sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.roles || (user && item.roles.includes(user.role))),
    }))
    .filter((section) => section.items.length > 0);

  const activeItem = allSidebarItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  const currentPageTitle = activeItem?.name || 'Dashboard';

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive/10 text-destructive border border-destructive/20';
      case 'analyst':
        return 'bg-primary/10 text-primary border border-primary/20';
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20';
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* 1. DESKTOP SIDEBAR */}
      <aside
        className={`hidden md:flex flex-col bg-sidebar border-r border-border/70 transition-all duration-300 dark:shadow-[4px_0_32px_-8px_rgba(0,0,0,0.5)] ${
          isCollapsed ? 'w-[76px]' : 'w-64'
        }`}
      >
        {/* Brand Logo Header */}
        <div className={`h-16 flex items-center border-b border-border/70 ${isCollapsed ? 'justify-center px-2' : 'justify-between px-5'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0 h-8 w-8 rounded-lg overflow-hidden shadow-md shadow-primary/25">
                <Image src="/logo.png" alt="Alware Sales" width={32} height={32} className="h-full w-full object-cover" />
              </div>
              <span className="font-extrabold text-[15px] text-foreground tracking-tight truncate">
                Alware Sales
              </span>
            </div>
          )}
          {isCollapsed && (
            <div className="h-8 w-8 rounded-lg overflow-hidden shadow-md shadow-primary/25">
              <Image src="/logo.png" alt="Alware Sales" width={32} height={32} className="h-full w-full object-cover" />
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors shrink-0"
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="mx-auto mt-2 p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}

        <NavList sections={filteredSections} pathname={pathname} collapsed={isCollapsed} onNavigate={handleNavigation} />

        {/* Promo/info widget, Sneat-style */}
        {!isCollapsed && (
          <div className="mx-3 mb-3 rounded-xl bg-linear-to-br from-primary/15 to-fuchsia-500/10 border border-primary/15 p-4 relative overflow-hidden">
            <Sparkles size={64} className="absolute -right-3 -bottom-3 text-primary/10" />
            <p className="text-xs font-bold text-foreground relative">Sinkronisasi Otomatis</p>
            <p className="text-[11px] text-muted-foreground mt-1 mb-3 relative leading-relaxed">
              Data disinkronkan berkala dari Accurate Online ke database lokal.
            </p>
            <button
              onClick={() => handleNavigation('/settings')}
              className="relative w-full text-center text-[11px] font-bold px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
            >
              Atur Jadwal Sync
            </button>
          </div>
        )}

        {/* Footer info/Logout */}
        <div className="p-3 border-t border-border/70">
          <button
            onClick={logout}
            className={`w-full flex items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ${
              isCollapsed ? 'justify-center p-3' : 'px-3.5 py-2.5'
            }`}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut size={19} className={isCollapsed ? '' : 'mr-3'} />
            {!isCollapsed && <span className="text-sm font-semibold">Keluar</span>}
          </button>
        </div>
      </aside>

      {/* 2. MOBILE SIDEBAR DRAWER OVERLAY */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-sidebar border-r border-border/70 transform transition-transform duration-300 md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-5 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg overflow-hidden shadow-md shadow-primary/25">
              <Image src="/logo.png" alt="Alware Sales" width={32} height={32} className="h-full w-full object-cover" />
            </div>
            <span className="font-extrabold text-[15px] text-foreground tracking-tight">Alware Sales</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <NavList sections={filteredSections} pathname={pathname} collapsed={false} onNavigate={handleNavigation} />
        <div className="p-3 border-t border-border/70">
          <button
            onClick={logout}
            className="w-full flex items-center px-3.5 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut size={19} className="mr-3" />
            <span className="text-sm font-semibold">Keluar</span>
          </button>
        </div>
      </aside>

      {/* 3. MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border/70 flex items-center justify-between px-6 z-30 gap-4">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground md:hidden shrink-0"
          >
            <Menu size={20} />
          </button>

          {/* Search bar, Sneat-style */}
          <div className="hidden sm:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={`Cari di ${currentPageTitle}...`}
                readOnly
                className="w-full pl-10 pr-14 py-2.5 rounded-lg bg-muted/60 border border-transparent focus:border-primary/40 focus:bg-card text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-card border border-border rounded px-1.5 py-0.5">
                ⌘K
              </kbd>
            </div>
          </div>

          <h1 className="sm:hidden text-lg font-bold text-foreground tracking-tight truncate flex-1">
            {currentPageTitle}
          </h1>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Dark/Light mode selector */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-lg hover:bg-muted text-muted-foreground transition-all duration-150"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            </button>

            <div className="h-8 w-px bg-border" />

            {/* Profile widget */}
            <div className="flex items-center space-x-3">
              <div className="hidden text-right lg:block">
                <p className="text-sm font-bold text-foreground leading-none">{user?.nama}</p>
                <span className={`inline-block text-[10px] font-semibold uppercase px-2 py-0.5 mt-1.5 rounded-full ${getRoleBadge(user?.role || '')}`}>
                  {user?.role}
                </span>
              </div>
              <div className="h-10 w-10 rounded-full bg-linear-to-tr from-primary to-fuchsia-500 flex items-center justify-center text-white font-semibold shadow-md shadow-primary/20 ring-2 ring-card ring-offset-2 ring-offset-card">
                <UserIcon size={17} />
              </div>
            </div>
          </div>
        </header>

        {/* Content body viewport */}
        <main className="flex-1 overflow-y-auto bg-background p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
