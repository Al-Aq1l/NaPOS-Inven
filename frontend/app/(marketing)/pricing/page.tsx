"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { PRICING_TIERS, formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <section className="pt-32 pb-20 lg:pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Paket Harga Transparan
          </h1>
          <p className="mt-4 text-lg text-[var(--text-secondary)]">
            Mulai gratis. Naik kelas saat bisnis berkembang.
          </p>
          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                !annual ? "bg-[var(--brand-600)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Bulanan
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                annual ? "bg-[var(--brand-600)] text-white shadow-sm" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              Tahunan
              <span className="ml-1.5 text-xs opacity-80">Hemat 20%</span>
            </button>
          </div>
        </div>

        {/* Tier Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          {PRICING_TIERS.map((tier) => {
            const price = annual ? tier.annualPrice : tier.price;
            return (
              <div
                key={tier.key}
                className={cn(
                  "relative flex flex-col p-6 bg-[var(--surface)] border rounded-xl transition-all duration-300 hover:-translate-y-1",
                  tier.highlighted
                    ? "border-[var(--brand-500)] shadow-[var(--shadow-lg)] ring-1 ring-[var(--brand-500)]"
                    : "border-[var(--border)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-md)]"
                )}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className={cn(
                    "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap",
                    tier.highlighted
                      ? "bg-[var(--brand-600)] text-white"
                      : "bg-[var(--slate-100)] text-[var(--slate-600)] dark:bg-[var(--slate-800)] dark:text-[var(--slate-300)]"
                  )}>
                    {tier.badge}
                  </div>
                )}

                {/* Tier Info */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">{tier.name}</h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)] min-h-[40px]">{tier.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {price === 0 ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-[var(--text-primary)]">Free</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-[var(--text-primary)]">{formatIDR(price)}</span>
                      <span className="text-sm text-[var(--text-tertiary)]">/mo</span>
                    </div>
                  )}
                </div>

                {/* Limits */}
                <div className="flex gap-4 mb-6 p-3 bg-[var(--surface-raised)] rounded-lg">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-[var(--text-primary)]">
                      {tier.skuLimit === "unlimited" ? "∞" : tier.skuLimit}
                    </p>
                    <p className="text-xs text-[var(--text-tertiary)]">SKUs</p>
                  </div>
                  <div className="w-px bg-[var(--border)]" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{tier.userLimit}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Pengguna</p>
                  </div>
                  <div className="w-px bg-[var(--border)]" />
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{tier.branchLimit}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Cabang</p>
                  </div>
                </div>

                {/* CTA */}
                <Link href="/register" className="mb-6">
                  <Button
                    variant={tier.highlighted ? "primary" : "outline"}
                    className="w-full"
                  >
                    {tier.price === 0 ? "Mulai Sekarang" : "Coba Gratis"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                {/* Features */}
                <ul className="space-y-3 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-[var(--brand-500)] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-[var(--text-secondary)]">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* FAQ teaser */}
        <div className="mt-16 text-center">
          <p className="text-[var(--text-secondary)]">
            Ada pertanyaan?{" "}
            <Link href="#" className="text-[var(--brand-600)] font-medium hover:underline">
              Hubungi tim kami
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
