"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge, StatCard, DataTable } from "@/components/ui";
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
  if (!user) return null;

  if (!canAccess("analytics")) {
    return (
      <Card>
        <p className="text-sm text-[var(--danger-500)]">Anda tidak memiliki akses ke halaman analitik.</p>
      </Card>
    );
  }

  const plan = user.tenant.plan;

  useEffect(() => {
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
      } catch (err: any) {
        if (!isMounted) return;
        const status = err?.response?.status;
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
  }, []);

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
      colors: ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"],
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

  const getTotalStock = (product: ApiProduct) => {
    if (selectedBranchId === null) {
      return (product.branches ?? []).reduce((sum, branch) => sum + (branch.pivot?.stock ?? 0), 0);
    }
    const b = (product.branches ?? []).find((branch) => branch.id === selectedBranchId);
    return b?.pivot?.stock ?? 0;
  };

  const lowStockProducts = useMemo(
    () => products.filter((p) => getTotalStock(p) <= p.rop),
    [products, selectedBranchId],
  );

  const totalRevenue = useMemo(() => filteredOrders.reduce((sum, o) => sum + Number(o.total_amount), 0), [filteredOrders]);
  const totalTransactions = filteredOrders.length;
  const avgBasket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const uniqueCustomers = useMemo(() => new Set(filteredOrders.map((o) => (o.customer_name || "").trim()).filter(Boolean)).size, [filteredOrders]);
  const stockValuation = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.cost_price) * getTotalStock(p), 0),
    [products, selectedBranchId],
  );

  const hasSalesData = salesData.values.some((v) => v > 0);
  const hasHourlyData = hourlyData.values.some((v) => v > 0);

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-xs)]">
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
                  ? "bg-[var(--brand-600)] text-white border-transparent shadow-sm"
                  : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--slate-150)] dark:hover:bg-[var(--slate-800)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pendapatan" value={formatIDR(totalRevenue)} change="Berdasarkan data transaksi" changeType="positive" icon={<Wallet className="w-5 h-5" />} />
        <StatCard label="Transaksi" value={String(totalTransactions)} change="Total transaksi" changeType="positive" icon={<ReceiptText className="w-5 h-5" />} />
        <StatCard label="Produk Terlaris" value={String(plan === "starter" ? Math.min(5, topProducts.length) : Math.min(20, topProducts.length))} change={plan === "starter" ? "Top 5 SKU" : "Top SKU"} changeType="positive" icon={<Package className="w-5 h-5" />} />
        <StatCard label={plan === "starter" ? "Stok Kritis" : "Pelanggan Unik"} value={plan === "starter" ? String(lowStockProducts.length) : String(uniqueCustomers)} change={plan === "starter" ? "Di bawah safety stock" : "Pelanggan tercatat"} changeType="neutral" icon={plan === "starter" ? <AlertTriangle className="w-5 h-5" /> : <Users className="w-5 h-5" />} />
      </div>

      {error && (
        <Card>
          <p className="text-sm text-[var(--danger-500)]">{error}</p>
        </Card>
      )}

      <TierGate required={["basic", "growth", "business"]} current={plan}>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Tren Penjualan Bulanan</h3>
            {!hasSalesData ? (
              <div className="h-64 flex items-center justify-center text-center rounded-lg border border-dashed border-[var(--border)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Belum ada data penjualan</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">Grafik akan muncul setelah transaksi masuk</p>
                </div>
              </div>
            ) : (
              <ChartCanvas id="sales-trend" init={(ctx) => new Chart(ctx, {
                type: "line",
                data: { labels: salesData.labels, datasets: [{ label: "Pendapatan", data: salesData.values, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.1)", fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: "#3b82f6" }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: Math.max(...salesData.values, 1_000_000), ticks: { callback: (v) => formatChartTick(Number(v)) }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } } },
              })} />
            )}
          </Card>

          <Card>
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Produk per Kategori</h3>
            <ChartCanvas id="category" init={(ctx) => new Chart(ctx, {
              type: "doughnut",
              data: { labels: categoryData.labels, datasets: [{ data: categoryData.values, backgroundColor: categoryData.colors, borderWidth: 0, hoverOffset: 4 }] },
              options: { responsive: true, cutout: "65%", plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } } },
            })} />
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
              data: { labels: hourlyData.labels.map((h) => `${h}:00`), datasets: [{ label: "Transaksi", data: hourlyData.values, backgroundColor: hourlyData.values.map((v) => (v > 35 ? "#3b82f6" : v > 20 ? "#60a5fa" : v > 10 ? "#93c5fd" : "#dbeafe")), borderRadius: 4 }] },
              options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatChartTick(Number(v)) }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } } },
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
              data: { labels: ["Beverages", "Snacks", "Noodles", "Dairy", "Groceries"], datasets: [{ label: "Nilai Modal", data: [8200000, 3100000, 5800000, 2400000, 4100000], backgroundColor: "#93c5fd", borderRadius: 4 }, { label: "Nilai Jual", data: [12400000, 5200000, 8700000, 3900000, 6200000], backgroundColor: "#3b82f6", borderRadius: 4 }] },
              options: { responsive: true, plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } } }, scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatChartTick(Number(v)) }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } } },
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
                data: { labels: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun"], datasets: [{ label: "Gross Margin %", data: [32, 28, 35, 33, 37, 36], borderColor: "#22c55e", backgroundColor: "rgba(34,197,94,0.1)", fill: true, tension: 0.4 }] },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 20, max: 45, ticks: { callback: (v) => `${v}%` }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } } },
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
        
        <DataTable
          columns={[
            {
              key: "rank",
              label: "#",
              render: (item: any) => <span className="font-semibold text-[var(--text-secondary)]">{item.rank}</span>,
              className: "w-12",
            },
            {
              key: "name",
              label: "Nama Produk",
              render: (item: any) => <span className="font-bold text-[var(--text-primary)]">{item.name}</span>,
            },
            {
              key: "qty",
              label: "Terjual",
              render: (item: any) => <Badge variant="info">{item.qty} unit</Badge>,
              className: "w-28",
            },
            {
              key: "omset",
              label: "Total Omset",
              render: (item: any) => <span className="font-semibold text-[var(--text-primary)]">{formatIDR(item.qty * item.price)}</span>,
              className: "w-40",
            },
            {
              key: "contribution",
              label: "Kontribusi",
              render: (item: any) => {
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
          keyExtractor={(item: any) => String(item.rank)}
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
