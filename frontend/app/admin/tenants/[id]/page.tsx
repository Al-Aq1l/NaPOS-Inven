"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, CalendarDays, Ban, Check, ShieldAlert,
  Loader2, Building, Phone, UserCheck, Trash2
} from "lucide-react";
import { Card, Badge, Button, Input, Toast } from "@/components/ui";
import {
  fetchAdminTenant, updateTenantSubscription,
  toggleTenantStatus, deleteTenant, type AdminTenant
} from "@/lib/dashboard-api";
import Link from "next/link";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<AdminTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [selectedCycle, setSelectedCycle] = useState<string>("monthly");
  const [expiryDate, setExpiryDate] = useState<string>("");
  
  // Submit states
  const [submittingSub, setSubmittingSub] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);
  
  // Confirmation states
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  const loadTenantDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminTenant(tenantId);
      setTenant(data);
      setSelectedPlan(data.plan);
      setSelectedCycle(data.billing_cycle || "monthly");
      if (data.expires_at) {
        setExpiryDate(new Date(data.expires_at).toISOString().split("T")[0]);
      } else {
        setExpiryDate("");
      }
    } catch (err: any) {
      console.error(err);
      setError("Gagal memuat detail data tenant.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) {
      loadTenantDetails();
    }
  }, [tenantId]);

  // Save manual subscription overrides
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;

    setSubmittingSub(true);
    try {
      const res = await updateTenantSubscription(tenant.id, {
        plan: selectedPlan,
        billing_cycle: selectedCycle,
        expires_at: selectedPlan === "starter" ? null : expiryDate || null
      });

      showToast(res.message, "success");
      loadTenantDetails(); // Refresh details
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Gagal memperbarui langganan.";
      showToast(errMsg, "error");
    } finally {
      setSubmittingSub(false);
    }
  };

  // Toggle tenant suspension status
  const handleToggleStatus = async () => {
    if (!tenant) return;

    setSubmittingStatus(true);
    try {
      const res = await toggleTenantStatus(tenant.id);
      showToast(res.message, "success");
      loadTenantDetails(); // Refresh details
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Gagal mengubah status aktif tenant.";
      showToast(errMsg, "error");
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Delete tenant permanently
  const handleDeleteTenant = async () => {
    if (!tenant) return;

    setSubmittingDelete(true);
    try {
      const res = await deleteTenant(tenant.id);
      showToast(res.message, "success");
      setTimeout(() => {
        router.push("/admin/tenants");
      }, 1200);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Gagal menghapus tenant dari sistem.";
      showToast(errMsg, "error");
      setSubmittingDelete(false);
    }
  };

  // Shortcuts to easily extend subscriptions
  const handleExtendDays = (days: number) => {
    const baseDate = expiryDate ? new Date(expiryDate) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    setExpiryDate(baseDate.toISOString().split("T")[0]);
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--brand-600)] animate-spin" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Daftar Tenant
        </Link>
        <div className="p-6 bg-[var(--danger-50)] border border-[var(--danger-200)] rounded-lg text-[var(--danger-600)]">
          <p className="font-bold">Error!</p>
          <p className="text-sm mt-1">{error || "Data tenant tidak ditemukan."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Link href="/admin/tenants" className="p-2 hover:bg-[var(--surface-raised)] rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">Kelola Akun: {tenant.name}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">Konfigurasi langganan manual, kelola status, atau hapus data tenant secara administratif.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Left Column: Summary & Info (2/3 width) */}
        <div className="md:col-span-2 space-y-6">
          <Card className="space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mb-4">
                Informasi Tenant Bisnis
              </h3>

              <div className="grid gap-y-4 sm:grid-cols-2 text-sm">
                <div className="space-y-0.5">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">ID Tenant</p>
                  <p className="font-bold text-[var(--text-primary)] font-mono">{tenant.id}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Slug Sistem</p>
                  <p className="font-bold text-[var(--text-primary)] font-mono">{tenant.slug}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Nomor WhatsApp</p>
                  <p className="font-bold text-[var(--text-primary)]">{tenant.phone || "-"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Tanggal Registrasi</p>
                  <p className="font-bold text-[var(--text-primary)]">
                    {new Date(tenant.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric"
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mb-4">
                Statistik Penggunaan Resource
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Total Cabang</p>
                    <p className="text-lg font-black text-[var(--text-primary)]">{tenant.branches_count} Cabang</p>
                  </div>
                </div>

                <div className="p-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg flex items-center gap-3">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-tertiary)] uppercase font-semibold">Total Akun Pengguna</p>
                    <p className="text-lg font-black text-[var(--text-primary)]">{tenant.users_count} Pengguna</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] border-b border-[var(--border)] pb-2 mb-4">
                Status Operasional
              </h3>

              <div className="flex items-center gap-3">
                <Badge variant={tenant.is_active ? "success" : "danger"} size="md" dot>
                  {tenant.is_active ? "Akun Aktif" : "Akun Ditangguhkan (Suspended)"}
                </Badge>
                <p className="text-xs text-[var(--text-secondary)]">
                  {tenant.is_active 
                    ? "Tenant dapat menggunakan seluruh fitur kasir dan manajemen sesuai paket." 
                    : "Semua pengguna di bawah tenant ini diblokir untuk masuk sistem."}
                </p>
              </div>
            </div>
          </Card>

          {/* Delete Action Section */}
          <Card className="border-[var(--danger-200)] bg-[var(--danger-50)]/20 space-y-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-[var(--danger-500)] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[var(--danger-600)]">Tindakan Bahaya: Hapus Tenant Permanen</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Menghapus tenant akan menghapus seluruh data transaksi, produk, cabang, pengaturan, serta akun pengguna di bawah bisnis ini secara permanen dari basis data.
                </p>
              </div>
            </div>

            {!confirmDelete ? (
              <div className="flex justify-end">
                <Button
                  onClick={() => setConfirmDelete(true)}
                  variant="danger"
                  className="h-9 text-xs font-bold"
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Hapus Tenant
                </Button>
              </div>
            ) : (
              <div className="p-4 bg-[var(--surface)] border border-[var(--danger-200)] rounded-lg space-y-3 animate-slide-down">
                <p className="text-xs font-bold text-[var(--danger-600)]">
                  Apakah Anda benar-benar yakin ingin menghapus {tenant.name} permanen? Semua data bisnis dan pengguna akan musnah.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => setConfirmDelete(false)}
                    variant="outline"
                    className="h-8 text-xs font-bold"
                  >
                    Batal
                  </Button>
                  <Button
                    onClick={handleDeleteTenant}
                    loading={submittingDelete}
                    variant="danger"
                    className="h-8 text-xs font-bold"
                  >
                    Ya, Hapus Sekarang
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Configuration & Status (1/3 width) */}
        <div className="space-y-6">
          {/* Subscription Override Card */}
          <Card>
            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--brand-600)] border-b border-[var(--border)] pb-2 mb-2">
                Manajemen Paket & Lisensi
              </h3>

              {/* Plan Selection */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase">Paket Layanan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value)}
                  className="w-full h-10 px-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-500)] font-semibold cursor-pointer"
                >
                  <option value="starter">Starter (Gratis)</option>
                  <option value="basic">Basic</option>
                  <option value="growth">Growth</option>
                  <option value="business">Business</option>
                </select>
              </div>

              {selectedPlan !== "starter" && (
                <>
                  {/* Cycle Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase">Siklus Tagihan</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSelectedCycle("monthly")}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${selectedCycle === "monthly"
                            ? "bg-[var(--brand-600)] text-white shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                      >
                        Bulanan
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedCycle("annual")}
                        className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${selectedCycle === "annual"
                            ? "bg-[var(--brand-600)] text-white shadow-sm"
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          }`}
                      >
                        Tahunan
                      </button>
                    </div>
                  </div>

                  {/* Expiry Date Selection */}
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1.5 uppercase">Tanggal Kedaluwarsa</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        required={selectedPlan !== "starter"}
                        className="w-full h-10 px-3 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-500)] font-medium"
                      />
                    </div>

                    {/* Expiry extension shortcuts */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <button
                        type="button"
                        onClick={() => handleExtendDays(30)}
                        className="py-1 px-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-500)] rounded transition-all cursor-pointer"
                      >
                        +30 H
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendDays(90)}
                        className="py-1 px-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-500)] rounded transition-all cursor-pointer"
                      >
                        +90 H
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendDays(365)}
                        className="py-1 px-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-500)] rounded transition-all cursor-pointer"
                      >
                        +1 Thn
                      </button>
                    </div>
                  </div>
                </>
              )}

              <Button
                type="submit"
                loading={submittingSub}
                className="w-full h-10 font-bold text-xs"
              >
                Simpan Perubahan Paket
              </Button>
            </form>
          </Card>

          {/* Admin Suspend Card */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--danger-500)] border-b border-[var(--border)] pb-2 mb-2">
              Kontrol Akun
            </h3>
            
            <div className="space-y-2">
              <p className="text-xs text-[var(--text-secondary)]">
                Tangguhkan akun untuk membatasi seluruh akses operasional tenant ini secara sementara.
              </p>
              <Button
                onClick={handleToggleStatus}
                loading={submittingStatus}
                variant={tenant.is_active ? "danger" : "primary"}
                className="w-full h-10 font-bold text-xs"
                icon={tenant.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
              >
                {tenant.is_active ? "Suspend Akun" : "Aktifkan Akun"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
