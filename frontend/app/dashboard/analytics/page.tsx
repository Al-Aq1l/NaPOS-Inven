"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge, StatCard } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { DollarSign, ShoppingCart, TrendingUp, Users, Lock, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchOrders, fetchProducts, type ApiOrder, type ApiProduct } from "@/lib/dashboard-api";

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
    <div className="relative">
      <div className="absolute inset-0 z-10 bg-[var(--surface)]/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 bg-[var(--slate-100)] rounded-full flex items-center justify-center mb-3 dark:bg-[var(--slate-800)]">
          <Lock className="w-6 h-6 text-[var(--text-tertiary)]" />
        </div>
        <p className="font-semibold text-[var(--text-primary)]">Perlu upgrade paket</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Tersedia di paket {required.join(" & ")}</p>
      </div>
      <div className="opacity-30 pointer-events-none">{children}</div>
    </div>
  );
}

export default function AnalitikPage() {
  const { user, canAccess } = useAuth();
  const [period, setPeriod] = useState("7D");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
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
        const [ordersData, productsData] = await Promise.all([fetchOrders(), fetchProducts()]);
        if (!isMounted) return;
        setOrders(ordersData);
        setProducts(productsData);
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
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const salesData = useMemo(() => {
    const now = new Date();
    const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];
    for (const order of orders) {
      const d = new Date(order.created_at);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 6) {
        const idx = (d.getDay() + 6) % 7;
        dayTotals[idx] += Number(order.total_amount);
      }
    }
    return { labels, values: dayTotals };
  }, [orders]);

  const hourlyData = useMemo(() => {
    const labels = Array.from({ length: 16 }, (_, i) => String(i + 6));
    const values = new Array(16).fill(0);
    for (const order of orders) {
      const hour = new Date(order.created_at).getHours();
      if (hour >= 6 && hour <= 21) values[hour - 6] += 1;
    }
    return { labels, values };
  }, [orders]);

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
    const productMap = new Map<number, { name: string; qty: number }>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const name = item.product?.name ?? `Produk #${item.product_id}`;
        const existing = productMap.get(item.product_id);
        if (existing) existing.qty += item.quantity;
        else productMap.set(item.product_id, { name, qty: item.quantity });
      }
    }
    return Array.from(productMap.values()).sort((a, b) => b.qty - a.qty);
  }, [orders]);

  const lowStockProducts = useMemo(
    () => products.filter((p) => (p.branches ?? []).reduce((s, b) => s + (b.pivot?.stock ?? 0), 0) <= p.rop),
    [products],
  );

  const totalRevenue = useMemo(() => orders.reduce((sum, o) => sum + Number(o.total_amount), 0), [orders]);
  const totalTransactions = orders.length;
  const avgBasket = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;
  const uniqueCustomers = useMemo(() => new Set(orders.map((o) => (o.customer_name || "").trim()).filter(Boolean)).size, [orders]);
  const stockValuation = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.cost_price) * (p.branches ?? []).reduce((s, b) => s + (b.pivot?.stock ?? 0), 0), 0),
    [products],
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
        <div className="flex gap-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-1">
          {plan === "starter" ? ["7D"] : ["24H", "7D", "30D", "90D"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer", period === p ? "bg-[var(--brand-600)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}>{p}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pendapatan" value={formatIDR(totalRevenue)} change="Berdasarkan data transaksi" changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label="Transaksi" value={String(totalTransactions)} change="Total transaksi" changeType="positive" icon={<ShoppingCart className="w-5 h-5" />} />
        <StatCard label="Produk Terlaris" value={String(plan === "starter" ? Math.min(5, topProducts.length) : Math.min(20, topProducts.length))} change={plan === "starter" ? "Top 5 SKU" : "Top SKU"} changeType="positive" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label={plan === "starter" ? "Stok Kritis" : "Pelanggan Unik"} value={plan === "starter" ? String(lowStockProducts.length) : String(uniqueCustomers)} change={plan === "starter" ? "Di bawah safety stock" : "Pelanggan tercatat"} changeType="neutral" icon={<Users className="w-5 h-5" />} />
      </div>

      {error && (
        <Card>
          <p className="text-sm text-[var(--danger-500)]">{error}</p>
        </Card>
      )}

      <TierGate required={["basic", "growth", "business"]} current={plan}>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4">Tren Penjualan</h3>
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

      {plan === "starter" && (
        <Card>
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Ringkasan Starter (Top 5 SKU)</h3>
          <div className="space-y-2">
            {topProducts.slice(0, 5).map((p) => (
              <div key={p.name} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-raised)]">
                <span className="text-sm text-[var(--text-primary)]">{p.name}</span>
                <Badge variant="info">{p.qty} unit</Badge>
              </div>
            ))}
            {topProducts.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Belum ada transaksi untuk menghitung produk terlaris.</p>}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text-primary)]">Stok Kritis</h3>
          <Badge variant="warning">{lowStockProducts.length} produk</Badge>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {lowStockProducts.slice(0, plan === "starter" ? 5 : 12).map((p) => {
            const stock = (p.branches ?? []).reduce((s, b) => s + (b.pivot?.stock ?? 0), 0);
            return (
              <div key={p.id} className="p-3 rounded-lg border border-[var(--border)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">{p.name}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Stok: {stock} | ROP: {p.rop}</p>
              </div>
            );
          })}
          {lowStockProducts.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Tidak ada stok kritis saat ini.</p>}
        </div>
      </Card>
    </div>
  );
}
