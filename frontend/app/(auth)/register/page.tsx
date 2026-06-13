"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, Lock, User, Phone, Building2,
  ArrowRight, ArrowLeft, ShieldCheck, RotateCcw, CheckCircle2, CreditCard,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import api from "@/lib/api";

// ─── Step config ──────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Bisnis" },
  { id: 2, label: "Akun" },
  { id: 3, label: "Verifikasi" },
  { id: 4, label: "Plan" },
];

// ─── OTP Input Component ───────────────────────────────────────────────────────
function OtpInput({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  hasError: boolean;
}) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Always produce exactly 6 slots — padEnd with empty string is a no-op
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");


  const handleChange = (index: number, char: string) => {
    const digit = char.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    const newVal = next.join("");
    onChange(newVal);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        onChange(next.join(""));
        inputRefs.current[index - 1]?.focus();
      } else {
        const next = [...digits];
        next[index] = "";
        onChange(next.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2.5 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-150",
            "bg-[var(--surface)] text-[var(--text-primary)]",
            hasError
              ? "border-[var(--danger-500)] bg-[var(--danger-50)] text-[var(--danger-600)]"
              : d
              ? "border-[var(--brand-500)] bg-[var(--brand-50)] dark:bg-[var(--brand-950)]"
              : "border-[var(--border)] focus:border-[var(--brand-500)] focus:bg-[var(--brand-50)] dark:focus:bg-[var(--brand-950)]"
          )}
        />
      ))}
    </div>
  );
}

// ─── Main Register Page ────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [step, setStep]           = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [loading, setLoading]     = useState(false);
  const [otpError, setOtpError]   = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Form data persisted across all steps
  const [formData, setFormData] = useState({
    businessName: "",
    businessType: "",
    phone: "",
    fullName: "",
    email: "",
    password: "",
    plan: "Growth",
    otp: "",
  });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Navigation ──
  const goForward = useCallback(() => {
    setDirection("forward");
    setStep((s) => s + 1);
  }, []);

  const goBack = useCallback(() => {
    setDirection("backward");
    setOtpError("");
    setStep((s) => s - 1);
  }, []);

  // ── Resend cooldown timer ──
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Send OTP via Laravel backend ──
  const sendOtp = async () => {
    try {
      await api.post("/otp/send", { email: formData.email });
      setResendCooldown(60);
    } catch {
      // Silently fail — user can retry with resend button
    }
  };

  // ── Step 2 → 3: send OTP ──
  const handleStep2Continue = async () => {
    setLoading(true);
    try {
      await sendOtp();
      goForward();
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: verify OTP ──
  const handleOtpVerify = async () => {
    if (formData.otp.length < 6) {
      setOtpError("Masukkan 6 digit kode OTP.");
      return;
    }
    setLoading(true);
    setOtpError("");
    try {
      await api.post("/otp/verify", { email: formData.email, otp: formData.otp });
      goForward();
    } catch {
      setOtpError("Kode OTP tidak valid atau sudah kedaluwarsa.");
      updateField("otp", "");
    } finally {
      setLoading(false);
    }
  };

  // ── Final submit: Firebase + Laravel register + Midtrans ──
  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      // 1. Create user in Firebase Auth
      const cred = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      await updateProfile(cred.user, { displayName: formData.fullName });

      // 2. Register in Laravel backend (returns snap_token for paid plans)
      const res = await api.post("/register", {
        business_name: formData.businessName,
        name:          formData.fullName,
        email:         formData.email,
        password:      formData.password,
        plan:          formData.plan.toLowerCase(),
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", res.data.access_token);
      }

      const snapToken: string | null = res.data.snap_token;
      const orderId: string | null = res.data.order_id;

      // 3. If paid plan, open Midtrans Snap popup
      if (snapToken) {
        // Inject Midtrans Snap.js dynamically
        const injectSnap = () => new Promise<void>((resolve) => {
          if (document.getElementById("midtrans-snap")) { resolve(); return; }
          const script = document.createElement("script");
          script.id  = "midtrans-snap";
          script.src = process.env.NEXT_PUBLIC_MIDTRANS_IS_SANDBOX === "false"
            ? "https://app.midtrans.com/snap/snap.js"
            : "https://app.sandbox.midtrans.com/snap/snap.js";
          script.setAttribute(
            "data-client-key",
            process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? ""
          );
          script.onload = () => resolve();
          document.head.appendChild(script);
        });

        await injectSnap();

        // Open Snap popup
        await new Promise<void>((resolve) => {
          (window as any).snap.pay(snapToken, {
            onSuccess:  async (result: any) => { 
                try {
                  await api.post("/payment/verify", { order_id: orderId || result.order_id });
                } catch (e) {
                  console.error("Verification failed", e);
                }
                window.location.href = "/dashboard"; 
                resolve(); 
            },
            onPending:  () => { window.location.href = "/dashboard?payment=pending"; resolve(); },
            onError:    () => { window.location.href = "/dashboard?payment=error";  resolve(); },
            onClose:    () => { window.location.href = "/dashboard?payment=pending"; resolve(); },
          });
        });
      } else {
        // Free plan — go directly to dashboard
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code: string }).code === "auth/email-already-in-use"
      ) {
        setOtpError("Email sudah terdaftar di Firebase. Silakan gunakan email lain.");
        goBack(); goBack();
      } else {
        console.error("Registration error:", err);
        // Show alert with error details if available from axios
        const errMsg = (err as any)?.response?.data?.message || (err as Error)?.message || "Terjadi kesalahan saat pendaftaran";
        alert("Gagal memproses pendaftaran: " + errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Form submit dispatcher ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { goForward(); return; }
    if (step === 2) { await handleStep2Continue(); return; }
    if (step === 3) { await handleOtpVerify(); return; }
    if (step === 4) { await handleFinalSubmit(); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Buat akun Anda</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {step === 1 && "Ceritakan tentang bisnis Anda"}
        {step === 2 && "Buat akun pemilik"}
        {step === 3 && "Verifikasi email Anda"}
        {step === 4 && "Pilih paket langganan"}
      </p>

      {/* ── Step Indicators ── */}
      <div className="flex items-center gap-1.5 mt-6 mb-8">
        {STEPS.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5 flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                s.id === step
                  ? "bg-[var(--brand-600)] text-white ring-4 ring-[var(--brand-100)] dark:ring-[var(--brand-900)] scale-110"
                  : s.id < step
                  ? "bg-[var(--brand-600)] text-white"
                  : "bg-[var(--slate-100)] text-[var(--text-tertiary)] dark:bg-[var(--slate-800)]"
              )}>
                {s.id < step ? <CheckCircle2 className="w-4 h-4" /> : s.id}
              </div>
            </div>
            {s.id < 4 && (
              <div className="flex-1 h-0.5 rounded-full overflow-hidden bg-[var(--slate-200)] dark:bg-[var(--slate-700)]">
                <div
                  className="h-full rounded-full bg-[var(--brand-500)] transition-all duration-500 ease-out"
                  style={{ width: s.id < step ? "100%" : "0%" }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          key={step}
          className={cn(
            "space-y-4",
            direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
          )}
        >
          {/* Step 1 — Business */}
          {step === 1 && (
            <>
              <Input
                label="Nama Bisnis"
                placeholder="Toko Makmur Jaya"
                leftIcon={<Building2 className="w-4 h-4" />}
                required
                value={formData.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
              />
              <Input
                label="Jenis Bisnis"
                placeholder="Retail / F&B / Other"
                required
                value={formData.businessType}
                onChange={(e) => updateField("businessType", e.target.value)}
              />
              <Input
                label="Nomor Telepon"
                type="tel"
                placeholder="+62 812 3456 7890"
                leftIcon={<Phone className="w-4 h-4" />}
                required
                value={formData.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </>
          )}

          {/* Step 2 — Account */}
          {step === 2 && (
            <>
              <Input
                label="Nama Lengkap"
                placeholder="Ahmad Rizki"
                leftIcon={<User className="w-4 h-4" />}
                required
                value={formData.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="ahmad@tokomakmur.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Min. 8 karakter"
                leftIcon={<Lock className="w-4 h-4" />}
                hint="Harus mengandung angka dan karakter spesial"
                required
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
              />
            </>
          )}

          {/* Step 3 — OTP */}
          {step === 3 && (
            <div className="space-y-6">
              {/* Info card */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--brand-50)] dark:bg-[var(--brand-950)] border border-[var(--brand-200)] dark:border-[var(--brand-800)]">
                <ShieldCheck className="w-5 h-5 text-[var(--brand-600)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[var(--brand-700)] dark:text-[var(--brand-300)]">
                    Kode OTP dikirim ke email Anda
                  </p>
                  <p className="text-xs text-[var(--brand-600)] dark:text-[var(--brand-400)] mt-0.5 break-all">
                    {formData.email}
                  </p>
                </div>
              </div>

              {/* 6-digit OTP boxes */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--text-secondary)] text-center">
                  Masukkan 6 digit kode verifikasi
                </p>
                <OtpInput
                  value={formData.otp}
                  onChange={(v) => { updateField("otp", v); setOtpError(""); }}
                  hasError={!!otpError}
                />
                {otpError && (
                  <p className="text-xs text-[var(--danger-600)] text-center animate-fade-in-up">
                    {otpError}
                  </p>
                )}
              </div>

              {/* Resend */}
              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-[var(--text-tertiary)]">
                    Kirim ulang dalam <span className="font-semibold text-[var(--text-secondary)]">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={async () => { setLoading(true); await sendOtp(); setLoading(false); }}
                    className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-600)] font-medium hover:underline"
                  >
                    <RotateCcw className="w-3 h-3" /> Kirim ulang kode
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 4 — Plan */}
          {step === 4 && (
            <div className="space-y-3">
              {[
                { name: "Starter",  price: "Gratis",        desc: "50 SKU · 1 Pengguna" },
                { name: "Basic",    price: "Rp 99K/bln",    desc: "500 SKU · 3 Pengguna" },
                { name: "Growth",   price: "Rp 249K/bln",   desc: "5.000 SKU · 10 Pengguna", popular: true },
                { name: "Business", price: "Rp 499K/bln",   desc: "SKU Tak Terbatas · 25 Pengguna" },
              ].map((plan) => (
                <label key={plan.name} className={cn(
                  "flex items-center gap-4 p-4 border rounded-xl cursor-pointer transition-all hover:border-[var(--brand-300)]",
                  formData.plan === plan.name
                    ? "border-[var(--brand-500)] bg-[var(--brand-50)] dark:bg-[var(--brand-950)]"
                    : "border-[var(--border)]"
                )}>
                  <input
                    type="radio"
                    name="plan"
                    checked={formData.plan === plan.name}
                    onChange={() => updateField("plan", plan.name)}
                    className="accent-[var(--brand-600)]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{plan.name}</span>
                      {plan.popular && (
                        <span className="text-xs px-2 py-0.5 bg-[var(--brand-600)] text-white rounded-full">
                          Populer
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{plan.desc}</p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{plan.price}</span>
                </label>
              ))}
              <div className="flex items-center gap-2 mt-3 p-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)]">
                <CreditCard className="w-4 h-4 text-[var(--brand-600)] shrink-0" />
                <p className="text-xs text-[var(--text-secondary)]">
                  Paket berbayar akan memunculkan halaman pembayaran Midtrans. Tersedia: Transfer Bank, GoPay, QRIS, Kartu Kredit & lainnya.
                </p>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Semua paket berbayar sudah termasuk uji coba gratis 14 hari.
              </p>
            </div>
          )}

        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3 pt-2">
          {step > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="flex-1"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
          )}
          <Button type="submit" loading={loading} className="flex-1">
            {step === 3
              ? "Verifikasi"
              : step === 4
              ? "Buat Akun"
              : "Lanjutkan"}
            {step !== 3 && step !== 4 && <ArrowRight className="w-4 h-4" />}
            {step === 3 && <ShieldCheck className="w-4 h-4" />}
          </Button>
        </div>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">
        Sudah punya akun?{" "}
        <Link href="/login" className="text-[var(--brand-600)] font-medium hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
