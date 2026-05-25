"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chart, registerables } from "chart.js";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  Package,
  ReceiptText,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge, Card } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";
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

function formatOrderTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function SummaryTile({
  label,
  value,
  helper,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  helper: string;
  icon: React.ReactNode;
  tone?: "blue" | "emerald" | "amber" | "slate";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <Card padding="sm" className="min-h-32">
      <div className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-[var(--text-secondary)]">{label}</p>
          <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", tones[tone])}>
            {icon}
          </span>
        </div>
        <div>
          <p className="text-2xl font-black tracking-normal text-[var(--text-primary)]">{value}</p>
          <p className="mt-1 text-xs text-[var(--text-tertiary)]">{helper}</p>
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-xs text-[var(--text-tertiary)]">{description}</p>
    </div>
  );
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

  const totalRevenue = summary?.total_revenue ?? 0;
  const totalOrders = summary?.total_orders ?? 0;
  const branchCount = summary?.branch_count ?? 0;
  const recentOrders = summary?.recent_orders ?? [];
  const lowStock = summary?.low_stock ?? [];
  const avgBasket = totalOrders ? totalRevenue / totalOrders : 0;
  const hasSalesData = salesData.values.some((value) => value > 0);
  const visibleLowStock = lowStock.slice(0, 5);

  if (!user) return null;

  const role = user.role;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-secondary)]">Ringkasan Hari Ini</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
            Halo, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Pantau penjualan, transaksi, dan stok penting di {user.tenant.name}.
          </p>
        </div>
        <Link
          href="/dashboard/pos"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--brand-600)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-700)]"
        >
          <ShoppingCart className="h-4 w-4" />
          Buka Kasir
        </Link>
      </div>

      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data dashboard...</Card>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile
          label={role === "cashier" ? "Penjualan Saya" : "Penjualan"}
          value={formatIDR(totalRevenue)}
          helper="Total penjualan yang tercatat"
          icon={<Wallet className="h-5 w-5" />}
          tone="blue"
        />
        <SummaryTile
          label={role === "cashier" ? "Transaksi Saya" : "Transaksi"}
          value={`${totalOrders}`}
          helper="Jumlah transaksi masuk"
          icon={<ReceiptText className="h-5 w-5" />}
          tone="emerald"
        />
        <SummaryTile
          label="Perlu Dicek"
          value={`${lowStock.length}`}
          helper="Produk stok menipis"
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="amber"
        />
        <SummaryTile
          label={role === "owner" ? "Cabang Aktif" : "Rata-rata Belanja"}
          value={role === "owner" ? `${branchCount}` : formatIDR(avgBasket)}
          helper={role === "owner" ? "Lokasi operasional" : "Nilai per transaksi"}
          icon={role === "owner" ? <Building2 className="h-5 w-5" /> : <Package className="h-5 w-5" />}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Perlu Perhatian</h2>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">Hal yang sebaiknya dicek sebelum toko semakin ramai.</p>
            </div>
            <Badge variant={lowStock.length > 0 ? "warning" : "success"}>
              {lowStock.length > 0 ? `${lowStock.length} item` : "Aman"}
            </Badge>
          </div>

          {visibleLowStock.length === 0 ? (
            <EmptyState title="Stok aman" description="Belum ada produk yang berada di bawah batas ROP." />
          ) : (
            <div className="space-y-2">
              {visibleLowStock.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-3",
                    item.stock <= 0
                      ? "border-l-4 border-l-rose-400"
                      : "border-l-4 border-l-amber-400"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">{item.sku || "Tanpa SKU"} · ROP {item.rop}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.stock <= 0 ? "danger" : "warning"}>{item.stock} stok</Badge>
                    <Link href="/dashboard/inventory" className="text-xs font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)]">
                      Cek
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/dashboard/inventory"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
            >
              <Package className="h-4 w-4" />
              Lihat Stok
            </Link>
            <Link
              href="/dashboard/inventory/opname"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-raised)]"
            >
              Buat Opname
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        <Card>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Transaksi Terbaru</h2>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">Aktivitas penjualan terakhir.</p>
            </div>
            <Badge variant="info">{recentOrders.length} baru</Badge>
          </div>

          {recentOrders.length === 0 ? (
            <EmptyState title="Belum ada transaksi" description="Transaksi yang masuk dari POS akan tampil di sini." />
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 6).map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-3 rounded-lg p-2.5 transition-colors hover:bg-[var(--surface-raised)]">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{order.customer_name || "Pelanggan Umum"}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                      ORD-{order.id} · {order.item_count} item · {formatOrderTime(order.created_at)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{formatIDR(Number(order.total_amount))}</p>
                    <Badge variant={order.status === "completed" ? "success" : "warning"} size="sm">
                      {order.status === "completed" ? "Selesai" : "Proses"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Tren Penjualan</h2>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Untuk melihat arah penjualan beberapa hari terakhir.</p>
          </div>
          <Link href="/dashboard/analytics" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-600)] hover:text-[var(--brand-700)]">
            Detail Analitik
            <BarChart3 className="h-4 w-4" />
          </Link>
        </div>

        {!loading && !hasSalesData ? (
          <EmptyState title="Belum ada data penjualan" description="Grafik akan muncul setelah transaksi mulai tercatat." />
        ) : (
          <div className="h-72">
            <ChartCanvas
              id="dashboard-sales-trend"
              init={(ctx) => new Chart(ctx, {
                type: "line",
                data: {
                  labels: salesData.labels,
                  datasets: [
                    {
                      label: "Penjualan",
                      data: salesData.values,
                      borderColor: "#2563eb",
                      backgroundColor: "rgba(37,99,235,0.08)",
                      fill: true,
                      tension: 0.35,
                      pointRadius: 2,
                      pointHoverRadius: 4,
                    },
                  ],
                },
                options: {
                  maintainAspectRatio: false,
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: {
                    y: {
                      beginAtZero: true,
                      suggestedMax: Math.max(...salesData.values, 1_000_000),
                      ticks: { callback: (value) => formatChartTick(Number(value)) },
                      grid: { color: "rgba(148,163,184,0.18)" },
                    },
                    x: {
                      grid: { display: false },
                      ticks: { maxTicksLimit: 10 },
                    },
                  },
                },
              })}
            />
          </div>
        )}
      </Card>

    </div>
  );
}
