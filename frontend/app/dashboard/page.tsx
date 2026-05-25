"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useAuth } from "@/lib/auth-context";
import { StatCard, Card, Badge } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { DollarSign, ShoppingCart, Package, TrendingUp, AlertTriangle, ArrowDownRight } from "lucide-react";
import { fetchDashboardSummary, type DashboardSummary } from "@/lib/dashboard-api";

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

export default function DashboardHome() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setSummary(await fetchDashboardSummary());
      } catch {
        setError("Gagal memuat data dashboard.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const salesData = useMemo(() => {
    const trend = summary?.sales_trend ?? [];
    return {
      labels: trend.map((row) => `${row.day}`),
      values: trend.map((row) => Number(row.total)),
    };
  }, [summary]);

  if (!user) return null;
  const role = user.role;
  const totalRevenue = summary?.total_revenue ?? 0;
  const totalOrders = summary?.total_orders ?? 0;
  const branchCount = summary?.branch_count ?? 0;
  const recentOrders = summary?.recent_orders ?? [];
  const lowStock = summary?.low_stock ?? [];
  const avgBasket = totalOrders ? totalRevenue / totalOrders : 0;
  const hasSalesData = salesData.values.some((v) => v > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Selamat datang, {user.name.split(" ")[0]}!</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Ringkasan aktivitas usaha di {user.tenant.name} hari ini.</p>
      </div>
      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data dashboard...</Card>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={role === "cashier" ? "Penjualan Saya" : "Pendapatan"} value={formatIDR(totalRevenue)} changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label={role === "cashier" ? "Transaksi Saya" : "Transaksi"} value={`${totalOrders}`} changeType="positive" icon={<ShoppingCart className="w-5 h-5" />} />
        <StatCard label="Stok Menipis" value={`${lowStock.length}`} changeType="negative" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label={role === "owner" ? "Cabang Aktif" : "Rata-rata Belanja"} value={role === "owner" ? `${branchCount}` : formatIDR(avgBasket)} changeType="positive" icon={role === "owner" ? <TrendingUp className="w-5 h-5" /> : <Package className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Tren Penjualan</h3>
          {!loading && !hasSalesData ? (
            <div className="h-64 flex items-center justify-center text-center rounded-lg border border-dashed border-[var(--border)]">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Belum ada data penjualan</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">Grafik akan muncul setelah transaksi masuk</p>
              </div>
            </div>
          ) : (
            <ChartCanvas id="dashboard-sales-trend" init={(ctx) => new Chart(ctx, {
              type: "line",
              data: { labels: salesData.labels, datasets: [{ label: "Pendapatan", data: salesData.values, borderColor: "#3b82f6", backgroundColor: "rgba(59,130,246,0.12)", fill: true, tension: 0.35, pointRadius: 2 }] },
              options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, suggestedMax: Math.max(...salesData.values, 1_000_000), ticks: { callback: (v) => formatChartTick(Number(v)) }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } } } },
            })} />
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-[var(--text-primary)]">Pesanan Terbaru</h3><Badge variant="info">{recentOrders.length} baru</Badge></div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{order.customer_name || "Pelanggan Umum"}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">ORD-{order.id} - {order.item_count} item</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatIDR(Number(order.total_amount))}</p>
                  <Badge variant={order.status === "completed" ? "success" : "warning"} size="sm">{order.status === "completed" ? "selesai" : "proses"}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {(role === "owner" || role === "manager") && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[var(--warning-500)]" /><h3 className="font-semibold text-[var(--text-primary)]">Peringatan Stok</h3></div>
            <Badge variant="warning">{lowStock.length} item di bawah ROP</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {lowStock.map((item) => {
              return (
                <div key={item.id} className="p-3 bg-[var(--warning-50)] border border-amber-200 rounded-lg dark:bg-amber-900/10 dark:border-amber-800">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.sku}</p>
                  <div className="flex items-center justify-between mt-2"><div className="flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5 text-[var(--danger-500)]" /><span className="text-sm font-bold text-[var(--danger-500)]">{item.stock}</span></div><span className="text-xs text-[var(--text-tertiary)]">ROP: {item.rop}</span></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
