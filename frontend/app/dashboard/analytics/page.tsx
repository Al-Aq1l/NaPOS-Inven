"use client";

import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge, StatCard } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { DollarSign, ShoppingCart, TrendingUp, Users, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

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

function TierGate({ required, current, children }: { required: string[]; current: string; children: React.ReactNode }) {
  if (required.includes(current)) return <>{children}</>;
  return (
    <div className="relative">
      <div className="absolute inset-0 z-10 bg-[var(--surface)]/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center text-center p-6">
        <div className="w-12 h-12 bg-[var(--slate-100)] rounded-full flex items-center justify-center mb-3 dark:bg-[var(--slate-800)]">
          <Lock className="w-6 h-6 text-[var(--text-tertiary)]" />
        </div>
        <p className="font-semibold text-[var(--text-primary)]">Upgrade Required</p>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Available on {required.join(" & ")} plans</p>
      </div>
      <div className="opacity-30 pointer-events-none">{children}</div>
    </div>
  );
}

const SALES_DATA = {
  labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  values: [4200000, 3800000, 5100000, 4700000, 6200000, 8900000, 7100000],
};

const HOURLY_DATA = {
  labels: ["6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"],
  values: [2, 5, 12, 18, 25, 32, 45, 38, 28, 22, 30, 35, 42, 28, 15, 8],
};

const CATEGORY_DATA = {
  labels: ["Beverages", "Snacks", "Rice & Noodles", "Dairy", "Groceries", "Household"],
  values: [28, 22, 18, 14, 12, 6],
  colors: ["#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899"],
};

export default function AnalyticsPage() {
  const { user, canAccess } = useAuth();
  const [period, setPeriod] = useState("7D");
  if (!user) return null;
  const plan = user.tenant.plan;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Real-time business insights and performance metrics</p>
        </div>
        <div className="flex gap-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-1">
          {["24H", "7D", "30D", "90D"].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer",
                period === p ? "bg-[var(--brand-600)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]")}>{p}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Revenue" value={formatIDR(39_900_000)} change="+18.2% vs last week" changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label="Transactions" value="1,847" change="+124 vs last week" changeType="positive" icon={<ShoppingCart className="w-5 h-5" />} />
        <StatCard label="Avg. Basket" value={formatIDR(21_600)} change="+5.3%" changeType="positive" icon={<TrendingUp className="w-5 h-5" />} />
        <StatCard label="Unique Customers" value="892" change="+67 new" changeType="positive" icon={<Users className="w-5 h-5" />} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <Card className="lg:col-span-2">
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Sales Trend</h3>
          <ChartCanvas id="sales-trend" init={(ctx) => new Chart(ctx, {
            type: "line",
            data: {
              labels: SALES_DATA.labels,
              datasets: [{
                label: "Revenue",
                data: SALES_DATA.values,
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59,130,246,0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: "#3b82f6",
              }],
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, ticks: { callback: (v) => `${Number(v) / 1000000}M` }, grid: { color: "rgba(0,0,0,0.05)" } },
                x: { grid: { display: false } },
              },
            },
          })} />
        </Card>

        {/* Category Breakdown */}
        <Card>
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Sales by Category</h3>
          <ChartCanvas id="category" init={(ctx) => new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: CATEGORY_DATA.labels,
              datasets: [{
                data: CATEGORY_DATA.values,
                backgroundColor: CATEGORY_DATA.colors,
                borderWidth: 0,
                hoverOffset: 4,
              }],
            },
            options: {
              responsive: true,
              cutout: "65%",
              plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } },
            },
          })} />
        </Card>
      </div>

      {/* Hourly Heatmap — Basic+ */}
      <TierGate required={["basic", "growth", "business"]} current={plan}>
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Peak Hours Analysis</h3>
            <Badge variant="info">Basic+</Badge>
          </div>
          <ChartCanvas id="hourly" init={(ctx) => new Chart(ctx, {
            type: "bar",
            data: {
              labels: HOURLY_DATA.labels.map((h) => `${h}:00`),
              datasets: [{
                label: "Transactions",
                data: HOURLY_DATA.values,
                backgroundColor: HOURLY_DATA.values.map((v) =>
                  v > 35 ? "#3b82f6" : v > 20 ? "#60a5fa" : v > 10 ? "#93c5fd" : "#dbeafe"
                ),
                borderRadius: 4,
              }],
            },
            options: {
              responsive: true,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } },
            },
          })} />
        </Card>
      </TierGate>

      {/* Stock Valuation & Profit — Growth+ */}
      <TierGate required={["growth", "business"]} current={plan}>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Stock Valuation</h3>
              <Badge variant="brand">Growth+</Badge>
            </div>
            <ChartCanvas id="stock-val" init={(ctx) => new Chart(ctx, {
              type: "bar",
              data: {
                labels: ["Beverages", "Snacks", "Noodles", "Dairy", "Groceries"],
                datasets: [
                  { label: "Cost Value", data: [8200000, 3100000, 5800000, 2400000, 4100000], backgroundColor: "#93c5fd", borderRadius: 4 },
                  { label: "Retail Value", data: [12400000, 5200000, 8700000, 3900000, 6200000], backgroundColor: "#3b82f6", borderRadius: 4 },
                ],
              },
              options: {
                responsive: true,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 12, padding: 16, font: { size: 11 } } } },
                scales: { y: { beginAtZero: true, ticks: { callback: (v) => `${Number(v) / 1000000}M` }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } },
              },
            })} />
          </Card>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--text-primary)]">Gross Margin Trend</h3>
              <Badge variant="brand">Growth+</Badge>
            </div>
            {!canAccess("analytics.profit") ? (
              <div className="h-48 flex items-center justify-center text-center">
                <div><Lock className="w-8 h-8 mx-auto text-[var(--text-tertiary)] mb-2" /><p className="text-sm text-[var(--text-secondary)]">Owner access only</p></div>
              </div>
            ) : (
              <ChartCanvas id="margin" init={(ctx) => new Chart(ctx, {
                type: "line",
                data: {
                  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                  datasets: [{
                    label: "Gross Margin %",
                    data: [32, 28, 35, 33, 37, 36],
                    borderColor: "#22c55e",
                    backgroundColor: "rgba(34,197,94,0.1)",
                    fill: true,
                    tension: 0.4,
                  }],
                },
                options: {
                  responsive: true,
                  plugins: { legend: { display: false } },
                  scales: { y: { min: 20, max: 45, ticks: { callback: (v) => `${v}%` }, grid: { color: "rgba(0,0,0,0.05)" } }, x: { grid: { display: false } } },
                },
              })} />
            )}
          </Card>
        </div>
      </TierGate>
    </div>
  );
}
