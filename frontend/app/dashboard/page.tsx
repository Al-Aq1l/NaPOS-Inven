"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chart, registerables } from "chart.js";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  DollarSign,
  FileText,
  Hexagon,
  Package,
  PackagePlus,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge, Card, Modal, Button } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fetchDashboardSummary, type DashboardSummary } from "@/lib/dashboard-api";

Chart.register(...registerables);

function ChartCanvas({ id, init, className }: { id: string; init: (ctx: CanvasRenderingContext2D) => Chart; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = init(ref.current.getContext("2d")!);
    return () => chart.destroy();
  }, [init]);

  return <canvas ref={ref} id={id} className={className} />;
}

function formatChartTick(value: number) {
  if (value <= 0) return "Rp0";
  if (value >= 1_000_000) return `Rp${Math.round(value / 1_000_000)}.000.000`;
  if (value >= 1_000) return `Rp${Math.round(value / 1_000)}.000`;
  return `Rp${Math.round(value)}`;
}

function formatOrderChartTick(value: number) {
  return `${Math.round(value)} pesanan`;
}

function formatOrderDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function formatChartTooltip(value: number, mode: "revenue" | "orders") {
  return mode === "revenue" ? formatIDR(value) : `${Math.round(value)} pesanan`;
}

function formatOrderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function formatPaymentMethod(value?: string) {
  const labels: Record<string, string> = {
    cash: "Tunai",
    qris: "QRIS",
    transfer: "Transfer",
  };
  return value ? labels[value] ?? value : "-";
}

function MiniSparkline({
  data,
  type = "line",
  strokeColor = "rgba(255, 255, 255, 0.95)",
  fillColor = "rgba(255, 255, 255, 0.15)",
}: {
  data: number[];
  type?: "line" | "bar";
  strokeColor?: string;
  fillColor?: string;
}) {
  const pointsCount = data.length;
  if (pointsCount === 0) return null;

  const width = 80;
  const height = 30;
  const padding = 2;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min === 0 ? 1 : max - min;

  if (type === "bar") {
    const barWidth = Math.max(3, Math.floor((width - (pointsCount - 1) * 2) / pointsCount));
    return (
      <svg width={width} height={height} className="opacity-95 shrink-0 select-none pointer-events-none">
        {data.map((val, i) => {
          const barHeight = ((val - min) / range) * (height - padding * 2);
          const x = i * (barWidth + 2);
          const y = height - barHeight - padding;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(2, barHeight)}
              fill={strokeColor}
              rx={1}
            />
          );
        })}
      </svg>
    );
  }

  const points = data.map((val, index) => {
    const x = (index / (pointsCount - 1)) * (width - padding * 2) + padding;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(" L ")}`;
  const fillPathData = `M ${padding},${height} L ${points.join(" L ")} L ${width - padding},${height} Z`;

  return (
    <svg width={width} height={height} className="opacity-95 overflow-visible shrink-0 select-none pointer-events-none">
      <path d={fillPathData} fill={fillColor} />
      <path
        d={pathData}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SummaryTile({
  label,
  value,
  helper,
  icon,
  tone,
  sparklineData = [],
  sparklineType = "line",
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "rose";
  sparklineData?: number[];
  sparklineType?: "line" | "bar";
}) {
  const tones = {
    blue: "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/10 hover:from-blue-600 hover:to-blue-700",
    emerald: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/10 hover:from-emerald-600 hover:to-emerald-700",
    amber: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/10 hover:from-amber-600 hover:to-amber-700",
    rose: "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-rose-500/10 hover:from-rose-600 hover:to-rose-700",
  };

  return (
    <Card className={cn("min-h-[105px] rounded-lg p-5 border-none shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5", tones[tone])} padding="none">
      <div className="flex h-full items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-white/80 leading-none">{label}</p>
          <p className="mt-2 text-[19px] sm:text-[21px] xl:text-[22px] font-black leading-none tracking-tight">{value}</p>
          <p className="mt-3.5 text-xs font-semibold leading-none text-white/90 flex items-center gap-1">
            {helper}
          </p>
        </div>
        {sparklineData && sparklineData.length > 0 ? (
          <div className="shrink-0 flex items-center justify-center">
            <MiniSparkline data={sparklineData} type={sparklineType} />
          </div>
        ) : (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
            {icon}
          </span>
        )}
      </div>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--border)] p-6 text-center">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-tertiary)]">{description}</p>
    </div>
  );
}

function getSmartSummary(summary: DashboardSummary, userName: string) {
  const hour = new Date().getHours();
  let timeGreeting = "Selamat pagi";
  if (hour >= 11 && hour < 15) timeGreeting = "Selamat siang";
  else if (hour >= 15 && hour < 18) timeGreeting = "Selamat sore";
  else if (hour >= 18 || hour < 4) timeGreeting = "Selamat malam";

  const firstName = userName.split(" ")[0];
  const greeting = `${timeGreeting}, ${firstName}!`;

  const trend = summary.sales_trend ?? [];
  const todayRev = summary.today_revenue ?? 0;
  const todayOrders = summary.today_orders ?? 0;
  const lowStockCount = (summary.low_stock ?? []).length;

  // Compare with yesterday (second to last in trend)
  const yesterdayRev = trend.length >= 2 ? Number(trend[trend.length - 2]?.total ?? 0) : 0;
  const diffPercent = yesterdayRev > 0 ? Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100) : 0;

  const lines: string[] = [];

  if (todayRev <= 0 && todayOrders <= 0) {
    lines.push("Belum ada transaksi hari ini.");
  } else {
    if (diffPercent > 0) {
      lines.push(`Penjualan hari ini naik ~${diffPercent}% dari kemarin.`);
    } else if (diffPercent < 0) {
      lines.push(`Penjualan hari ini turun ~${Math.abs(diffPercent)}% dari kemarin.`);
    } else if (yesterdayRev > 0) {
      lines.push("Penjualan hari ini stabil seperti kemarin.");
    }
    lines.push(`Sudah ada ${todayOrders} transaksi dengan total ${formatIDR(todayRev)}.`);
  }

  let stockNotice = "";
  if (lowStockCount > 0) {
    stockNotice = `⚠️ Ada ${lowStockCount} barang yang stoknya menipis atau habis — segera restok ya!`;
  }

  return {
    greeting,
    lines,
    stockNotice,
    trendDirection: diffPercent > 0 ? ("up" as const) : diffPercent < 0 ? ("down" as const) : ("flat" as const),
  };
}

function SmartInsightsCard({ summary, userName, loading }: { summary: DashboardSummary | null; userName: string; loading: boolean }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dayName = now.toLocaleDateString("id-ID", { weekday: "long" });
  const dateStr = now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }) + " WIB";

  if (loading || !summary) {
    return (
      <div className="rounded-xl bg-gradient-to-r from-brand-950 to-brand-800 px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-56 rounded bg-white/10 animate-pulse" />
            <div className="h-4 w-72 rounded bg-white/10 animate-pulse" />
          </div>
          <div className="hidden shrink-0 text-right sm:block space-y-1">
            <div className="h-3 w-16 rounded bg-white/10 animate-pulse ml-auto" />
            <div className="h-5 w-32 rounded bg-white/10 animate-pulse" />
            <div className="h-3 w-20 rounded bg-white/10 animate-pulse ml-auto" />
          </div>
        </div>
      </div>
    );
  }

  const insight = getSmartSummary(summary, userName);

  return (
    <div className="rounded-xl bg-gradient-to-r from-brand-950 to-brand-800 px-6 py-5 sm:px-8 sm:py-6">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Greeting + summary */}
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-snug text-white sm:text-xl">
            {insight.greeting}
          </h2>
          <div className="mt-1.5 space-y-0.5">
            {insight.lines.map((line, i) => (
              <p key={i} className="text-sm leading-relaxed text-white/60">
                {line}
              </p>
            ))}
            {insight.stockNotice && (
              <p className="text-sm font-semibold leading-relaxed text-amber-300">
                {insight.stockNotice}
              </p>
            )}
          </div>
        </div>

        {/* Right: Date & time */}
        <div className="hidden shrink-0 text-right sm:block">
          <p className="text-xs font-medium text-white/50">{dayName}</p>
          <p className="mt-0.5 text-lg font-bold leading-tight text-white">{dateStr}</p>
          <p className="mt-0.5 text-xs font-medium text-white/50">{timeStr}</p>
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  {
    label: "Produk & Stok",
    description: "Kelola daftar produk",
    href: "/dashboard/inventory",
    icon: Package,
    bg: "bg-blue-50",
    text: "text-blue-600",
    feature: "inventory",
  },
  {
    label: "Tambah Stok",
    description: "Catat barang masuk",
    href: "/dashboard/inventory/stock-in",
    icon: PackagePlus,
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    feature: "inventory",
  },
  {
    label: "Lihat Laporan",
    description: "Analitik penjualan",
    href: "/dashboard/analytics",
    icon: BarChart3,
    bg: "bg-violet-50",
    text: "text-violet-600",
    feature: "analytics",
  },
];

function QuickActionsGrid() {
  const { canAccess } = useAuth();

  const allowedActions = QUICK_ACTIONS.filter(
    (action) => !action.feature || canAccess(action.feature)
  );

  return (
    <div className={cn("grid gap-3", allowedActions.length === 3 ? "sm:grid-cols-3" : allowedActions.length === 2 ? "sm:grid-cols-2" : "grid-cols-1")}>
      {allowedActions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-colors duration-150 hover:bg-[var(--surface-raised)]"
          >
            <span className={cn("inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", action.bg)}>
              <Icon className={cn("h-4 w-4", action.text)} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-tight text-[var(--text-primary)]">{action.label}</p>
              <p className="mt-0.5 text-xs leading-tight text-[var(--text-tertiary)]">{action.description}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
          </Link>
        );
      })}
    </div>
  );
}

export default function DashboardHome() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<"revenue" | "orders">("revenue");
  const [selectedOrder, setSelectedOrder] = useState<DashboardSummary["recent_orders"][0] | null>(null);

  const refreshDashboard = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setError(null);
      const data = await fetchDashboardSummary();
      setSummary(data);
      setError(null);
    } catch {
      if (isInitial) setError("Gagal memuat data dashboard.");
    } finally {
      if (isInitial) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshDashboard(true);
  }, [refreshDashboard]);

  // Auto-refresh: polling setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => refreshDashboard(false), 30_000);
    return () => clearInterval(interval);
  }, [refreshDashboard]);

  // Auto-refresh: saat tab kembali aktif (misal setelah pakai POS di tab lain)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        refreshDashboard(false);
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [refreshDashboard]);

  const salesData = useMemo(() => {
    const trend = summary?.sales_trend ?? [];
    return {
      labels: trend.map((row) => row.label),
      revenueValues: trend.map((row) => Number(row.total)),
      orderValues: trend.map((row) => Number(row.orders)),
    };
  }, [summary]);

  const todayRevenue = summary?.today_revenue ?? 0;
  const todayOrders = summary?.today_orders ?? 0;
  const productCount = summary?.product_count ?? 0;
  const recentOrders = summary?.recent_orders ?? [];
  const lowStock = summary?.low_stock ?? [];
  const visibleLowStock = lowStock.slice(0, 4);
  const chartValues = chartMode === "revenue" ? salesData.revenueValues : salesData.orderValues;
  const hasSalesData = chartValues.some((value) => value > 0);
  const chartLabel = chartMode === "revenue" ? "Pendapatan" : "Pesanan";
  const chartSubtitle = `${chartLabel} · bulan ini`;
  const chartColor = chartMode === "revenue" ? "#2563eb" : "#10b981";

  // Comparison metrics for cards
  const revenueDiff = useMemo(() => {
    const trend = summary?.sales_trend ?? [];
    const yesterdayRevenue = trend.length >= 2 ? Number(trend[trend.length - 2]?.total ?? 0) : 0;
    return yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : 0;
  }, [summary, todayRevenue]);

  const ordersDiff = useMemo(() => {
    const trend = summary?.sales_trend ?? [];
    const yesterdayOrders = trend.length >= 2 ? Number(trend[trend.length - 2]?.orders ?? 0) : 0;
    return yesterdayOrders > 0 ? Math.round(((todayOrders - yesterdayOrders) / yesterdayOrders) * 100) : 0;
  }, [summary, todayOrders]);

  const productSparkline = useMemo(() => {
    return productCount > 0 
      ? [
          Math.max(0, productCount - 8),
          Math.max(0, productCount - 6),
          Math.max(0, productCount - 5),
          Math.max(0, productCount - 3),
          Math.max(0, productCount - 2),
          Math.max(0, productCount - 1),
          productCount
        ] 
      : [2, 4, 3, 5, 4, 6, 7];
  }, [productCount]);

  const lowStockSparkline = useMemo(() => {
    return [
      lowStock.length + 8,
      lowStock.length + 6,
      lowStock.length + 7,
      lowStock.length + 4,
      lowStock.length + 3,
      lowStock.length + 1,
      lowStock.length
    ];
  }, [lowStock.length]);

  if (!user) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label="Pendapatan Hari Ini"
          value={formatIDR(todayRevenue)}
          helper={revenueDiff > 0 ? `↑ +${revenueDiff}% dari kemarin` : revenueDiff < 0 ? `↓ ${revenueDiff}% dari kemarin` : "Stabil dari kemarin"}
          icon={<DollarSign className="h-5 w-5" />}
          tone="blue"
          sparklineData={salesData.revenueValues}
          sparklineType="line"
        />
        <SummaryTile
          label="Transaksi Hari Ini"
          value={`${todayOrders}`}
          helper={ordersDiff > 0 ? `↑ +${ordersDiff}% dari kemarin` : ordersDiff < 0 ? `↓ ${ordersDiff}% dari kemarin` : "Stabil dari kemarin"}
          icon={<FileText className="h-5 w-5" />}
          tone="emerald"
          sparklineData={salesData.orderValues}
          sparklineType="line"
        />
        <SummaryTile
          label="Total Produk"
          value={`${productCount}`}
          helper="Produk terdaftar"
          icon={<Hexagon className="h-5 w-5" />}
          tone="amber"
          sparklineData={productSparkline}
          sparklineType="bar"
        />
        <SummaryTile
          label="Stok Menipis"
          value={`${lowStock.length}`}
          helper={lowStock.length > 0 ? "Perlu perhatian segera" : "Semua stok aman"}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="rose"
          sparklineData={lowStockSparkline}
          sparklineType="line"
        />
      </div>

      <QuickActionsGrid />

      <div className="grid gap-[18px] xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <Card className="h-auto overflow-hidden rounded-lg shadow-[var(--shadow-sm)] xl:h-[338px]" padding="none">
          <div className="flex items-center justify-between gap-3 px-[18px] pb-2.5 pt-4">
            <div>
              <h2 className="text-base font-black leading-tight text-[var(--text-primary)]">Ringkasan Penjualan</h2>
              <p className="mt-0.5 text-xs leading-snug text-[var(--text-tertiary)]">{chartSubtitle}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setChartMode("revenue")}
                className={cn(
                  "min-h-[30px] rounded-lg border px-3 py-1.5 text-xs font-bold leading-none transition-colors",
                  chartMode === "revenue"
                    ? "border border-[var(--brand-600)] bg-blue-50 text-[var(--brand-600)]"
                    : "border border-transparent text-[var(--text-primary)] hover:bg-[var(--surface-raised)]",
                )}
              >
                Pendapatan
              </button>
              <button
                type="button"
                onClick={() => setChartMode("orders")}
                className={cn(
                  "min-h-[30px] rounded-lg border px-3 py-1.5 text-xs font-bold leading-none transition-colors",
                  chartMode === "orders"
                    ? "border border-emerald-500 bg-emerald-50 text-emerald-600"
                    : "border border-transparent text-[var(--text-primary)] hover:bg-[var(--surface-raised)]",
                )}
              >
                Pesanan
              </button>
            </div>
          </div>

          {!loading && !hasSalesData ? (
            <EmptyState title="Belum ada data penjualan" description="Grafik akan muncul setelah transaksi mulai tercatat." />
          ) : (
            <div className="h-[252px] px-[18px] pb-4 pt-2 max-xl:h-80">
              <ChartCanvas
                id="dashboard-sales-trend"
                className="cursor-crosshair"
                init={(ctx) => new Chart(ctx, {
                  type: "line",
                  data: {
                    labels: salesData.labels,
                    datasets: [
                      {
                        label: chartLabel,
                        data: chartValues,
                        borderColor: chartColor,
                        backgroundColor: (() => {
                          const gradient = ctx.createLinearGradient(0, 0, 0, 210);
                          if (chartMode === "revenue") {
                            gradient.addColorStop(0, "rgba(37, 99, 235, 0.12)");
                            gradient.addColorStop(1, "rgba(37, 99, 235, 0.00)");
                          } else {
                            gradient.addColorStop(0, "rgba(16, 185, 129, 0.12)");
                            gradient.addColorStop(1, "rgba(16, 185, 129, 0.00)");
                          }
                          return gradient;
                        })(),
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHitRadius: 18,
                        pointHoverRadius: 5,
                        pointHoverBorderWidth: 2,
                        pointHoverBackgroundColor: chartColor,
                        pointHoverBorderColor: "#fff",
                      },
                    ],
                  },
                  options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    interaction: {
                      mode: "index",
                      intersect: false,
                    },
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        enabled: true,
                        intersect: false,
                        mode: "index",
                        displayColors: false,
                        backgroundColor: "rgba(17, 24, 39, 0.94)",
                        titleColor: "#fff",
                        bodyColor: "#fff",
                        borderColor: "rgba(255, 255, 255, 0.14)",
                        borderWidth: 1,
                        padding: 10,
                        callbacks: {
                          label: (context) => `${chartLabel}: ${formatChartTooltip(Number(context.parsed.y), chartMode)}`,
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(...chartValues, chartMode === "revenue" ? 1_000_000 : 10),
                        ticks: {
                          color: "#9ca3af",
                          callback: (value) => (
                            chartMode === "revenue"
                              ? formatChartTick(Number(value))
                              : formatOrderChartTick(Number(value))
                          ),
                          font: { size: 12, weight: 500 },
                        },
                        grid: { color: "rgba(0, 0, 0, 0.04)" },
                        border: { display: false },
                      },
                      x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                          color: "#9ca3af",
                          maxTicksLimit: 10,
                          font: { size: 12, weight: 500 },
                        },
                      },
                    },
                  },
                })}
              />
            </div>
          )}
        </Card>

        <Card className="h-auto overflow-hidden rounded-lg shadow-[var(--shadow-sm)] xl:h-[338px]" padding="none">
          <div className="flex items-center justify-between gap-3 px-[18px] pb-2.5 pt-4">
            <h2 className="text-base font-black leading-tight text-[var(--text-primary)]">Peringatan Stok</h2>
            <Link
              href="/dashboard/inventory"
              className="inline-flex h-[30px] items-center justify-center whitespace-nowrap rounded-lg border border-[var(--border)] px-3 text-xs font-bold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="px-[18px] pb-4 pt-2.5">
            {visibleLowStock.length === 0 ? (
              <EmptyState title="Stok aman" description="Belum ada produk yang berada di bawah batas ROP." />
            ) : (
              <div className="flex flex-col gap-2.5">
                {visibleLowStock.map((item) => {
                  const empty = item.stock <= 0;
                  return (
                    <Link
                      key={item.id}
                      href="/dashboard/inventory"
                      className={cn(
                        "flex min-h-[54px] items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 transition-colors hover:bg-[var(--surface)]",
                        empty ? "border-l-4 border-l-[var(--danger-500)]" : "border-l-4 border-l-[var(--warning-500)]",
                      )}
                    >
                      <div className={cn("inline-flex h-6 w-6 shrink-0 items-center justify-center", empty ? "text-[var(--danger-500)]" : "text-[var(--warning-500)]")}>
                        {empty ? (
                          <AlertCircle className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-extrabold leading-tight text-[var(--text-primary)]">{item.name}</p>
                        <p className="mt-0.5 truncate text-xs leading-tight text-[var(--text-tertiary)]">
                          {item.category_name || "Produk"} · {item.sku || "Tanpa SKU"}
                        </p>
                      </div>
                      <Badge variant={empty ? "danger" : "warning"} size="sm">
                        {empty ? "Habis" : `${item.stock} sisa`}
                      </Badge>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-lg shadow-[var(--shadow-sm)]" padding="none">
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)]">Transaksi Terakhir</h2>
            <p className="mt-1 text-sm text-[var(--text-tertiary)]">{Math.min(recentOrders.length, 5)} penjualan terbaru</p>
          </div>
          <Link
            href="/dashboard/analytics"
            className="inline-flex h-9 w-fit items-center rounded-lg border border-[var(--border)] px-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--surface-raised)]"
          >
            Lihat Semua
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="Belum ada transaksi" description="Transaksi yang masuk dari POS akan tampil di sini." />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-[760px] w-full text-left">
                <thead className="bg-[var(--surface-raised)] text-xs font-black uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  <tr>
                    <th className="px-5 py-4">No. Referensi</th>
                    <th className="px-5 py-4">Jumlah Item</th>
                    <th className="px-5 py-4">Pembayaran</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {recentOrders.slice(0, 5).map((order) => (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="cursor-pointer transition-colors hover:bg-[var(--surface-raised)]"
                    >
                      <td className="px-5 py-4 font-mono text-sm font-black text-[var(--brand-600)]">
                        INV-{String(order.id).padStart(6, "0")}
                      </td>
                      <td className="px-5 py-4 text-sm font-semibold text-[var(--text-secondary)]">{order.item_count} item</td>
                      <td className="px-5 py-4">
                        <Badge variant="default" size="md">{formatPaymentMethod(order.payment_method)}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={order.status === "completed" ? "success" : "warning"} size="md">
                          {order.status === "completed" ? "Selesai" : "Proses"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-sm font-black text-[var(--text-primary)]">{formatIDR(Number(order.total_amount))}</td>
                      <td className="px-5 py-4 text-sm font-medium text-[var(--text-tertiary)]">
                        {formatOrderDate(order.created_at)}, {formatOrderTime(order.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-[var(--border)] px-5">
              {recentOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="py-4 flex flex-col gap-2 cursor-pointer active:bg-[var(--surface-raised)] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-[var(--brand-600)]">
                      INV-{String(order.id).padStart(6, "0")}
                    </span>
                    <Badge variant={order.status === "completed" ? "success" : "warning"} size="sm">
                      {order.status === "completed" ? "Selesai" : "Proses"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                    <span>{order.item_count} item · {formatPaymentMethod(order.payment_method)}</span>
                    <span>{formatOrderDate(order.created_at)}, {formatOrderTime(order.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">Total:</span>
                    <span className="text-sm font-black text-[var(--text-primary)]">{formatIDR(Number(order.total_amount))}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title="Detail Transaksi"
        size="sm"
      >
        {selectedOrder && (
          <div className="space-y-4">
            <div className="text-center pb-4 border-b border-[var(--border)]">
              <p className="text-xs text-[var(--text-tertiary)]">ID Transaksi</p>
              <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                INV-{String(selectedOrder.id).padStart(6, "0")}
              </p>
              <Badge variant={selectedOrder.status === "completed" ? "success" : "warning"} className="mt-2">
                {selectedOrder.status === "completed" ? "Selesai" : "Proses"}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-[var(--text-secondary)]">Waktu</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {new Date(selectedOrder.created_at).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--text-secondary)]">Pembayaran</span>
                <span className="font-bold text-[var(--text-primary)]">{formatPaymentMethod(selectedOrder.payment_method)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[var(--text-secondary)]">Jumlah Item</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedOrder.item_count} item</span>
              </div>
              <div className="flex justify-between gap-4 pt-3 border-t border-[var(--border)] text-base font-extrabold text-[var(--text-primary)]">
                <span>Total Pembayaran</span>
                <span className="text-[var(--brand-600)]">{formatIDR(Number(selectedOrder.total_amount))}</span>
              </div>
            </div>

            <Button
              className="w-full mt-4 h-10 text-xs font-bold"
              onClick={() => setSelectedOrder(null)}
            >
              Tutup
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
