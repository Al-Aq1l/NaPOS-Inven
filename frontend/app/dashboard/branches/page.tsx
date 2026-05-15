"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ArrowRightLeft, Users, DollarSign, Package } from "lucide-react";
import { Card, Badge, Button, Modal, Input, StatCard } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { fetchBranches, fetchOrders, type ApiBranch, type ApiOrder } from "@/lib/dashboard-api";

export default function BranchesPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState(false);
  const [transferStatus, setTransferStatus] = useState<"draft" | "in-transit" | "received">("draft");

  useEffect(() => {
    Promise.all([fetchBranches(), fetchOrders()])
      .then(([b, o]) => {
        setBranches(b);
        setOrders(o);
      })
      .catch(() => setError("Gagal memuat data cabang."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const branchStats = useMemo(() => branches.map((b) => {
    const branchOrders = orders.filter((o) => o.branch_id === b.id && new Date(o.created_at).toDateString() === today);
    return {
      ...b,
      todayRevenue: branchOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      todayTx: branchOrders.length,
    };
  }), [branches, orders, today]);

  const totalRevenue = branchStats.reduce((s, b) => s + b.todayRevenue, 0);
  const totalTx = branchStats.reduce((s, b) => s + b.todayTx, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cabang</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Pantau performa tiap cabang</p>
        </div>
        <Button variant="outline" size="sm" icon={<ArrowRightLeft className="w-4 h-4" />} onClick={() => setTransferModal(true)}>Transfer Stok</Button>
      </div>
      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data cabang...</Card>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pendapatan Hari Ini" value={formatIDR(totalRevenue)} changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label="Transaksi Hari Ini" value={String(totalTx)} changeType="positive" icon={<Package className="w-5 h-5" />} />
        <StatCard label="Cabang Aktif" value={String(branchStats.length)} changeType="positive" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Rata-rata per Cabang" value={formatIDR(branchStats.length ? totalRevenue / branchStats.length : 0)} changeType="neutral" icon={<Users className="w-5 h-5" />} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {branchStats.map((branch) => (
          <Card key={branch.id} hover>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[var(--text-primary)]">{branch.name}</h3>
              <Badge variant={branch.status === "online" ? "success" : "default"}>{branch.status === "online" ? "online" : "offline"}</Badge>
            </div>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">{branch.address || "-"}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="p-2 rounded-lg bg-[var(--surface-raised)]"><p className="text-xs text-[var(--text-tertiary)]">Pendapatan</p><p className="font-semibold">{formatIDR(branch.todayRevenue)}</p></div>
              <div className="p-2 rounded-lg bg-[var(--surface-raised)]"><p className="text-xs text-[var(--text-tertiary)]">Transaksi</p><p className="font-semibold">{branch.todayTx}</p></div>
            </div>
          </Card>
        ))}
      </div>
      {!loading && branchStats.length === 0 && (
        <Card className="text-sm text-[var(--text-secondary)]">Belum ada data cabang untuk ditampilkan.</Card>
      )}

      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="Transfer Stok" size="md">
        <div className="space-y-3">
          <Input label="Cari Produk" placeholder="Cari nama atau SKU..." />
          <div>
            <p className="text-xs text-[var(--text-tertiary)] mb-2">Status transfer (sesuai PRD)</p>
            <div className="flex gap-2">
              <button onClick={() => setTransferStatus("draft")} className="cursor-pointer">
                <Badge variant={transferStatus === "draft" ? "info" : "default"}>draft</Badge>
              </button>
              <button onClick={() => setTransferStatus("in-transit")} className="cursor-pointer">
                <Badge variant={transferStatus === "in-transit" ? "warning" : "default"}>in-transit</Badge>
              </button>
              <button onClick={() => setTransferStatus("received")} className="cursor-pointer">
                <Badge variant={transferStatus === "received" ? "success" : "default"}>received</Badge>
              </button>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Alur transfer: draft {"->"} in-transit {"->"} received.</p>
        </div>
      </Modal>
    </div>
  );
}
