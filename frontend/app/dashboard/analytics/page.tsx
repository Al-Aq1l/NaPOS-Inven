"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge, DataTable } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { AlertTriangle, Lock, Package, ReceiptText, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOrders, fetchProducts, type ApiOrder, type ApiProduct, fetchBranches, type ApiBranch } from "@/lib/dashboard-api";

Chart.register(...registerables);

function ChartCanvas({ id, init }: { id: string; init: (ctx: CanvasRenderingContext2D) => Chart }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = init(ref.current.getContext("2d")!);
    return () => chart.destroy();
  }, [init]);
  return <canvas ref={ref} id={id} />;
}

function formatChartTick(value: number) {
  if (value <= 0) return "0";
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} Jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} Rb`;
  return `${Math.round(value)}`;
}

function createChartGradient(
  ctx: CanvasRenderingContext2D,
  color: "blue" | "emerald",
  height = 240,
) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  if (color === "emerald") {
    gradient.addColorStop(0, "rgba(16, 185, 129, 0.12)");
    gradient.addColorStop(1, "rgba(16, 185, 129, 0.00)");
    return gradient;
  }
  gradient.addColorStop(0, "rgba(37, 99, 235, 0.12)");
  gradient.addColorStop(1, "rgba(37, 99, 235, 0.00)");
  return gradient;
}

function AnalyticsMetric({
  label,
  value,
  helper,
  icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone: "blue" | "emerald" | "amber" | "rose";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <Card className="min-h-[92px] rounded-lg p-4 shadow-[var(--shadow-sm)]" padding="none">
      <div className="flex h-full items-center gap-3">
        <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight text-[var(--text-secondary)] sm:text-[13px]">{label}</p>
          <p className="mt-1 truncate text-[22px] font-black leading-none tracking-normal text-[var(--text-primary)] sm:text-2xl">
            {value}
          </p>
          <p className={cn("mt-0.5 text-xs font-semibold leading-tight sm:text-[13px]", tone === "rose" ? "text-rose-500" : tone === "amber" ? "text-[var(--text-tertiary)]" : "text-emerald-500")}>
            {helper}
          </p>
        </div>
      </div>
    </Card>
  );
}

type TopProductRow = {
  name: string;
  qty: number;
  price: number;
  rank: number;
};

function getResponseStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("response" in error)) return undefined;
  return (error as { response?: { status?: number } }).response?.status;
}

function TierGate({ required, current, children }: { required: string[]; current: string; children: React.ReactNode }) {
  if (required.includes(current)) return <>{children}</>;
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-0 z-10 bg-white/45 dark:bg-black/45 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 bg-gradient-to-tr from-[var(--brand-600)] to-blue-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20 text-white">
          <Lock className="w-7 h-7" />
        </div>
        <p className="font-extrabold text-[var(--text-primary)] text-base">Analitik Premium Terkunci</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1.5 max-w-xs leading-relaxed">
          Dapatkan wawasan bisnis yang lebih mendalam dengan peningkatan visualisasi, tren margin, dan analisis perilaku pelanggan.
        </p>
        <div className="mt-3 text-[10px] font-bold text-[var(--brand-600)] bg-[var(--brand-50)] dark:bg-[var(--brand-950)]/40 dark:text-[var(--brand-300)] px-2.5 py-0.5 rounded-full border border-[var(--brand-100)] dark:border-[var(--brand-900)]">
          Tersedia di paket: {required.map(r => r.toUpperCase()).join(" / ")}
        </div>
        <a
          href="/dashboard/settings?tab=billing"
          className="mt-4 inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 text-xs font-bold text-white shadow-md hover:bg-[var(--brand-700)] transition-all active:scale-95"
        >
          Upgrade Paket Sekarang
        </a>
      </div>
      <div className="opacity-15 pointer-events-none">{children}</div>
    </div>
  );
}

export default function AnalitikPage() {
  const { user, canAccess } = useAuth();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "month" | "year">("month");
  const [error, setError] = useState<string | null>(null);
  const analyticsAllowed = canAccess("analytics");
  const plan = user?.tenant.plan ?? "starter";

  useEffect(() => {
    if (!user || !analyticsAllowed) return;

    let isMounted = true;
    async function loadData() {
      try {
        setError(null);
        const [ordersData, productsData, branchesData] = await Promise.all([
          fetchOrders(),
          fetchProducts(),
          fetchBranches(),
        ]);
        if (!isMounted) return;
        setOrders(ordersData);
        setProducts(productsData);
        setBranches(branchesData);
      } catch (err: unknown) {
        if (!isMounted) return;
        const status = getResponseStatus(err);
        if (status === 401) {
          setError("Sesi login berakhir. Silakan login ulang.");
        } else {
          setError("Gagal memuat data analitik.");
        }
        setOrders([]);
        setProducts([]);
        setBranches([]);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user, analyticsAllowed]);

  const filteredOrders = useMemo(() => {
    let result = orders;

    // 1. Filter by branch
    if (selectedBranchId !== null) {
      result = result.filter((o) => o.branch_id === selectedBranchId);
    }

    // 2. Filter by date range
    const now = new Date();
    result = result.filter((order) => {
      const d = new Date(order.created_at);
      if (dateRange === "7d") {
        const diff = now.getTime() - d.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      }
      if (dateRange === "30d") {
        const diff = now.getTime() - d.getTime();
        return diff <= 30 * 24 * 60 * 60 * 1000;
      }
      if (dateRange === "month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      if (dateRange === "year") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });

    return result;
  }, [orders, selectedBranchId, dateRange]);

  const salesData = useMemo(() => {
    if (dateRange === "7d" || dateRange === "30d") {
      const daysCount = dateRange === "7d" ? 7 : 30;
      const labels: string[] = [];
      const values: number[] = new Array(daysCount).fill(0);
      const now = new Date();
      
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        labels.push(d.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }));
      }
      
      for (const order of filteredOrders) {
        const orderDate = new Date(order.created_at);
        const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 0 && diffDays < daysCount) {
          const index = daysCount - 1 - diffDays;
          values[index] += Number(order.total_amount);
        }
      }
      return { labels, values };
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthLabels = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
    const labels = monthLabels.slice(0, currentMonth + 1);
    const monthTotals = new Array(currentMonth + 1).fill(0);

    for (const order of filteredOrders) {
      const d = new Date(order.created_at);
      if (d.getFullYear() === currentYear && d.getMonth() <= currentMonth) {
        monthTotals[d.getMonth()] += Number(order.total_amount);
      }
    }

    return { labels, values: monthTotals };
  }, [filteredOrders, dateRange]);

  const hourlyData = useMemo(() => {
    const labels = Array.from({ length: 16 }, (_, i) => String(i + 6));
    const values = new Array(16).fill(0);
    for (const order of filteredOrders) {
      const hour = new Date(order.created_at).getHours();
      if (hour >= 6 && hour <= 21) values[hour - 6] += 1;
    }
    return { labels, values };
  }, [filteredOrders]);

  const categoryData = useMemo(() => {
    const countByCategory = new Map<string, number>();
    for (const p of products) {
      const name = p.category?.name ?? "Lainnya";
      countByCategory.set(name, (countByCategory.get(name) ?? 0) + 1);
    }
    const entries = Array.from(countByCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    return {
      labels: entries.map((e) => e[0]),
      values: entries.map((e) => e[1]),
      colors: ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#60a5fa", "#94a3b8"],
    };
  }, [products]);

  const topProducts = useMemo(() => {
    const productMap = new Map<number, { name: string; qty: number; price: number }>();
    for (const order of filteredOrders) {
      for (const item of order.items ?? []) {
        const name = item.product?.name ?? `Produk #${item.product_id}`;
        const price = Number(item.price) || 0;
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.qty += item.quantity;
        } else {
          productMap.set(item.product_id, { name, qty: item.quantity, price });
        }
      }
    }
    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
  }, [filteredOrders]);

  const topProductsWithRank = useMemo(() => {
    return topProducts.map((p, index) => ({ ...p, rank: index + 1 }));
  }, [topProducts]);

  const getTotalStock = useCallback((product: ApiProduct) => {
    if (selectedBranchId === null) {
      return (product.branches ?? []).reduce((sum, branch) => sum + (branch.pivot?.stock ?? 0), 0);
    }
    const b = (product.branches ?? []).find((branch) => branch.id === selectedBranchId);
    return b?.pivot?.stock ?? 0;
  }, [selectedBranchId]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => getTotalStock(p) <= p.rop),
    [products, getTotalStock],
  );

  const totalRevenue = useMemo(() => filteredOrders.reduce((sum, o) => sum + Number(o.total_amount), 0), [filteredOrders]);
  const totalTransactions = filteredOrders.length;
  const avgBasket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const uniqueCustomers = useMemo(() => new Set(filteredOrders.map((o) => (o.customer_name || "").trim()).filter(Boolean)).size, [filteredOrders]);
  const stockValuation = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.cost_price) * getTotalStock(p), 0),
    [products, getTotalStock],
  );

  const hasSalesData = salesData.values.some((v) => v > 0);
  const hasHourlyData = hourlyData.values.some((v) => v > 0);

  if (!user) return null;

  if (!analyticsAllowed) {
    return (
      <Card>
        <p className="text-sm text-[var(--danger-500)]">Anda tidak memiliki akses ke halaman analitik.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analitik</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Ringkasan performa usaha secara real-time</p>
        </div>
        <Badge variant="info">Live</Badge>
      </div>

      {/* Bilah Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-xs)]">
        {/* Dropdown Cabang */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Cabang:</span>
          <select
            value={selectedBranchId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedBranchId(val === "" ? null : Number(val));
            }}
            className="h-9 px-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-xs font-bold text-[var(--text-primary)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            <option value="">Semua Cabang</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Preset Tanggal */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          {(
            [
              { label: "7 Hari Terakhir", val: "7d" },
              { label: "30 Hari Terakhir", val: "30d" },
              { label: "Bulan Ini", val: "month" },
              { label: "Tahun Ini", val: "year" },
            ] as const
          ).map((item) => (
            <button
              key={item.val}
              onClick={() => setDateRange(item.val)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap",
                dateRange === item.val
                  ? "border-[var(--brand-600)] bg-blue-50 text-[var(--brand-600)]"
                  : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--slate-150)] dark:hover:bg-[var(--slate-800)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AnalyticsMetric label="Pendapatan" value={formatIDR(totalRevenue)} helper="Berdasarkan transaksi" icon={<Wallet className="w-5 h-5" />} tone="blue" />
        <AnalyticsMetric label="Transaksi" value={String(totalTransactions)} helper="Total transaksi" icon={<ReceiptText className="w-5 h-5" />} tone="emerald" />
        <AnalyticsMetric label="Produk Terlaris" value={String(plan === "starter" ? Math.min(5, topProducts.length) : Math.min(20, topProducts.length))} helper={plan === "starter" ? "Top 5 SKU" : "Top SKU"} icon={<Package className="w-5 h-5" />} tone="amber" />
        <AnalyticsMetric label={plan === "starter" ? "Stok Kritis" : "Pelanggan Unik"} value={plan === "starter" ? String(lowStockProducts.length) : String(uniqueCustomers)} helper={plan === "starter" ? "Di bawah safety stock" : "Pelanggan tercatat"} icon={plan === "starter" ? <AlertTriangle className="w-5 h-5" /> : <Users className="w-5 h-5" />} tone={plan === "starter" ? "rose" : "blue"} />
      </div>

      {error && (
        <Card>
          <p className="text-sm text-[var(--danger-500)]">{error}</p>
        </Card>
      )}

      <TierGate required={["basic", "growth", "business"]} current={plan}>
        <div className="grid gap-[18px] lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
          <Card className="rounded-lg shadow-[var(--shadow-sm)] lg:h-[338px]" padding="none">
            <div className="flex items-center justify-between gap-3 px-[18px] pb-2.5 pt-4">
              <div>
                <h3 className="text-base font-black leading-tight text-[var(--text-primary)]">Tren Penjualan</h3>
                <p className="mt-0.5 text-xs leading-snug text-[var(--text-tertiary)]">Pendapatan · periode terpilih</p>
              </div>
              <Badge variant="brand">Analitik</Badge>
            </div>
            {!hasSalesData ? (
              <div className="mx-[18px] h-[252px] flex items-center justify-center text-center rounded-lg border border-dashed border-[var(--border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Belum ada data penjualan</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Grafik akan muncul setelah transaksi masuk</p>
                </div>
              </div>
            ) : (
              <div className="h-[252px] px-[18px] pb-4 pt-2 max-lg:h-80">
                <ChartCanvas id="sales-trend" init={(ctx) => new Chart(ctx, {
                  type: "line",
                  data: {
                    labels: salesData.labels,
                    datasets: [{
                      label: "Pendapatan",
                      data: salesData.values,
                      borderColor: "#2563eb",
                      backgroundColor: createChartGradient(ctx, "blue"),
                      fill: true,
                      tension: 0.4,
                      borderWidth: 2,
                      pointRadius: 0,
                      pointHoverRadius: 4,
                      pointHoverBackgroundColor: "#2563eb",
                    }],
                  },
                  options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        suggestedMax: Math.max(...salesData.values, 1_000_000),
                        ticks: { color: "#9ca3af", callback: (v) => formatChartTick(Number(v)), font: { size: 12, weight: 500 } },
                        grid: { color: "rgba(0, 0, 0, 0.04)" },
                        border: { display: false },
                      },
                      x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: "#9ca3af", maxTicksLimit: 10, font: { size: 12, weight: 500 } },
                      },
                    },
                  },
                })} />
              </div>
            )}
          </Card>

          <Card className="rounded-lg shadow-[var(--shadow-sm)] lg:h-[338px]" padding="none">
            <div className="px-[18px] pb-2.5 pt-4">
              <h3 className="text-base font-black leading-tight text-[var(--text-primary)]">Produk per Kategori</h3>
              <p className="mt-0.5 text-xs leading-snug text-[var(--text-tertiary)]">Komposisi SKU aktif</p>
            </div>
            <div className="h-[260px] px-3 pb-4">
              <ChartCanvas id="category" init={(ctx) => new Chart(ctx, {
                type: "doughnut",
                data: { labels: categoryData.labels, datasets: [{ data: categoryData.values, backgroundColor: categoryData.colors, borderWidth: 0, hoverOffset: 4 }] },
                options: { maintainAspectRatio: false, responsive: true, cutout: "65%", plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } },
              })} />
            </div>
          </Card>
        </div>
      </TierGate>

      <TierGate required={["basic", "growth", "business"]} current={plan}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Analisis Jam Ramai</h3>
            <Badge variant="info">Basic+</Badge>
          </div>
          {!hasHourlyData ? (
            <div className="h-56 flex items-center justify-center text-center rounded-lg border border-dashed border-[var(--border)]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Belum ada transaksi jam ramai</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Data muncul saat transaksi berjalan</p>
              </div>
            </div>
          ) : (
            <ChartCanvas id="hourly" init={(ctx) => new Chart(ctx, {
              type: "bar",
              data: {
                labels: hourlyData.labels.map((h) => `${h}:00`),
                datasets: [{
                  label: "Transaksi",
                  data: hourlyData.values,
                  backgroundColor: hourlyData.values.map((v) => (v > 35 ? "#2563eb" : v > 20 ? "#60a5fa" : v > 10 ? "#bfdbfe" : "#eff6ff")),
                  borderRadius: 6,
                }],
              },
              options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { color: "#9ca3af", callback: (v) => Number(v) },
                    grid: { color: "rgba(0, 0, 0, 0.04)" },
                    border: { display: false },
                  },
                  x: { grid: { display: false }, border: { display: false }, ticks: { color: "#9ca3af" } },
                },
              },
            })} />
          )}
        </Card>
      </TierGate>

      <TierGate required={["basic", "growth", "business"]} current={plan}>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Modal Stok</h3>
              <Badge variant="brand">Basic+</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{formatIDR(stockValuation)}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Nilai inventaris berdasarkan HPP saat ini</p>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Rata-rata Belanja</h3>
              <Badge variant="brand">Basic+</Badge>
            </div>
            <p className="text-3xl font-bold text-[var(--text-primary)]">{formatIDR(avgBasket)}</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Per transaksi</p>
          </Card>
        </div>
      </TierGate>

      <TierGate required={["growth", "business"]} current={plan}>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Penilaian Nilai Stok</h3>
              <Badge variant="brand">Growth+</Badge>
            </div>
            <ChartCanvas id="stock-val" init={(ctx) => new Chart(ctx, {
              type: "bar",
              data: { labels: ["Beverages", "Snacks", "Noodles", "Dairy", "Groceries"], datasets: [{ label: "Nilai Modal", data: [8200000, 3100000, 5800000, 2400000, 4100000], backgroundColor: "#bfdbfe", borderRadius: 6 }, { label: "Nilai Jual", data: [12400000, 5200000, 8700000, 3900000, 6200000], backgroundColor: "#2563eb", borderRadius: 6 }] },
              options: { responsive: true, plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { color: "#9ca3af", callback: (v) => formatChartTick(Number(v)) }, grid: { color: "rgba(0, 0, 0, 0.04)" }, border: { display: false } }, x: { grid: { display: false }, border: { display: false }, ticks: { color: "#9ca3af" } } } },
            })} />
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Tren Margin Kotor</h3>
              <Badge variant="brand">Growth+</Badge>
            </div>
            {!canAccess("analytics.profit") ? (
              <div className="h-48 flex items-center justify-center text-center">
                <div><Lock className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" /><p className="text-sm text-[var(--text-secondary)]">Khusus Owner/Manager</p></div>
              </div>
            ) : (
              <ChartCanvas id="margin" init={(ctx) => new Chart(ctx, {
                type: "line",
                data: { labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], datasets: [{ label: "Gross Margin %", data: [32, 28, 35, 33, 37, 36], borderColor: "#10b981", backgroundColor: createChartGradient(ctx, "emerald"), fill: true, tension: 0.4, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: "#10b981" }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 20, max: 45, ticks: { color: "#9ca3af", callback: (v) => `${v}%` }, grid: { color: "rgba(0, 0, 0, 0.04)" }, border: { display: false } }, x: { grid: { display: false }, border: { display: false }, ticks: { color: "#9ca3af" } } } },
              })} />
            )}
          </Card>
        </div>
      </TierGate>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Produk Terlaris</h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              Daftar produk paling laku berdasarkan volume penjualan untuk periode terpilih.
            </p>
          </div>
          <Badge variant="brand">
            {plan === "starter" ? "Top 5 SKU" : "Top 10 SKU"}
          </Badge>
        </div>
        
        <DataTable<TopProductRow>
          columns={[
            {
              key: "rank",
              label: "#",
              render: (item) => <span className="font-semibold text-[var(--text-secondary)]">{item.rank}</span>,
              className: "w-12",
            },
            {
              key: "name",
              label: "Nama Produk",
              render: (item) => <span className="font-bold text-[var(--text-primary)]">{item.name}</span>,
            },
            {
              key: "qty",
              label: "Terjual",
              render: (item) => <Badge variant="info">{item.qty} unit</Badge>,
              className: "w-28",
            },
            {
              key: "omset",
              label: "Total Omset",
              render: (item) => <span className="font-semibold text-[var(--text-primary)]">{formatIDR(item.qty * item.price)}</span>,
              className: "w-40",
            },
            {
              key: "contribution",
              label: "Kontribusi",
              render: (item) => {
                const omset = item.qty * item.price;
                const pct = totalRevenue > 0 ? (omset / totalRevenue) * 100 : 0;
                return (
                  <div className="flex items-center gap-2 min-w-[5rem]">
                    <div className="flex-1 bg-[var(--slate-100)] dark:bg-[var(--slate-800)] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[var(--brand-600)] h-full rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <span className="font-mono text-xs font-semibold text-[var(--text-secondary)]">{pct.toFixed(1)}%</span>
                  </div>
                );
              },
              className: "w-48",
            },
          ]}
          data={topProductsWithRank.slice(0, plan === "starter" ? 5 : 10)}
          keyExtractor={(item) => String(item.rank)}
          emptyMessage="Belum ada transaksi untuk periode ini."
        />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Peringatan ROP / Stok Kritis</h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Produk yang sudah menyentuh atau berada di bawah batas reorder point.</p>
          </div>
          <Badge variant="warning">{lowStockProducts.length} produk</Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {lowStockProducts.slice(0, plan === "starter" ? 5 : 12).map((p) => {
            const stock = getTotalStock(p);
            return (
              <div
                key={p.id}
                className={cn(
                  "rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3",
                  stock <= 0 ? "border-l-4 border-l-rose-400" : "border-l-4 border-l-amber-400"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">{p.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] mt-1">{p.sku || "Tanpa SKU"} · ROP {p.rop}</p>
                  </div>
                  <Badge variant={stock <= 0 ? "danger" : "warning"} size="sm">{stock} stok</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <AlertTriangle className={cn("h-3.5 w-3.5", stock <= 0 ? "text-rose-500" : "text-amber-500")} />
                  {stock <= 0 ? "Produk habis, perlu restock." : "Stok sudah di bawah batas aman."}
                </div>
              </div>
            );
          })}
          {lowStockProducts.length === 0 && (
            <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-sm text-[var(--text-secondary)]">
              Tidak ada stok kritis saat ini.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
