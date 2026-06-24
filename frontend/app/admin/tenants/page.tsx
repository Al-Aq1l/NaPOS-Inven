"use client";

import React, { useEffect, useState } from "react";
import {
  Search, Filter, Edit3, Ban, Loader2, CalendarDays, Check
} from "lucide-react";
import { Card, Badge, Button, DataTable, Drawer, Toast } from "@/components/ui";
import {
  fetchAdminTenants, updateTenantSubscription, toggleTenantStatus,
  type AdminTenant, type PaginatedAdminTenants
} from "@/lib/dashboard-api";

export default function AdminTenantsPage() {
  const [tenantsData, setTenantsData] = useState<PaginatedAdminTenants | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");

  // Drawer & Action states
  const [selectedTenant, setSelectedTenant] = useState<AdminTenant | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Form states in Drawer
  const [selectedPlan, setSelectedPlan] = useState<string>("starter");
  const [selectedCycle, setSelectedCycle] = useState<string>("monthly");
  const [expiryDate, setExpiryDate] = useState<string>("");

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

  const loadTenants = async (currentPage: number) => {
    setLoading(true);
    try {
      const data = await fetchAdminTenants({
        search,
        plan,
        status,
        page: currentPage
      });
      setTenantsData(data);
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat daftar tenant.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Reload data on query or page changes
  useEffect(() => {
    loadTenants(page);
  }, [page, plan, status]);

  // Handler for search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTenants(1);
  };

  // Open Drawer and populate form
  const handleOpenDrawer = (tenant: AdminTenant) => {
    setSelectedTenant(tenant);
    setSelectedPlan(tenant.plan);
    setSelectedCycle(tenant.billing_cycle || "monthly");

    if (tenant.expires_at) {
      setExpiryDate(new Date(tenant.expires_at).toISOString().split("T")[0]);
    } else {
      setExpiryDate("");
    }

    setDrawerOpen(true);
  };

  // Save manual subscription overrides
  const handleSaveSubscription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setSubmittingSub(true);
    try {
      const res = await updateTenantSubscription(selectedTenant.id, {
        plan: selectedPlan,
        billing_cycle: selectedCycle,
        expires_at: selectedPlan === "starter" ? null : expiryDate || null
      });

      showToast(res.message, "success");
      setDrawerOpen(false);
      loadTenants(page); // Refresh main table
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
    if (!selectedTenant) return;

    setSubmittingStatus(true);
    try {
      const res = await toggleTenantStatus(selectedTenant.id);
      showToast(res.message, "success");

      // Update local tenant details in drawer immediately
      setSelectedTenant(prev => prev ? { ...prev, is_active: res.is_active } : null);
      loadTenants(page); // Refresh main table
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || "Gagal mengubah status aktif tenant.";
      showToast(errMsg, "error");
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Shortcuts to easily extend subscriptions
  const handleExtendDays = (days: number) => {
    const baseDate = expiryDate ? new Date(expiryDate) : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    setExpiryDate(baseDate.toISOString().split("T")[0]);
  };

  // Date formatting helper for columns
  const formatExpirations = (dateString: string | null, planName: string) => {
    if (planName === "starter" || !dateString) {
      return <span className="text-[var(--text-tertiary)] font-medium">- (Starter)</span>;
    }
    const expDate = new Date(dateString);
    const today = new Date();
    const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return (
        <Badge variant="danger">
          Expired ({Math.abs(daysLeft)} hari lalu)
        </Badge>
      );
    }

    if (daysLeft <= 7) {
      return (
        <Badge variant="warning">
          Sisa {daysLeft} hari ({expDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })})
        </Badge>
      );
    }

    return (
      <span className="text-[var(--text-secondary)] font-medium">
        {expDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Database Tenant</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Cari, pantau penggunaan, dan kelola paket lisensi tenant NAPS.</p>
      </div>

      {/* Toolbar Search & Filters */}
      <Card hover={false} className="p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Cari nama bisnis, slug, atau nomor WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-500)] placeholder:text-[var(--text-tertiary)] transition-colors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--text-tertiary)]" />
              <select
                value={plan}
                onChange={(e) => { setPlan(e.target.value); setPage(1); }}
                className="h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand-500)] cursor-pointer"
              >
                <option value="">Semua Paket</option>
                <option value="starter">Starter</option>
                <option value="basic">Basic</option>
                <option value="growth">Growth</option>
                <option value="business">Business</option>
              </select>
            </div>

            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] focus:outline-none focus:border-[var(--brand-500)] cursor-pointer"
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Ditangguhkan</option>
            </select>

            <Button type="submit" variant="secondary" className="h-10 text-xs font-bold">
              Cari
            </Button>
          </div>
        </form>
      </Card>

      {/* Main Database Table */}
      <div className="bg-[var(--surface)] rounded-xl overflow-hidden border border-[var(--border)] shadow-[var(--shadow-sm)]">
        <DataTable
          loading={loading}
          data={tenantsData?.data || []}
          keyExtractor={(item) => String(item.id)}
          emptyMessage="Tidak ada tenant yang cocok dengan kriteria pencarian."
          columns={[
            {
              key: "name",
              label: "Tenant Bisnis",
              render: (item) => (
                <div>
                  <p className="font-bold text-[var(--text-primary)] text-sm">{item.name}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 font-mono">slug: {item.slug}</p>
                </div>
              ),
            },
            {
              key: "phone",
              label: "WhatsApp",
              render: (item) => item.phone ? (
                <span className="text-xs font-mono text-[var(--text-primary)]">{item.phone}</span>
              ) : (
                <span className="text-[var(--text-tertiary)] italic text-xs">Belum diatur</span>
              ),
            },
            {
              key: "plan",
              label: "Paket",
              render: (item) => (
                <div className="flex flex-col gap-1 items-start">
                  <Badge variant={item.plan === "starter" ? "default" : "brand"} size="sm" className="capitalize">
                    {item.plan}
                  </Badge>
                  {item.plan !== "starter" && (
                    <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">
                      {item.billing_cycle === "annual" ? "Tahunan" : "Bulanan"}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: "expires_at",
              label: "Tanggal Kedaluwarsa",
              render: (item) => formatExpirations(item.expires_at, item.plan),
            },
            {
              key: "usage",
              label: "Penggunaan",
              render: (item) => (
                <div className="text-xs text-[var(--text-secondary)] space-y-0.5">
                  <p>{item.branches_count} Cabang</p>
                  <p>{item.users_count} Pengguna</p>
                </div>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (item) => (
                <Badge variant={item.is_active ? "success" : "danger"} size="sm" dot>
                  {item.is_active ? "Aktif" : "Suspended"}
                </Badge>
              ),
            },
            {
              key: "actions",
              label: "Aksi",
              render: (item) => (
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Edit3 className="w-3.5 h-3.5" />}
                  className="h-8 text-[11px]"
                  onClick={() => handleOpenDrawer(item)}
                >
                  Kelola
                </Button>
              ),
            },
          ]}
        />
      </div>

      {/* Pagination Controls */}
      {tenantsData && tenantsData.last_page > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs text-[var(--text-tertiary)]">
            Menampilkan Halaman {tenantsData.current_page} dari {tenantsData.last_page} ({tenantsData.total} tenant terdaftar)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs disabled:opacity-30"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs disabled:opacity-30"
              disabled={page >= tenantsData.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Drawer Panel */}
      {drawerOpen && selectedTenant && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          title={`Kelola Tenant: ${selectedTenant.name}`}
        >
          <div className="p-5 space-y-6 text-[var(--text-primary)]">
            {/* Quick Profile Summary */}
            <div className="space-y-2 border-b border-[var(--border)] pb-4">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">Detail Tenant</p>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Bisnis ID / Slug:</span>
                <span className="font-bold text-[var(--text-primary)] font-mono">{selectedTenant.id} / {selectedTenant.slug}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">WhatsApp:</span>
                <span className="font-bold text-[var(--text-primary)]">{selectedTenant.phone || "Belum diatur"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-secondary)]">Tgl Bergabung:</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {new Date(selectedTenant.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Manual Subscription Config Form */}
            <form onSubmit={handleSaveSubscription} className="space-y-4">
              <p className="text-xs font-semibold text-[var(--brand-600)] uppercase tracking-wider">Konfigurasi Langganan Manual</p>

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
                        +30 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendDays(90)}
                        className="py-1 px-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-500)] rounded transition-all cursor-pointer"
                      >
                        +90 Hari
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExtendDays(365)}
                        className="py-1 px-1 text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--brand-500)] rounded transition-all cursor-pointer"
                      >
                        +1 Tahun
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

            {/* Suspend / Activation Section */}
            <div className="space-y-3 pt-6 border-t border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--danger-500)] uppercase tracking-wider">Tindakan Administratif</p>

              <div className="p-3 bg-[var(--danger-50)] border border-[var(--danger-100)] rounded-lg flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    {selectedTenant.is_active ? "Tangguhkan Akun" : "Aktifkan Akun"}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {selectedTenant.is_active
                      ? "Menolak login dan memblokir akses kasir/admin tenant"
                      : "Mengembalikan akses penuh akun tenant ke aplikasi"}
                  </p>
                </div>
                <Button
                  onClick={handleToggleStatus}
                  loading={submittingStatus}
                  variant={selectedTenant.is_active ? "danger" : "primary"}
                  size="sm"
                  className="h-8 text-[10px] font-bold shrink-0"
                  icon={selectedTenant.is_active ? <Ban className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                >
                  {selectedTenant.is_active ? "Suspend" : "Aktifkan"}
                </Button>
              </div>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
