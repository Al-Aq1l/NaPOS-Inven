"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Building, Mail, Lock, Phone } from "lucide-react";
import { Card, Button, Input, Toast } from "@/components/ui";
import { createTenant } from "@/lib/dashboard-api";
import Link from "next/link";

export default function NewTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form states
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [plan, setPlan] = useState("starter");
  const [billingCycle, setBillingCycle] = useState("monthly");

  // Toast states
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const updateField = (setter: React.Dispatch<React.SetStateAction<string>>, field: string, val: string) => {
    setter(val);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!businessName.trim() || businessName.trim().length < 3) {
      errs.businessName = "Nama bisnis minimal 3 karakter.";
    }
    const cleanedPhone = phone.replace(/\D/g, "");
    if (!phone.trim() || cleanedPhone.length < 9) {
      errs.phone = "Nomor telepon tidak valid (minimal 9 digit).";
    }
    if (!ownerName.trim() || ownerName.trim().length < 3) {
      errs.ownerName = "Nama lengkap owner minimal 3 karakter.";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      errs.email = "Format email tidak valid.";
    }
    if (!password) {
      errs.password = "Password wajib diisi.";
    } else {
      if (password.length < 8) {
        errs.password = "Password minimal 8 karakter.";
      } else if (!/[0-9]/.test(password)) {
        errs.password = "Password harus mengandung minimal 1 angka.";
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errs.password = "Password harus mengandung minimal 1 karakter spesial.";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError(null);

    try {
      const res = await createTenant({
        business_name: businessName,
        name: ownerName,
        email,
        password,
        phone,
        plan,
        billing_cycle: billingCycle,
      });

      showToast(res.message, "success");
      setTimeout(() => {
        router.push("/admin/tenants");
      }, 1000);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Gagal membuat tenant baru.";
      setError(errMsg);
      showToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in pb-12">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      {/* Back Button & Title */}
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants" className="p-2 hover:bg-[var(--surface-raised)] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Tambah Tenant Baru</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Daftarkan bisnis baru beserta akun pemilik (owner) di sistem.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-[var(--danger-50)] border border-[var(--danger-200)] rounded-lg text-xs text-[var(--danger-600)] font-semibold">
          {error}
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} className="space-y-5">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mb-3">
            Informasi Usaha
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Nama Bisnis / Toko"
              value={businessName}
              onChange={(e) => updateField(setBusinessName, "businessName", e.target.value)}
              placeholder="Contoh: Nusa Mart Sentosa"
              required
              leftIcon={<Building className="w-4 h-4" />}
              error={errors.businessName}
            />
            <Input
              label="No. WhatsApp Usaha"
              value={phone}
              onChange={(e) => updateField(setPhone, "phone", e.target.value)}
              placeholder="Contoh: 6281234567890"
              required
              leftIcon={<Phone className="w-4 h-4" />}
              hint="Format diawali kode negara (62)"
              error={errors.phone}
            />
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mt-6 mb-3">
            Akun Pemilik (Owner)
          </h3>

          <div className="space-y-4">
            <Input
              label="Nama Lengkap Owner"
              value={ownerName}
              onChange={(e) => updateField(setOwnerName, "ownerName", e.target.value)}
              placeholder="Contoh: Budi Santoso"
              required
              leftIcon={<User className="w-4 h-4" />}
              error={errors.ownerName}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Email Owner"
                type="email"
                value={email}
                onChange={(e) => updateField(setEmail, "email", e.target.value)}
                placeholder="Contoh: owner@nusamart.com"
                required
                leftIcon={<Mail className="w-4 h-4" />}
                error={errors.email}
              />
              <Input
                label="Password Akun"
                type="password"
                value={password}
                onChange={(e) => updateField(setPassword, "password", e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                leftIcon={<Lock className="w-4 h-4" />}
                error={errors.password}
              />
            </div>
          </div>

          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mt-6 mb-3">
            Paket Lisensi Awal
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase">Paket Layanan</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-500)] font-semibold cursor-pointer"
              >
                <option value="starter">Starter (Gratis)</option>
                <option value="basic">Basic</option>
                <option value="growth">Growth</option>
                <option value="business">Business</option>
              </select>
            </div>

            {plan !== "starter" && (
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase">Siklus Tagihan</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBillingCycle("monthly")}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${billingCycle === "monthly"
                        ? "bg-[var(--brand-600)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    Bulanan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingCycle("annual")}
                    className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${billingCycle === "annual"
                        ? "bg-[var(--brand-600)] text-white shadow-sm"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    Tahunan
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border)] mt-6">
            <Link href="/admin/tenants">
              <Button type="button" variant="outline" className="h-10 text-xs font-bold">
                Batal
              </Button>
            </Link>
            <Button
              type="submit"
              loading={loading}
              className="h-10 text-xs font-bold px-6"
            >
              Daftarkan Tenant & Owner
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
