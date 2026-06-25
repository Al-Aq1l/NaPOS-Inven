"use client";

import React, { useEffect, useState } from "react";
import { Search, Filter, Edit3 } from "lucide-react";
import { Card, Badge, Button, DataTable, Toast } from "@/components/ui";
import { fetchAdminTenants, type AdminTenant, type PaginatedAdminTenants } from "@/lib/dashboard-api";
import Link from "next/link";

export default function AdminTenantsPage() {
  const [tenantsData, setTenantsData] = useState<PaginatedAdminTenants | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Manajemen Akun Tenant</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Cari, pantau penggunaan, dan kelola paket lisensi tenant NAPS.</p>
        </div>
        <Link href="/admin/tenants/new">
          <Button variant="primary" className="h-10 text-xs font-bold px-4 shrink-0">
            Tambah Tenant Baru
          </Button>
        </Link>
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
                <Link href={`/admin/tenants/${item.id}`}>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Edit3 className="w-3.5 h-3.5" />}
                    className="h-8 text-[11px]"
                  >
                    Kelola
                  </Button>
                </Link>
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
    </div>
  );
}
