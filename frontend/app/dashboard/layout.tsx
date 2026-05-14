"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3, Globe,
  Building2, Settings, Zap, Menu, X, LogOut, ChevronDown, Bell
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar, Badge, ConnectionStatus } from "@/components/ui";
import { DASHBOARD_NAV, ROLES, type UserRole } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, BarChart3, Globe, Building2, Settings,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, switchRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated || !user) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  const navItems = DASHBOARD_NAV.filter((item) =>
    item.roles.includes(user.role)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-[var(--border)]">
        <div className="flex items-center justify-center w-8 h-8 bg-[var(--brand-600)] rounded-lg">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-[var(--text-primary)]">NAPOS</span>
      </div>

      {/* Tenant Info */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{user.tenant.name}</p>
        <Badge variant="brand" size="sm" className="mt-1">{user.tenant.plan} plan</Badge>
      </div>

      {/* Nav */}
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

      {/* Role Switcher (Demo) */}
      <div className="px-3 py-3 border-t border-[var(--border)]">
        <div className="relative">
          <button
            onClick={() => setRoleMenuOpen(!roleMenuOpen)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-[var(--text-tertiary)] bg-[var(--surface-raised)] rounded-lg hover:bg-[var(--slate-100)] transition-colors cursor-pointer dark:hover:bg-[var(--slate-800)]"
          >
            <span>Demo: {ROLES[user.role].label}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {roleMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] overflow-hidden z-50 animate-scale-in">
              {(Object.keys(ROLES) as UserRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => { switchRole(role); setRoleMenuOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer",
                    user.role === role
                      ? "bg-[var(--brand-50)] text-[var(--brand-700)] dark:bg-[var(--brand-950)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                  )}
                >
                  <span className="font-medium">{ROLES[role].label}</span>
                  <span className="block text-xs text-[var(--text-tertiary)]">{ROLES[role].description}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-[var(--surface)] shadow-[var(--shadow-xl)] animate-slide-in-left">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] hidden sm:block">
              {navItems.find((n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href)))?.label || "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionStatus isOnline={true} />
            <button className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded-lg transition-colors cursor-pointer">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--danger-500)] rounded-full" />
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors cursor-pointer"
              >
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
                    <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] rounded-md transition-colors">
                      <Settings className="w-4 h-4" /> Settings
                    </Link>
                    <button onClick={() => { logout(); router.push("/"); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--danger-500)] hover:bg-[var(--danger-50)] rounded-md transition-colors cursor-pointer">
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
