"use client";

import React, { useEffect, useState } from "react";
import {
  Users, DollarSign, Zap, AlertTriangle, MessageSquare, ArrowRight,
  CalendarDays, Loader2
} from "lucide-react";
import { Card, Badge, Button, Toast } from "@/components/ui";
import { fetchAdminSummary, sendTenantExpiryWarning, type AdminSummary } from "@/lib/dashboard-api";
import { formatIDR } from "@/lib/constants";
import Link from "next/link";

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const data = await fetchAdminSummary();
        setSummary(data);
      } catch (err) {
        console.error(err);
        setError("Gagal memuat ringkasan data admin.");
      } finally {
        setLoading(false);
      }
    }
    loadSummary();
  }, []);

  // Toast states
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const handleSendWhatsAppWarning = async (tenantId: number) => {
    setSendingId(tenantId);
    try {
      const response = await sendTenantExpiryWarning(tenantId);
      if (response.success) {
        showToast(response.message || "Pesan WhatsApp berhasil dikirim.", "success");
      } else {
        showToast(response.message || "Gagal mengirim WhatsApp.", "error");
      }
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.response?.data?.message || "Gagal menghubungi server WhatsApp Gateway.";
      showToast(errMsg, "error");
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--brand-600)] animate-spin" />
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-[var(--danger-50)] border border-[var(--danger-200)] rounded-xl text-[var(--danger-600)]">
        <p className="font-bold">Error!</p>
        <p className="text-sm mt-1">{error || "Terjadi kesalahan yang tidak diketahui."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Ringkasan Sistem</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Selamat datang kembali. Berikut adalah ringkasan performa NaPS.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover className="transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Pendapatan</p>
              <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
                {formatIDR(summary.total_revenue)}
              </p>
              <p className="text-[10px] text-[var(--brand-600)] font-medium">Berdasarkan transaksi Midtrans</p>
            </div>
            <div className="p-2.5 bg-[var(--brand-50)] text-[var(--brand-600)] border border-[var(--brand-100)] rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card hover className="transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Total Tenant</p>
              <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{summary.total_tenants}</p>
              <p className="text-[10px] text-emerald-600 font-medium">Pengguna terdaftar di sistem</p>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card hover className="transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Tenant Berbayar</p>
              <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{summary.active_subscribers}</p>
              <p className="text-[10px] text-[var(--brand-600)] font-medium">Paket Basic / Growth / Business</p>
            </div>
            <div className="p-2.5 bg-[var(--brand-50)] text-[var(--brand-600)] border border-[var(--brand-100)] rounded-lg">
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card hover className="transition-all duration-300">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Akun Ditangguhkan</p>
              <p className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{summary.suspended_tenants}</p>
              <p className="text-[10px] text-[var(--danger-500)] font-medium">Tenant yang berstatus nonaktif</p>
            </div>
            <div className="p-2.5 bg-[var(--danger-50)] text-[var(--danger-600)] border border-[var(--danger-100)] rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Grid: Expirations & System Info */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Col: Expiration Alerts (Spans 2 cols) */}
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Peringatan Kedaluwarsa Langganan (≤ 7 Hari)
            </h3>
            <Badge variant="default">
              {summary.upcoming_expirations.length} Tenant
            </Badge>
          </div>

          <Card className="overflow-hidden" padding="none">
            {summary.upcoming_expirations.length === 0 ? (
              <div className="p-8 text-center text-[var(--text-secondary)] space-y-2">
                <Users className="w-8 h-8 text-[var(--text-tertiary)] mx-auto" />
                <p className="text-sm font-semibold">Tidak ada tenant yang segera berakhir.</p>
                <p className="text-xs text-[var(--text-tertiary)]">Semua langganan tenant berada dalam durasi aman.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                {summary.upcoming_expirations.map((item) => (
                  <div key={item.tenant_id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--surface-raised)] transition-colors">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[var(--text-primary)] text-sm truncate">{item.tenant_name}</span>
                        <Badge variant="brand" size="sm" className="capitalize">{item.plan}</Badge>
                        <Badge variant="danger">
                          Sisa {item.days_left} Hari
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)] flex-wrap">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Kedaluwarsa: {new Date(item.expires_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                        {item.phone && <span>WhatsApp: {item.phone}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.phone ? (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none h-8 text-xs font-semibold"
                          loading={sendingId === item.tenant_id}
                          onClick={() => handleSendWhatsAppWarning(item.tenant_id)}
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                          Kirim WA
                        </Button>
                      ) : (
                        <span className="text-[10px] text-[var(--text-tertiary)] italic">No WA</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Quick Actions & Overview Info */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Navigasi Cepat
            </h3>
            <Card padding="sm" className="space-y-2">
              <Link href="/admin/tenants">
                <Button variant="outline" className="w-full justify-between h-10 text-xs text-[var(--text-secondary)]">
                  <span>Kelola Database Tenant</span>
                  <ArrowRight className="w-4 h-4 text-[var(--brand-600)]" />
                </Button>
              </Link>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
              Informasi Lisensi
            </h3>
            <Card padding="none" className="p-5 space-y-4 text-xs">
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-secondary)]">Lisensi Sistem</span>
                <span className="font-bold text-[var(--text-primary)]">NaPS Enterprise</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-secondary)]">Versi Core</span>
                <span className="font-bold text-[var(--brand-600)]">v2.1.0-prod</span>
              </div>
              <div className="flex justify-between border-b border-[var(--border)] pb-2">
                <span className="text-[var(--text-secondary)]">WhatsApp Gateway</span>
                <span className="font-bold text-emerald-600">Tersambung (Online)</span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-[var(--text-secondary)]">Status Server</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Operasional
                </span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
