"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3, Globe,
  Building2, Settings, Zap, Menu, LogOut, ChevronDown, Bell
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar, Badge, ConnectionStatus } from "@/components/ui";
import { DASHBOARD_NAV, type UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, BarChart3, Globe, Building2, Settings,
};

function SidebarContent({
  user,
  navItems,
  pathname,
  setSidebarOpen,
}: {
  user: { tenant: { name: string; plan: string }; role: UserRole };
  navItems: Array<{ href: string; label: string; icon: string }>;
  pathname: string;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 h-16 border-b border-[var(--border)]">
        <div className="flex items-center justify-center w-8 h-8 bg-[var(--brand-600)] rounded-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-[var(--text-primary)]">NAPOS</span>
      </div>
      <div className="px-4 py-3 border-b border-[var(--border)] space-y-1.5">
        <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug break-words">{user.tenant.name}</p>
        <Badge variant="brand" size="sm" className="inline-flex w-fit">Paket {user.tenant.plan}</Badge>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-[var(--brand-50)] text-[var(--brand-700)] dark:bg-[var(--brand-950)] dark:text-[var(--brand-300)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-[var(--border)]">
        <div className="w-full px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--surface-raised)] rounded-lg">
          Role login: {user.role}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, canAccess } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    const routePermissions: Array<{ prefix: string; feature: string }> = [
      { prefix: "/dashboard/settings/billing", feature: "settings.billing" },
      { prefix: "/dashboard/settings", feature: "settings" },
      { prefix: "/dashboard/branches", feature: "branches" },
      { prefix: "/dashboard/channels", feature: "channels" },
      { prefix: "/dashboard/analytics", feature: "analytics" },
      { prefix: "/dashboard/inventory", feature: "inventory" },
      { prefix: "/dashboard/pos", feature: "pos" },
    ];

    const matched = routePermissions.find((item) => pathname.startsWith(item.prefix));
    if (matched && !canAccess(matched.feature)) {
      router.replace(`/dashboard/forbidden?from=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, user, pathname, canAccess, router]);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const navItems = DASHBOARD_NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex h-screen bg-[var(--background)]">
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <SidebarContent user={user} navItems={navItems} pathname={pathname} setSidebarOpen={setSidebarOpen} />
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[var(--surface)] shadow-[var(--shadow-xl)] animate-slide-in-left">
            <SidebarContent user={user} navItems={navItems} pathname={pathname} setSidebarOpen={setSidebarOpen} />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] hidden sm:block">
              {navItems.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label || "Dasbor"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus isOnline={true} />
            <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded-lg transition-colors cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger-500)] rounded-full" />
            </button>
            <div className="relative">
              <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors cursor-pointer">
                <Avatar name={user.name} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">{user.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)] capitalize">{user.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--text-tertiary)] hidden sm:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] z-50 animate-scale-in">
                  <div className="p-2">
                    <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] rounded-md transition-colors">
                      <Settings className="w-4 h-4" /> Pengaturan
                    </Link>
                    <button onClick={() => { logout(); router.push("/"); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger-500)] hover:bg-[var(--danger-50)] rounded-md transition-colors cursor-pointer">
                      <LogOut className="w-4 h-4" /> Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
