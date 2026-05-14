"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Badge, Button } from "@/components/ui";
import { PRICING_TIERS, formatIDR } from "@/lib/constants";
import { Check, CreditCard, Download, ArrowRight, Clock, Shield, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const INVOICES = [
  { id: "INV-2024-006", date: "2024-01-15", amount: 249000, status: "paid", plan: "Growth" },
  { id: "INV-2024-005", date: "2023-12-15", amount: 249000, status: "paid", plan: "Growth" },
  { id: "INV-2024-004", date: "2023-11-15", amount: 249000, status: "paid", plan: "Growth" },
  { id: "INV-2024-003", date: "2023-10-15", amount: 99000, status: "paid", plan: "Basic" },
  { id: "INV-2024-002", date: "2023-09-15", amount: 99000, status: "paid", plan: "Basic" },
];

export default function BillingPage() {
  const { user } = useAuth();
  const [annual, setAnnual] = useState(false);
  if (!user) return null;

  const currentTier = PRICING_TIERS.find((t) => t.key === user.tenant.plan);
  const skuUsed = 847;
  const userUsed = 5;

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Billing & Subscription</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your plan, usage, and payment methods</p>
      </div>

      {/* Current Plan */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--brand-100)] to-transparent rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 dark:from-[var(--brand-900)]" />
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{currentTier?.name} Plan</h2>
              <Badge variant="brand">{user.tenant.plan === "starter" ? "Free" : "Active"}</Badge>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-1">{currentTier?.description}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-extrabold text-[var(--text-primary)]">
              {currentTier?.price === 0 ? "Free" : formatIDR(currentTier?.price || 0)}
            </p>
            <p className="text-sm text-[var(--text-tertiary)]">per month</p>
          </div>
        </div>

        {/* Usage Meters */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">SKU Products</span>
              <span className="font-semibold text-[var(--text-primary)]">{skuUsed} / {currentTier?.skuLimit === "unlimited" ? "∞" : currentTier?.skuLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${currentTier?.skuLimit === "unlimited" ? 15 : (skuUsed / (currentTier?.skuLimit as number)) * 100}%` }} />
            </div>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">User Accounts</span>
              <span className="font-semibold text-[var(--text-primary)]">{userUsed} / {currentTier?.userLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${(userUsed / (currentTier?.userLimit || 1)) * 100}%` }} />
            </div>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-[var(--text-secondary)]">Branches</span>
              <span className="font-semibold text-[var(--text-primary)]">3 / {currentTier?.branchLimit}</span>
            </div>
            <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
              <div className="h-full bg-[var(--brand-500)] rounded-full transition-all" style={{ width: `${(3 / (currentTier?.branchLimit || 1)) * 100}%` }} />
            </div>
          </div>
        </div>
      </Card>

      {/* Upgrade Plans */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-[var(--text-primary)]">Change Plan</h2>
          <div className="flex gap-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg p-1">
            <button onClick={() => setAnnual(false)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer", !annual ? "bg-[var(--brand-600)] text-white" : "text-[var(--text-secondary)]")}>Monthly</button>
            <button onClick={() => setAnnual(true)} className={cn("px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer", annual ? "bg-[var(--brand-600)] text-white" : "text-[var(--text-secondary)]")}>Annual <span className="opacity-70">-20%</span></button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRICING_TIERS.map((tier) => {
            const isCurrent = tier.key === user.tenant.plan;
            const price = annual ? tier.annualPrice : tier.price;
            return (
              <div key={tier.key} className={cn("p-4 border rounded-xl transition-all",
                isCurrent ? "border-[var(--brand-500)] bg-[var(--brand-50)] dark:bg-[var(--brand-950)]" : "border-[var(--border)] hover:border-[var(--brand-300)]")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-[var(--text-primary)]">{tier.name}</span>
                  {isCurrent && <Badge variant="brand" size="sm">Current</Badge>}
                </div>
                <p className="text-xl font-bold text-[var(--text-primary)]">{price === 0 ? "Free" : formatIDR(price)}</p>
                <p className="text-xs text-[var(--text-tertiary)] mb-3">{tier.skuLimit === "unlimited" ? "∞" : tier.skuLimit} SKUs · {tier.userLimit} users</p>
                <Button variant={isCurrent ? "secondary" : "outline"} size="sm" className="w-full" disabled={isCurrent}>
                  {isCurrent ? "Current Plan" : "Switch"}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Payment Method */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[var(--brand-600)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Payment Method</h2>
          </div>
          <Button variant="ghost" size="sm">Update</Button>
        </div>
        <div className="flex items-center gap-4 p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
          <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">VISA</div>
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">•••• •••• •••• 4242</p>
            <p className="text-xs text-[var(--text-tertiary)]">Expires 12/2025</p>
          </div>
          <Badge variant="success" size="sm" className="ml-auto">Default</Badge>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Secured by Midtrans</div>
          <div className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Auto-renewal enabled</div>
        </div>
      </Card>

      {/* Invoice History */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--brand-600)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Invoice History</h2>
          </div>
        </div>
        <div className="space-y-2">
          {INVOICES.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--surface-raised)] rounded-lg flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-[var(--text-tertiary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{inv.id}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{inv.date} · {inv.plan} Plan</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{formatIDR(inv.amount)}</span>
                <Badge variant="success" size="sm">Paid</Badge>
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
