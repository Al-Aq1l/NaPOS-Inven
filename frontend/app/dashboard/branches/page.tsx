"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, DollarSign, Info, Package, Users } from "lucide-react";
import { Badge, Card, StatCard } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { fetchBillingInfo, fetchBranches, fetchOrders, type ApiBranch, type ApiOrder, type BillingInfo } from "@/lib/dashboard-api";

export default function BranchesPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [branchData, orderData, billingInfo] = await Promise.all([fetchBranches(), fetchOrders(), fetchBillingInfo()]);
        if (!mounted) return;
        setBranches(branchData);
        setOrders(orderData);
        setBilling(billingInfo);
      } catch {
        if (mounted) setError("Gagal memuat data cabang.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const today = new Date().toDateString();
  const branchStats = useMemo(() => branches.map((branch) => {
    const branchOrders = orders.filter((order) => order.branch_id === branch.id && new Date(order.created_at).toDateString() === today);
    return {
      ...branch,
      todayRevenue: branchOrders.reduce((sum, order) => sum + Number(order.total_amount), 0),
      todayTx: branchOrders.length,
    };
  }), [branches, orders, today]);

  const totalRevenue = branchStats.reduce((sum, branch) => sum + branch.todayRevenue, 0);
  const totalTx = branchStats.reduce((sum, branch) => sum + branch.todayTx, 0);
  const branchLimit = billing?.limits.max_branches ?? 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cabang</h1>
          <span
            title="Pantau daftar cabang, status operasional, alamat, dan performa penjualan harian tiap lokasi."
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Pantau performa dan status operasional tiap cabang.</p>
      </div>

      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data cabang...</Card>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pendapatan Hari Ini" value={formatIDR(totalRevenue)} changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label="Transaksi Hari Ini" value={String(totalTx)} changeType="positive" icon={<Package className="w-5 h-5" />} />
        <StatCard label="Cabang Aktif" value={String(branchStats.length)} changeType="positive" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Limit Paket" value={`${branchStats.length} / ${branchLimit}`} changeType={branchStats.length >= branchLimit ? "negative" : "neutral"} icon={<Users className="w-5 h-5" />} />
      </div>

      {billing && branchStats.length >= branchLimit && (
        <Card className="border-amber-200 bg-amber-50 text-sm text-amber-800">
          Limit cabang paket aktif sudah tercapai. Ajukan upgrade paket di Tagihan & Langganan untuk menambah cabang.
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {branchStats.map((branch) => (
          <Card key={branch.id} hover>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-[var(--text-primary)]">{branch.name}</h3>
              <Badge variant={branch.status === "online" ? "success" : "default"}>{branch.status === "online" ? "online" : "offline"}</Badge>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{branch.address || "-"}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-[var(--surface-raised)]">
                <p className="text-xs text-[var(--text-tertiary)]">Pendapatan</p>
                <p className="font-semibold">{formatIDR(branch.todayRevenue)}</p>
              </div>
              <div className="p-2 rounded-lg bg-[var(--surface-raised)]">
                <p className="text-xs text-[var(--text-tertiary)]">Transaksi</p>
                <p className="font-semibold">{branch.todayTx}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {!loading && branchStats.length === 0 && (
        <Card className="text-sm text-[var(--text-secondary)]">Belum ada data cabang untuk ditampilkan.</Card>
      )}
    </div>
  );
}
