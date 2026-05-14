"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, Phone, Building2, ArrowRight, ArrowLeft } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep(step + 1); return; }
    setLoading(true);
    await login("owner@napos.id", "demo");
    router.push("/dashboard");
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create your account</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {step === 1 && "Tell us about your business"}
        {step === 2 && "Create your owner account"}
        {step === 3 && "Choose your plan"}
      </p>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mt-6 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
              s <= step ? "bg-[var(--brand-600)] text-white" : "bg-[var(--slate-100)] text-[var(--text-tertiary)] dark:bg-[var(--slate-800)]"
            )}>{s}</div>
            {s < 3 && <div className={cn("flex-1 h-0.5 rounded-full", s < step ? "bg-[var(--brand-500)]" : "bg-[var(--slate-200)] dark:bg-[var(--slate-700)]")} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {step === 1 && (
          <>
            <Input label="Business Name" placeholder="Toko Makmur Jaya" leftIcon={<Building2 className="w-4 h-4" />} required />
            <Input label="Business Type" placeholder="Retail / F&B / Other" required />
            <Input label="Phone Number" type="tel" placeholder="+62 812 3456 7890" leftIcon={<Phone className="w-4 h-4" />} required />
          </>
        )}
        {step === 2 && (
          <>
            <Input label="Full Name" placeholder="Ahmad Rizki" leftIcon={<User className="w-4 h-4" />} required />
            <Input label="Email" type="email" placeholder="ahmad@tokomakmur.com" leftIcon={<Mail className="w-4 h-4" />} required />
            <Input label="Password" type="password" placeholder="Min. 8 characters" leftIcon={<Lock className="w-4 h-4" />} hint="Must contain a number and special character" required />
          </>
        )}
        {step === 3 && (
          <div className="space-y-3">
            {[
              { name: "Starter", price: "Free", desc: "50 SKUs · 1 User" },
              { name: "Basic", price: "Rp 99K/mo", desc: "500 SKUs · 3 Users" },
              { name: "Growth", price: "Rp 249K/mo", desc: "5,000 SKUs · 10 Users", popular: true },
              { name: "Business", price: "Rp 499K/mo", desc: "Unlimited SKUs · 25 Users" },
            ].map((plan) => (
              <label key={plan.name} className={cn(
                "flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all hover:border-[var(--brand-300)]",
                plan.popular ? "border-[var(--brand-500)] bg-[var(--brand-50)] dark:bg-[var(--brand-950)]" : "border-[var(--border)]"
              )}>
                <input type="radio" name="plan" defaultChecked={plan.popular} className="accent-[var(--brand-600)]" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--text-primary)]">{plan.name}</span>
                    {plan.popular && <span className="text-xs px-2 py-0.5 bg-[var(--brand-600)] text-white rounded-full">Popular</span>}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{plan.desc}</p>
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{plan.price}</span>
              </label>
            ))}
            <p className="text-xs text-[var(--text-tertiary)] mt-2">All paid plans include a 14-day free trial.</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="flex-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <Button type="submit" loading={loading} className="flex-1">
            {step < 3 ? "Continue" : "Create Account"}
            {step < 3 && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--brand-600)] font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
