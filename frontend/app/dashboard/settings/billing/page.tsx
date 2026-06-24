"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge, Button, Toast } from "@/components/ui";
import { PRICING_TIERS, formatIDR } from "@/lib/constants";
import { ArrowLeft, CreditCard, Download, Clock, Shield, Zap, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchBillingInfo, fetchOrders, requestPlanChange, type ApiOrder, type BillingInfo } from "@/lib/dashboard-api";

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
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [orders, setOrders] = useState<ApiOrder[]>([]);

  // Upgrade status & toast notification
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (!user) return;
      try {
        const [billingInfo, orderRows] = await Promise.all([fetchBillingInfo(), fetchOrders()]);
        if (!isMounted) return;
        setBilling(billingInfo);
        setOrders(orderRows);
      } catch {
        if (!isMounted) return;
        showToast("Gagal memuat data langganan.", "error");
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const currentPlan = billing?.plan ?? user?.tenant.plan ?? "starter";
  const currentTier = PRICING_TIERS.find((t) => t.key === currentPlan);
  const skuLimit = billing?.limits.max_sku ?? currentTier?.skuLimit ?? 30;
  const branchLimit = billing?.limits.max_branches ?? currentTier?.branchLimit ?? 1;
  const userLimit = billing?.limits.max_users ?? currentTier?.userLimit ?? 1;
  const skuUsed = billing?.usage.sku ?? 0;
  const branchUsed = billing?.usage.branches ?? 0;
  const userUsed = billing?.usage.users ?? 1;

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

  if (!user) return null;

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      <div className="flex flex-col gap-2">
        <Link 
          href="/dashboard/settings"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Kembali ke Pengaturan
        </Link>
        <div className="mt-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Tagihan & Langganan</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Kelola paket, penggunaan, dan metode pembayaran</p>
        </div>
      </div>

      {/* Subscription Expiry Card */}
      {billing && currentPlan !== "starter" && (() => {
        const expiresAt = billing.expires_at ? new Date(billing.expires_at) : null;
        const now = new Date();
        const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
        const totalDays = billing.billing_cycle === "annual" ? 365 : 30;
        const progressPct = daysLeft !== null ? Math.max(0, Math.min(100, (daysLeft / totalDays) * 100)) : 100;
        const isExpired = daysLeft !== null && daysLeft <= 0;
        const isUrgent = daysLeft !== null && daysLeft <= 3;
        const isWarning = daysLeft !== null && daysLeft <= 7;

        const statusColor = isExpired
          ? "text-[var(--danger-600)] bg-[var(--danger-50)] border-[var(--danger-200)]"
          : isUrgent
            ? "text-[var(--danger-600)] bg-[var(--danger-50)] border-[var(--danger-200)]"
            : isWarning
              ? "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950 dark:border-amber-800"
              : "text-[var(--brand-700)] bg-[var(--brand-50)] border-[var(--brand-200)] dark:text-[var(--brand-300)] dark:bg-[var(--brand-950)] dark:border-[var(--brand-800)]";

        const barColor = isExpired || isUrgent
          ? "bg-[var(--danger-500)]"
          : isWarning
            ? "bg-amber-500"
            : "bg-[var(--brand-500)]";

        return (
          <div className={cn("rounded-xl border p-5", statusColor)}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={cn("p-2.5 rounded-lg", isExpired || isUrgent ? "bg-[var(--danger-100)] dark:bg-[var(--danger-900)]" : isWarning ? "bg-amber-100 dark:bg-amber-900" : "bg-[var(--brand-100)] dark:bg-[var(--brand-900)]")}>
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-base">
                    {isExpired
                      ? "Langganan Telah Berakhir"
                      : `Sisa Langganan: ${daysLeft} Hari`}
                  </p>
                  <p className="text-sm mt-0.5 opacity-80">
                    {expiresAt
                      ? `Kedaluwarsa: ${expiresAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}${billing.billing_cycle === "annual" ? " (Tahunan)" : " (Bulanan)"}`
                      : "Tanggal kedaluwarsa belum tersedia"}
                  </p>
                </div>
              </div>
              {(isExpired || isUrgent || isWarning) && (
                <Button size="sm" variant={isExpired || isUrgent ? "danger" : "primary"} className="shrink-0">
                  Perpanjang Sekarang
                </Button>
              )}
            </div>
            {daysLeft !== null && (
              <div className="mt-4">
                <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", barColor)} style={{ width: `${progressPct}%` }} />
                </div>
                <div className="flex justify-between mt-1.5 text-[11px] font-medium opacity-70">
                  <span>Hari ini</span>
                  <span>{expiresAt?.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{currentTier?.name} Plan</h2>
              <Badge variant="brand">{currentPlan === "starter" ? "Gratis" : "Aktif"}</Badge>
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
              <span className="font-semibold text-[var(--text-primary)]">{skuUsed} / {skuLimit === "unlimited" || skuLimit === null ? "unlimited" : skuLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${skuLimit === "unlimited" || skuLimit === null ? 15 : Math.min(100, (skuUsed / skuLimit) * 100)}%` }} />
            </div>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">Akun Pengguna</span>
              <span className="font-semibold text-[var(--text-primary)]">{userUsed} / {userLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${Math.min(100, (userUsed / userLimit) * 100)}%` }} />
            </div>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">Cabang</span>
              <span className="font-semibold text-[var(--text-primary)]">{branchUsed} / {branchLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${Math.min(100, (branchUsed / branchLimit) * 100)}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-semibold text-[var(--text-primary)]">Paket Langganan</h2>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">Paket aktif hanya berubah setelah pembayaran atau approval selesai.</p>
          </div>
          <div className="flex gap-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-1">
            <button onClick={() => setAnnual(false)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer", !annual ? "bg-[var(--brand-600)] text-white" : "text-[var(--text-secondary)]")}>Bulanan</button>
            <button onClick={() => setAnnual(true)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer", annual ? "bg-[var(--brand-600)] text-white" : "text-[var(--text-secondary)]")}>Tahunan <span className="opacity-70">-20%</span></button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = tier.key === currentPlan;
            const price = annual ? tier.annualPrice : tier.price;
            return (
              <div key={tier.key} className={cn("p-4 border rounded-xl transition-all", isCurrent ? "border-[var(--brand-500)] bg-[var(--brand-50)] dark:bg-[var(--brand-950)]" : "border-[var(--border)] hover:border-[var(--brand-300)]")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--text-primary)]">{tier.name}</span>
                  {isCurrent && <Badge variant="brand" size="sm">Saat Ini</Badge>}
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">
                  {tier.price === 0 ? "Gratis" : formatIDR(price)}
                  {tier.price > 0 && <span className="text-xs font-normal text-[var(--text-tertiary)]"> /{annual ? "tahun" : "bln"}</span>}
                </p>
                <p className="text-xs text-[var(--text-tertiary)] mb-3">{tier.skuLimit === "unlimited" ? "unlimited" : tier.skuLimit} SKU - {tier.userLimit} pengguna</p>
                <Button 
                  variant={isCurrent ? "secondary" : "outline"} 
                  size="sm" 
                  className="w-full" 
                  disabled={isCurrent || upgrading !== null}
                  loading={upgrading === tier.key}
                  onClick={async () => {
                    try {
                      setUpgrading(tier.key);
                      const res = await requestPlanChange(tier.key);
                      showToast(res.message || "Permintaan perubahan paket dikirim.", "info");
                    } catch (err: unknown) {
                      const message = typeof err === "object" && err !== null && "response" in err
                        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
                        : null;
                      showToast(message || "Gagal mengirim permintaan perubahan paket.", "error");
                    } finally {
                      setUpgrading(null);
                    }
                  }}
                >
                  {isCurrent ? "Paket Saat Ini" : "Ajukan"}
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
