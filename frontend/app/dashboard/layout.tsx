"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard, ShoppingCart, Package, BarChart3, Globe,
  Building2, Settings, Menu, LogOut, ChevronDown, Bell,
  PackagePlus, PackageMinus, ArrowRightLeft, ClipboardList, Calculator, AlertTriangle, History, PanelLeftClose
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Avatar, Badge, ConnectionStatus } from "@/components/ui";
import { DASHBOARD_NAV, type UserRole } from "@/lib/constants";
import { fetchDashboardSummary, type DashboardSummary } from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ElementType> = {
  LayoutDashboard, ShoppingCart, Package, BarChart3, Globe, Building2, Settings,
  PackagePlus, PackageMinus, ArrowRightLeft, ClipboardList, Calculator, History,
};

const SIDEBAR_SECTIONS = [
  {
    id: "operations",
    label: "Operasional",
    items: ["/dashboard", "/dashboard/pos"],
  },
  {
    id: "inventory",
    label: "Inventori",
    items: [
      "/dashboard/inventory",
      "/dashboard/inventory/stock-in",
      "/dashboard/inventory/stock-out",
      "/dashboard/inventory/history",
      "/dashboard/inventory/transfers",
      "/dashboard/inventory/opname",
      "/dashboard/inventory/optimization",
    ],
  },
  {
    id: "reports",
    label: "Laporan",
    items: ["/dashboard/analytics"],
  },
  {
    id: "system",
    label: "Sistem",
    items: ["/dashboard/branches", "/dashboard/settings"],
  },
];

function SidebarContent({
  user,
  navItems,
  pathname,
  currentHref,
  setSidebarOpen,
  onClose,
}: {
  user: { tenant: { name: string; plan: string }; role: UserRole };
  navItems: Array<{ href: string; label: string; icon: string }>;
  pathname: string;
  currentHref: string;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onClose?: () => void;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operations: true,
    inventory: true,
    reports: true,
    system: true,
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  return (
    <div className="flex flex-col h-full bg-[#1f2a37] text-slate-300">
      <div className="relative flex items-center justify-center px-4 h-28 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] [background-size:12px_12px]">
        <Image
          src="/logo2.png"
          alt="NAPS"
          width={190}
          height={76}
          priority
          className="h-16 w-auto object-contain"
        />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            title="Tutup menu"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mx-3 mt-5 px-4 py-3 rounded-xl bg-white/[0.06] shadow-[0_10px_24px_-18px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] space-y-1.5">
        <p className="text-sm font-semibold text-white leading-snug break-words">{user.tenant.name}</p>
        <Badge variant="brand" size="sm" className="inline-flex w-fit">Paket {user.tenant.plan}</Badge>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto scrollbar-hide">
        {SIDEBAR_SECTIONS.map((section) => {
          const sectionItems = section.items
            .map((href) => navItems.find((item) => item.href === href))
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

          if (sectionItems.length === 0) return null;

          const sectionOpen = openSections[section.id];

          return (
            <div key={section.id} className="space-y-1">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-slate-300 cursor-pointer"
              >
                <span>{section.label}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", sectionOpen ? "rotate-0" : "-rotate-90")} />
              </button>

              {sectionOpen && (
                <div className="space-y-1">
                  {sectionItems.map((item) => {
                    const Icon = ICONS[item.icon] || LayoutDashboard;
                    const itemPath = item.href.split("?")[0];
                    const currentHasQuery = currentHref.includes("?");
                    const active = item.href.includes("?")
                      ? currentHref === item.href
                      : currentHasQuery && pathname === itemPath
                        ? false
                      : pathname === itemPath || (
                        itemPath !== "/dashboard" &&
                        itemPath !== "/dashboard/inventory" &&
                        itemPath !== "/dashboard/branches" &&
                        pathname.startsWith(`${itemPath}/`)
                      );
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                          active
                            ? "bg-white/10 text-white"
                            : "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="px-3 py-3">
        <div className="w-full px-3 py-2 text-xs font-medium text-slate-400 bg-white/[0.04] rounded-lg">
          Role login: {user.role}
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout, canAccess } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarClosing, setSidebarClosing] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationToastOpen, setNotificationToastOpen] = useState(false);
  const [stockAlerts, setStockAlerts] = useState<DashboardSummary["low_stock"]>([]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;

    if (user.role === "cashier" && pathname === "/dashboard") {
      router.replace("/dashboard/pos");
      return;
    }

    const routePermissions: Array<{ prefix: string; feature: string }> = [
      { prefix: "/dashboard/settings/billing", feature: "settings.billing" },
      { prefix: "/dashboard/settings", feature: "settings" },
      { prefix: "/dashboard/branches", feature: "branches" },
      { prefix: "/dashboard/channels", feature: "channels" },
      { prefix: "/dashboard/analytics", feature: "analytics" },
      { prefix: "/dashboard/inventory/transfers", feature: "inventory.transfers" },
      { prefix: "/dashboard/inventory/opname", feature: "inventory.opname" },
      { prefix: "/dashboard/inventory/optimization", feature: "inventory.optimization" },
      { prefix: "/dashboard/inventory", feature: "inventory" },
      { prefix: "/dashboard/pos", feature: "pos" },
    ];

    const matched = routePermissions.find((item) => pathname.startsWith(item.prefix));
    if (matched && !canAccess(matched.feature)) {
      router.replace(`/dashboard/forbidden?from=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, user, pathname, canAccess, router]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user || user.role === "cashier") return;

    let mounted = true;
    fetchDashboardSummary()
      .then((summary) => {
        if (!mounted) return;
        setStockAlerts(summary.low_stock ?? []);

        if (pathname !== "/dashboard" || (summary.low_stock ?? []).length === 0) return;

        const today = new Date().toISOString().slice(0, 10);
        const storageKey = `dashboard-stock-alert:${user.tenant.id}:${today}`;
        if (sessionStorage.getItem(storageKey)) return;

        setNotificationToastOpen(true);
        sessionStorage.setItem(storageKey, "shown");
      })
      .catch(() => {
        if (mounted) setStockAlerts([]);
      });

    return () => {
      mounted = false;
    };
  }, [isLoading, isAuthenticated, user, pathname]);

  useEffect(() => {
    if (!notificationToastOpen) return;

    const timer = window.setTimeout(() => {
      setNotificationToastOpen(false);
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [notificationToastOpen]);

  if (isLoading || !isAuthenticated || !user) {
    return null;
  }

  const navFeatureByHref: Record<string, string> = {
    "/dashboard/pos": "pos",
    "/dashboard/inventory": "inventory",
    "/dashboard/inventory/stock-in": "inventory",
    "/dashboard/inventory/stock-out": "inventory",
    "/dashboard/inventory/history": "inventory",
    "/dashboard/inventory/transfers": "inventory.transfers",
    "/dashboard/inventory/opname": "inventory.opname",
    "/dashboard/inventory/optimization": "inventory.optimization",
    "/dashboard/analytics": "analytics",
    "/dashboard/channels": "channels",
    "/dashboard/branches": "branches",
    "/dashboard/settings": "settings",
  };
  const navItems = DASHBOARD_NAV.filter((item) => {
    const feature = navFeatureByHref[item.href];
    return item.roles.includes(user.role) && (!feature || canAccess(feature));
  });
  const query = searchParams.toString();
  const currentHref = query ? `${pathname}?${query}` : pathname;
  const currentNavLabel = navItems.find((item) => {
    const itemPath = item.href.split("?")[0];
    const currentHasQuery = currentHref.includes("?");
    return item.href.includes("?")
      ? currentHref === item.href
      : currentHasQuery && pathname === itemPath
        ? false
      : pathname === itemPath || (
        itemPath !== "/dashboard" &&
        itemPath !== "/dashboard/inventory" &&
        itemPath !== "/dashboard/branches" &&
        pathname.startsWith(`${itemPath}/`)
      );
  })?.label;
  const cashierPosMode = user.role === "cashier" && pathname.startsWith("/dashboard/pos");

  const openSidebar = () => {
    setSidebarClosing(false);
    setSidebarOpen(true);
    setDesktopSidebarOpen(true);
  };

  const closeMobileSidebar = () => {
    setSidebarClosing(true);
    window.setTimeout(() => {
      setSidebarOpen(false);
      setSidebarClosing(false);
    }, 220);
  };

  if (cashierPosMode) {
    return (
      <div className="h-screen overflow-hidden bg-[var(--background)]">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      <aside
        className={cn(
          "hidden lg:flex flex-col overflow-hidden bg-[#1f2a37] transition-[width] duration-300 ease-in-out",
          desktopSidebarOpen ? "lg:w-64" : "lg:w-0",
        )}
      >
        <div className={cn("h-full w-64 transition-opacity duration-200", desktopSidebarOpen ? "opacity-100" : "opacity-0")}>
          <SidebarContent
            user={user}
            navItems={navItems}
            pathname={pathname}
            currentHref={currentHref}
            setSidebarOpen={setSidebarOpen}
            onClose={() => setDesktopSidebarOpen(false)}
          />
        </div>
      </aside>
      {sidebarOpen && (
        <div className={cn("fixed inset-0 z-50 lg:hidden", sidebarClosing && "pointer-events-none")}>
          <div
            className={cn("absolute inset-0 bg-black/50 transition-opacity duration-200 ease-out", sidebarClosing ? "opacity-0" : "opacity-100")}
            onClick={closeMobileSidebar}
          />
          <aside
            className={cn(
              "absolute inset-y-0 left-0 w-64 bg-[#1f2a37] shadow-[var(--shadow-xl)] transition-transform duration-200 ease-out",
              sidebarClosing ? "-translate-x-full" : "translate-x-0 animate-slide-in-left",
            )}
          >
            <SidebarContent
              user={user}
              navItems={navItems}
              pathname={pathname}
              currentHref={currentHref}
              setSidebarOpen={setSidebarOpen}
              onClose={closeMobileSidebar}
            />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3">
            <button
              onClick={openSidebar}
              aria-label="Buka menu"
              title="Buka menu"
              className={cn(
                "p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer",
                desktopSidebarOpen && "lg:hidden",
              )}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-[var(--text-primary)] hidden sm:block">
              {currentNavLabel || "Dasbor"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ConnectionStatus isOnline={true} />
            {user.role !== "cashier" && (
              <div className="relative">
                <button
                  onClick={() => setNotificationOpen((open) => !open)}
                  className="relative p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-raised)] rounded-lg transition-colors cursor-pointer"
                  aria-label="Buka notifikasi"
                >
                  <Bell className="w-5 h-5" />
                  {stockAlerts.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-[var(--danger-500)] px-1 text-[10px] font-bold leading-4 text-white">
                      {stockAlerts.length > 9 ? "9+" : stockAlerts.length}
                    </span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
                    <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] p-4">
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">Notifikasi</p>
                        <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">Hal yang perlu dicek hari ini.</p>
                      </div>
                      {stockAlerts.length > 0 && <Badge variant="warning">{stockAlerts.length} stok</Badge>}
                    </div>

                    <div className="max-h-80 overflow-y-auto p-2">
                      {stockAlerts.length === 0 ? (
                        <div className="p-4 text-sm text-[var(--text-secondary)]">
                          Tidak ada notifikasi penting saat ini.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {stockAlerts.slice(0, 8).map((item) => (
                            <div key={item.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className={cn("mt-0.5 h-4 w-4 flex-shrink-0", item.stock <= 0 ? "text-rose-500" : "text-amber-500")} />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                                  <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{item.sku || "Tanpa SKU"} · ROP {item.rop}</p>
                                </div>
                                <Badge variant={item.stock <= 0 ? "danger" : "warning"} size="sm">{item.stock} stok</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-[var(--border)] p-3">
                      <button
                        onClick={() => setNotificationOpen(false)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                      >
                        Tutup
                      </button>
                      <Link
                        href="/dashboard/inventory"
                        onClick={() => setNotificationOpen(false)}
                        className="rounded-lg bg-[var(--brand-600)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-700)]"
                      >
                        Cek Stok
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                    {canAccess("settings") && (
                      <Link href="/dashboard/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] rounded-md transition-colors">
                        <Settings className="w-4 h-4" /> Pengaturan
                      </Link>
                    )}
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

      {user.role !== "cashier" && notificationToastOpen && stockAlerts.length > 0 && (
        <div className="fixed right-4 top-20 z-[60] w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
          <button
            onClick={() => setNotificationToastOpen(false)}
            className="absolute right-2 top-2 rounded-md px-1.5 text-sm font-bold text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            aria-label="Tutup notifikasi"
          >
            x
          </button>
          <button
            onClick={() => {
              setNotificationToastOpen(false);
              setNotificationOpen(true);
            }}
            className="flex w-full items-start gap-3 p-4 pr-8 text-left"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--text-primary)]">Notifikasi Stok</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Ada {stockAlerts.length} produk menipis atau habis. Klik untuk lihat rincian.
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
