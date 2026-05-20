"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, ArrowRightLeft, Users, DollarSign, Package } from "lucide-react";
import { Card, Badge, Button, Modal, Input, StatCard, Toast } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { fetchBranches, fetchOrders, fetchProducts, type ApiBranch, type ApiOrder, type ApiProduct } from "@/lib/dashboard-api";
import api from "@/lib/api";

export default function BranchesPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal & form states
  const [transferModal, setTransferModal] = useState(false);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const loadData = () => {
    setLoading(true);
    Promise.all([fetchBranches(), fetchOrders(), fetchProducts(), api.get("/transfers")])
      .then(([b, o, p, tRes]) => {
        setBranches(b);
        setOrders(o);
        setProducts(p);
        setTransfers(tRes.data);
      })
      .catch(() => setError("Gagal memuat data cabang."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
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

  const handleTransferSubmit = async () => {
    if (!fromBranchId || !toBranchId || !selectedProductId || !quantity) {
      showToast("Harap isi semua input transfer!", "warning");
      return;
    }
    if (fromBranchId === toBranchId) {
      showToast("Cabang asal dan tujuan tidak boleh sama!", "warning");
      return;
    }
    const qtyNum = parseInt(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast("Jumlah quantity tidak valid!", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/transfers", {
        from_branch_id: parseInt(fromBranchId),
        to_branch_id: parseInt(toBranchId),
        items: [
          {
            product_id: parseInt(selectedProductId),
            quantity: qtyNum,
          }
        ]
      });
      showToast("Transfer stok berhasil dibuat!", "success");
      setTransferModal(false);
      
      // Reset form
      setFromBranchId("");
      setToBranchId("");
      setSelectedProductId("");
      setQuantity("1");
      
      // Reload
      const [tRes, bRes] = await Promise.all([api.get("/transfers"), fetchBranches()]);
      setTransfers(tRes.data);
      setBranches(bRes);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal membuat transfer stok.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (transferId: number, newStatus: string) => {
    try {
      await api.put(`/transfers/${transferId}/status`, { status: newStatus });
      showToast(`Status transfer berhasil diubah ke ${newStatus}!`, "success");
      // Reload
      const [tRes, bRes] = await Promise.all([api.get("/transfers"), fetchBranches()]);
      setTransfers(tRes.data);
      setBranches(bRes);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal mengubah status transfer.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Cabang</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Pantau performa tiap cabang dan transfer stok</p>
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

      {/* Riwayat Transfer Stok */}
      <div className="mt-8 animate-fade-in-up">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Riwayat Transfer Stok</h2>
        <Card className="overflow-hidden p-0 border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  <th className="p-4">ID</th>
                  <th className="p-4">Cabang Asal</th>
                  <th className="p-4">Cabang Tujuan</th>
                  <th className="p-4">Produk & Jumlah</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-primary)]">
                {transfers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[var(--text-secondary)]">Belum ada riwayat transfer stok.</td>
                  </tr>
                )}
                {transfers.map((t: any) => {
                  const item = t.items?.[0];
                  const prodName = item?.product?.name || `Produk ID #${item?.product_id}`;
                  const qty = item?.quantity || 0;
                  
                  return (
                    <tr key={t.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                      <td className="p-4 font-mono text-xs text-[var(--text-secondary)]">TRF-{t.id}</td>
                      <td className="p-4 font-medium">{t.from_branch?.name}</td>
                      <td className="p-4 font-medium">{t.to_branch?.name}</td>
                      <td className="p-4">
                        <span className="font-semibold">{prodName}</span>
                        <Badge variant="info" className="ml-2">{qty} Pcs</Badge>
                      </td>
                      <td className="p-4">
                        <Badge variant={t.status === "received" ? "success" : t.status === "in-transit" ? "warning" : "default"}>
                          {t.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        {t.status === "draft" && (
                          <Button size="sm" variant="outline" className="text-xs h-7 py-0 px-2.5" onClick={() => handleStatusUpdate(t.id, "in-transit")}>Kirim</Button>
                        )}
                        {t.status === "in-transit" && (
                          <Button size="sm" variant="primary" className="text-xs h-7 py-0 px-2.5 bg-emerald-600 hover:bg-emerald-700 border-none" onClick={() => handleStatusUpdate(t.id, "received")}>Terima</Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="Transfer Stok Baru" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Cabang Asal</label>
              <select
                value={fromBranchId}
                onChange={(e) => setFromBranchId(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Pilih Cabang</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Cabang Tujuan</label>
              <select
                value={toBranchId}
                onChange={(e) => setToBranchId(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Pilih Cabang</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Pilih Produk</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            >
              <option value="">Pilih Produk</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku || "-"})</option>
              ))}
            </select>
          </div>

          <Input
            label="Jumlah (Quantity)"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Masukkan jumlah item..."
          />

          <p className="text-xs text-[var(--text-tertiary)] italic">Transfer baru dibuat sebagai draft. Gunakan tombol Kirim lalu Terima pada riwayat transfer untuk memutasi stok.</p>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" onClick={() => setTransferModal(false)}>Batal</Button>
            <Button variant="primary" onClick={handleTransferSubmit} loading={submitting}>Buat Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
