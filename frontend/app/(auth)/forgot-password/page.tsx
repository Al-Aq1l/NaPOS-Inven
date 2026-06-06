"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Mail, Lock, ArrowRight, ArrowLeft, ShieldCheck, RotateCcw, CheckCircle2,
} from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const STEPS = [
  { id: 1, label: "Email" },
  { id: 2, label: "Verifikasi" },
  { id: 3, label: "Password" },
];

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

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    password: "",
  });

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goForward = useCallback(() => {
    setDirection("forward");
    setError("");
    setStep((s) => s + 1);
  }, []);

  const goBack = useCallback(() => {
    setDirection("backward");
    setError("");
    setStep((s) => s - 1);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const sendOtp = async () => {
    setError("");
    try {
      await api.post("/otp/send", { email: formData.email });
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal mengirim OTP.");
      throw err;
    }
  };

  const handleStep1Continue = async () => {
    if (!formData.email) {
      setError("Email wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      await sendOtp();
      goForward();
    } catch {
      // Error is handled in sendOtp
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (formData.otp.length < 6) {
      setError("Masukkan 6 digit kode OTP.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/otp/verify", { email: formData.email, otp: formData.otp });
      goForward();
    } catch {
      setError("Kode OTP tidak valid atau sudah kedaluwarsa.");
      updateField("otp", "");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (formData.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/password/reset", {
        email: formData.email,
        otp: formData.otp,
        password: formData.password,
      });
      // Redirect to login with a success query param
      router.push("/login?reset=success");
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.errors?.otp?.[0] || "Gagal mengubah password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { await handleStep1Continue(); return; }
    if (step === 2) { await handleOtpVerify(); return; }
    if (step === 3) { await handleFinalSubmit(); }
  };

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Lupa Password</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        {step === 1 && "Masukkan email akun Anda"}
        {step === 2 && "Verifikasi kepemilikan akun"}
        {step === 3 && "Buat password baru"}
      </p>

      {/* Step Indicators */}
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
            {s.id < 3 && (
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          key={step}
          className={cn(
            "space-y-4",
            direction === "forward" ? "animate-slide-in-right" : "animate-slide-in-left"
          )}
        >
          {step === 1 && (
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="ahmad@tokomakmur.com"
                leftIcon={<Mail className="w-4 h-4" />}
                required
                value={formData.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
              {error && (
                <p className="text-sm text-[var(--danger-600)]">{error}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
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

              <div className="space-y-3">
                <p className="text-xs font-medium text-[var(--text-secondary)] text-center">
                  Masukkan 6 digit kode verifikasi
                </p>
                <OtpInput
                  value={formData.otp}
                  onChange={(v) => { updateField("otp", v); setError(""); }}
                  hasError={!!error}
                />
                {error && (
                  <p className="text-xs text-[var(--danger-600)] text-center animate-fade-in-up">
                    {error}
                  </p>
                )}
              </div>

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

          {step === 3 && (
            <div className="space-y-4">
              <Input
                label="Password Baru"
                type="password"
                placeholder="Min. 8 karakter"
                leftIcon={<Lock className="w-4 h-4" />}
                hint="Harus mengandung angka dan karakter spesial"
                required
                value={formData.password}
                onChange={(e) => updateField("password", e.target.value)}
              />
              {error && (
                <p className="text-sm text-[var(--danger-600)]">{error}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              className="flex-1"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" /> Kembali
            </Button>
          ) : (
             <Link href="/login" className="flex-1" tabIndex={-1}>
               <Button type="button" variant="outline" className="w-full">
                 <ArrowLeft className="w-4 h-4" /> Batal
               </Button>
             </Link>
          )}
          <Button type="submit" loading={loading} className="flex-1">
            {step === 3 ? "Simpan" : "Lanjutkan"}
            {step !== 3 && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </form>
    </div>
  );
}
