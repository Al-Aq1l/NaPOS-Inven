"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge, Button } from "@/components/ui";
import { PRICING_TIERS, formatIDR } from "@/lib/constants";
import { CreditCard, Download, Clock, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBranches, fetchOrders, fetchProducts, type ApiOrder } from "@/lib/dashboard-api";

type InvoiceRow = {
  id: string;
  date: string;
  amount: number;
  status: "paid";
  plan: string;
};

function formatDateID(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BillingPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  const [skuUsed, setSkuUsed] = useState(0);
  const [userUsed, setUserUsed] = useState(1);
  const [branchUsed, setBranchUsed] = useState(0);
  const [orders, setOrders] = useState<ApiOrder[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!user) return;
      const [products, branches, orderRows] = await Promise.all([fetchProducts(), fetchBranches(), fetchOrders()]);
      if (!isMounted) return;
      setSkuUsed(products.length);
      setBranchUsed(branches.length);
      setOrders(orderRows);
      setUserUsed(1);
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (!user) return null;

  const currentTier = PRICING_TIERS.find((t) => t.key === user.tenant.plan);

  const invoices = useMemo<InvoiceRow[]>(() => {
    const byMonth = new Map<string, number>();
    for (const o of orders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + Number(o.total_amount));
    }

    return Array.from(byMonth.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6)
      .map(([month, amount], idx) => ({
        id: `INV-${month.replace("-", "")}-${String(idx + 1).padStart(2, "0")}`,
        date: `${month}-01`,
        amount,
        status: "paid",
        plan: currentTier?.name ?? "Paket",
      }));
  }, [orders, currentTier?.name]);

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tagihan & Langganan</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Kelola paket, penggunaan, dan metode pembayaran</p>
      </div>

      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--brand-100)] to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 dark:from-[var(--brand-900)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{currentTier?.name} Plan</h2>
              <Badge variant="brand">{user.tenant.plan === "starter" ? "Gratis" : "Aktif"}</Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{currentTier?.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-[var(--text-primary)]">
              {currentTier?.price === 0 ? "Gratis" : formatIDR(currentTier?.price || 0)}
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">per bulan</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">SKU produk</span>
              <span className="font-semibold text-[var(--text-primary)]">{skuUsed} / {currentTier?.skuLimit === "unlimited" ? "unlimited" : currentTier?.skuLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${currentTier?.skuLimit === "unlimited" ? 15 : Math.min(100, (skuUsed / (currentTier?.skuLimit as number)) * 100)}%` }} />
            </div>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">Akun Pengguna</span>
              <span className="font-semibold text-[var(--text-primary)]">{userUsed} / {currentTier?.userLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${Math.min(100, (userUsed / (currentTier?.userLimit || 1)) * 100)}%` }} />
            </div>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">Cabang</span>
              <span className="font-semibold text-[var(--text-primary)]">{branchUsed} / {currentTier?.branchLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${Math.min(100, (branchUsed / (currentTier?.branchLimit || 1)) * 100)}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Ganti Paket</h2>
          <div className="flex gap-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-1">
            <button onClick={() => setAnnual(false)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer", !annual ? "bg-[var(--brand-600)] text-white" : "text-[var(--text-secondary)]")}>Bulanan</button>
            <button onClick={() => setAnnual(true)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer", annual ? "bg-[var(--brand-600)] text-white" : "text-[var(--text-secondary)]")}>Tahunan <span className="opacity-70">-20%</span></button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = tier.key === user.tenant.plan;
            const price = annual ? tier.annualPrice : tier.price;
            return (
              <div key={tier.key} className={cn("p-4 border rounded-xl transition-all", isCurrent ? "border-[var(--brand-500)] bg-[var(--brand-50)] dark:bg-[var(--brand-950)]" : "border-[var(--border)] hover:border-[var(--brand-300)]")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--text-primary)]">{tier.name}</span>
                  {isCurrent && <Badge variant="brand" size="sm">Saat Ini</Badge>}
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">{price === 0 ? "Gratis" : formatIDR(price)}</p>
                <p className="text-xs text-[var(--text-tertiary)] mb-3">{tier.skuLimit === "unlimited" ? "unlimited" : tier.skuLimit} SKU - {tier.userLimit} pengguna</p>
                <Button variant={isCurrent ? "secondary" : "outline"} size="sm" className="w-full" disabled={isCurrent}>
                  {isCurrent ? "Paket Saat Ini" : "Pilih"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--brand-600)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Metode Pembayaran</h2>
          </div>
          <Button variant="ghost" size="sm">Perbarui</Button>
        </div>
        <div className="flex items-center gap-4 p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">**** **** **** 4242</p>
            <p className="text-xs text-[var(--text-tertiary)]">Berlaku hingga 12/2026</p>
          </div>
          <Badge variant="success" size="sm" className="ml-auto">Utama</Badge>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Diamankan Midtrans</div>
          <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Perpanjangan otomatis aktif</div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--brand-600)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Riwayat Invoice</h2>
          </div>
        </div>
        <div className="space-y-2">
          {invoices.length === 0 && <p className="text-sm text-[var(--text-secondary)]">Belum ada data invoice.</p>}
          {invoices.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--surface-raised)] rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[var(--text-tertiary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{inv.id}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{formatDateID(inv.date)} - {inv.plan}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{formatIDR(inv.amount)}</span>
                <Badge variant="success" size="sm">Lunas</Badge>
                <button className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
