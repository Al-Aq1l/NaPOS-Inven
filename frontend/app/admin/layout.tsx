"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Building2, Menu, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar, ConnectionStatus } from "@/components/ui";
import { ADMIN_NAV } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building2,
};

function AdminSidebarContent({
  user,
  pathname,
  setSidebarOpen,
}: {
  user: { name: string; role: string };
  pathname: string;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="relative flex flex-col h-full bg-[#0a1321] text-slate-200 overflow-hidden select-none">
      {/* Header Logo */}
      <div className="relative flex items-center justify-center px-4 h-20 z-10 select-none bg-slate-950/20 border-b border-white/[0.05]">
        <span className="text-lg font-extrabold tracking-wider text-slate-100 text-center w-full">
          Naps Admin
        </span>
      </div>

      {/* User Quick Info */}
      <div className="mx-3 mt-5 px-4 py-3 rounded-lg bg-slate-900 border-l-2 border-blue-500 space-y-1 z-10">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sistem Manajemen</p>
        <p className="text-sm font-bold text-white truncate">{user.name}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide z-10 px-3 py-4 space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-2">
          Navigasi Utama
        </p>
        {ADMIN_NAV.map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", active ? "text-white" : "text-slate-400 group-hover:text-white")} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Authenticated route protection
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Restrict to superadmin
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (user.role !== "superadmin") {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || !user || user.role !== "superadmin") {
    return null;
  }

  const currentNavLabel = ADMIN_NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label;

  const openSidebar = () => {
    setSidebarClosing(false);
    setSidebarOpen(true);
  };

  const closeMobileSidebar = () => {
    setSidebarClosing(true);
    window.setTimeout(() => {
      setSidebarOpen(false);
      setSidebarClosing(false);
    }, 220);
  };

  return (
    <div className="flex h-screen bg-[var(--background)] text-[var(--text-primary)] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col overflow-hidden border-r border-[#1e293b]/10 bg-[#0a1321] lg:w-60">
        <div className="h-full w-full">
          <AdminSidebarContent
            user={user}
            pathname={pathname}
            setSidebarOpen={setSidebarOpen}
          />
        </div>
      </aside>

      {/* Mobile Sidebar Modal */}
      {sidebarOpen && (
        <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarClosing && "pointer-events-none")}>
          <div
            className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out", sidebarClosing ? "opacity-0" : "opacity-100")}
            onClick={closeMobileSidebar}
          />
          <aside
            className={cn(
              "absolute inset-y-0 left-0 w-60 shadow-2xl transition-transform duration-200 ease-out bg-[#0a1321]",
              sidebarClosing ? "-translate-x-full" : "translate-x-0",
            )}
          >
            <AdminSidebarContent
              user={user}
              pathname={pathname}
              setSidebarOpen={setSidebarOpen}
            />
          </aside>
        </div>
      )}

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xs)] z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={openSidebar}
              aria-label="Buka menu"
              title="Buka menu"
              className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer hover:bg-[var(--surface-raised)] rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-[var(--text-primary)]">
              {currentNavLabel || "Dasbor Super Admin"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <ConnectionStatus isOnline={true} />

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Avatar name={user.name} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold leading-tight text-[var(--text-primary)]">{user.name}</p>
                  <p className="text-[10px] text-[var(--brand-600)] uppercase tracking-widest font-semibold mt-0.5">Super Admin</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-tertiary)] hidden sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-lg)] z-50 animate-scale-in">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        logout();
                        router.push("/");
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[var(--danger-500)] hover:bg-[var(--danger-50)] rounded-md transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Keluar Sistem
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-[var(--surface-raised)] relative">
          <div className="relative max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
