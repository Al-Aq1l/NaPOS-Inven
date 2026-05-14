"use client";

import { useAuth } from "@/lib/auth-context";
import { StatCard, Card, Badge } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import {
  DollarSign, ShoppingCart, Package, TrendingUp,
  AlertTriangle, ArrowDownRight, Clock
} from "lucide-react";

const RECENT_ORDERS = [
  { id: "ORD-001", customer: "Walk-in Customer", total: 185000, items: 3, time: "2 min ago", status: "completed" },
  { id: "ORD-002", customer: "Ibu Sari", total: 342000, items: 5, time: "8 min ago", status: "completed" },
  { id: "ORD-003", customer: "Shopee #SP2841", total: 89000, items: 1, time: "15 min ago", status: "processing" },
  { id: "ORD-004", customer: "Pak Hendra", total: 567000, items: 7, time: "22 min ago", status: "completed" },
  { id: "ORD-005", customer: "Tokopedia #TK9912", total: 124000, items: 2, time: "35 min ago", status: "completed" },
];

const LOW_STOCK = [
  { name: "Kopi Arabica 250g", sku: "KOP-001", stock: 3, rop: 10 },
  { name: "Gula Pasir 1kg", sku: "GUL-001", stock: 5, rop: 15 },
  { name: "Susu UHT 1L", sku: "SUS-001", stock: 8, rop: 20 },
  { name: "Teh Celup Box", sku: "TEH-001", stock: 2, rop: 12 },
];

export default function DashboardHome() {
  const { user } = useAuth();
  if (!user) return null;
  const role = user.role;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Selamat datang, {user.name.split(" ")[0]}! 👋
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Here&apos;s what&apos;s happening at {user.tenant.name} today.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(role !== "cashier") ? (
          <>
            <StatCard label="Today Revenue" value={formatIDR(12_450_000)} change="+18.2% from yesterday" changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
            <StatCard label="Transactions" value="284" change="+12 today" changeType="positive" icon={<ShoppingCart className="w-5 h-5" />} />
          </>
        ) : (
          <>
            <StatCard label="My Sales Today" value={formatIDR(2_340_000)} change="Keep it up!" changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
            <StatCard label="My Transactions" value="47" change="+3 this hour" changeType="positive" icon={<ShoppingCart className="w-5 h-5" />} />
          </>
        )}
        {(role === "owner" || role === "manager") ? (
          <>
            <StatCard label="Low Stock Items" value="7" change="Needs attention" changeType="negative" icon={<AlertTriangle className="w-5 h-5" />} />
            <StatCard label={role === "owner" ? "Active Branches" : "Avg. Basket Size"} value={role === "owner" ? "3" : formatIDR(43200)} change={role === "owner" ? "All online" : "+5.3%"} changeType="positive" icon={<TrendingUp className="w-5 h-5" />} />
          </>
        ) : (
          <>
            <StatCard label="Avg. Basket" value={formatIDR(49700)} change="+2 items avg" changeType="neutral" icon={<Package className="w-5 h-5" />} />
            <StatCard label={role === "cashier" ? "Queue Time" : "Growth"} value={role === "cashier" ? "~3 min" : "+18.2%"} change={role === "cashier" ? "Good pace" : "vs last month"} changeType="positive" icon={role === "cashier" ? <Clock className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />} />
          </>
        )}
      </div>

      {/* Charts + Orders */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Sales Trend</h3>
            <div className="flex gap-1">
              {["7D", "30D", "90D"].map((p) => (
                <button key={p} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${p === "7D" ? "bg-[var(--brand-50)] text-[var(--brand-700)] dark:bg-[var(--brand-950)] dark:text-[var(--brand-400)]" : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}>{p}</button>
              ))}
            </div>
          </div>
          <div className="h-48 flex items-end gap-1.5 px-2">
            {[35, 52, 41, 67, 48, 72, 55, 83, 61, 78, 69, 90, 74, 85].map((h, i) => (
              <div key={i} className="flex-1">
                <div className="w-full bg-gradient-to-t from-[var(--brand-600)] to-[var(--brand-400)] rounded-sm transition-all duration-500 hover:opacity-80" style={{ height: `${h}%` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-2">
            {["Mon", "Thu", "Sun", "Wed", "Today"].map((d) => (
              <span key={d} className="text-xs text-[var(--text-tertiary)]">{d}</span>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)]">Recent Orders</h3>
            <Badge variant="info">{RECENT_ORDERS.length} new</Badge>
          </div>
          <div className="space-y-3">
            {RECENT_ORDERS.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{order.customer}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{order.id} · {order.items} items · {order.time}</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatIDR(order.total)}</p>
                  <Badge variant={order.status === "completed" ? "success" : "warning"} size="sm">{order.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Stock Alerts */}
      {(role === "owner" || role === "manager") && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--warning-500)]" />
              <h3 className="font-semibold text-[var(--text-primary)]">Stock Alerts</h3>
            </div>
            <Badge variant="warning">{LOW_STOCK.length} items below ROP</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {LOW_STOCK.map((item) => (
              <div key={item.sku} className="p-3 bg-[var(--warning-50)] border border-amber-200 rounded-lg dark:bg-amber-900/10 dark:border-amber-800">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.sku}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    <ArrowDownRight className="w-3.5 h-3.5 text-[var(--danger-500)]" />
                    <span className="text-sm font-bold text-[var(--danger-500)]">{item.stock}</span>
                  </div>
                  <span className="text-xs text-[var(--text-tertiary)]">ROP: {item.rop}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
