"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Info } from "lucide-react";
import { Badge, Button, Card, Input, Modal, Toast } from "@/components/ui";
import { fetchBranches, fetchProducts, type ApiBranch, type ApiProduct } from "@/lib/dashboard-api";
import api from "@/lib/api";

export default function StockTransfersPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transferModal, setTransferModal] = useState(false);
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [submitting, setSubmitting] = useState(false);
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
    Promise.all([fetchBranches(), fetchProducts(), api.get("/transfers")])
      .then(([branchData, productData, transferRes]) => {
        setBranches(branchData);
        setProducts(productData);
        setTransfers(transferRes.data);
      })
      .catch(() => setError("Gagal memuat data transfer stok."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTransferSubmit = async () => {
    if (!fromBranchId || !toBranchId || !selectedProductId || !quantity) {
      showToast("Harap isi semua input transfer.", "warning");
      return;
    }
    if (fromBranchId === toBranchId) {
      showToast("Cabang asal dan tujuan tidak boleh sama.", "warning");
      return;
    }
    const qtyNum = parseInt(quantity);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      showToast("Jumlah quantity tidak valid.", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/transfers", {
        from_branch_id: parseInt(fromBranchId),
        to_branch_id: parseInt(toBranchId),
        items: [{ product_id: parseInt(selectedProductId), quantity: qtyNum }],
      });
      showToast("Transfer stok berhasil dibuat.", "success");
      setTransferModal(false);
      setFromBranchId("");
      setToBranchId("");
      setSelectedProductId("");
      setQuantity("1");
      const transferRes = await api.get("/transfers");
      setTransfers(transferRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal membuat transfer stok.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (transferId: number, newStatus: string) => {
    try {
      await api.put(`/transfers/${transferId}/status`, { status: newStatus });
      showToast(`Status transfer berhasil diubah ke ${newStatus}.`, "success");
      const transferRes = await api.get("/transfers");
      setTransfers(transferRes.data);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal mengubah status transfer.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transfer Stok</h1>
            <span
              title="Pindahkan stok antar cabang. Transfer dibuat sebagai draft, lalu dikirim dan diterima untuk memutasi stok."
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Kelola perpindahan barang antar cabang.</p>
        </div>
        <Button size="sm" icon={<ArrowRightLeft className="w-4 h-4" />} onClick={() => setTransferModal(true)}>
          Transfer Baru
        </Button>
      </div>

      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data transfer stok...</Card>}

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
              {transfers.map((transfer: any) => {
                const item = transfer.items?.[0];
                const productName = item?.product?.name || `Produk ID #${item?.product_id}`;
                const qty = item?.quantity || 0;

                return (
                  <tr key={transfer.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                    <td className="p-4 font-mono text-xs text-[var(--text-secondary)]">TRF-{transfer.id}</td>
                    <td className="p-4 font-medium">{transfer.from_branch?.name}</td>
                    <td className="p-4 font-medium">{transfer.to_branch?.name}</td>
                    <td className="p-4">
                      <span className="font-semibold">{productName}</span>
                      <Badge variant="info" className="ml-2">{qty} Pcs</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={transfer.status === "received" ? "success" : transfer.status === "in-transit" ? "warning" : "default"}>
                        {transfer.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {transfer.status === "draft" && (
                        <Button size="sm" variant="outline" className="text-xs h-7 py-0 px-2.5" onClick={() => handleStatusUpdate(transfer.id, "in-transit")}>Kirim</Button>
                      )}
                      {transfer.status === "in-transit" && (
                        <Button size="sm" className="text-xs h-7 py-0 px-2.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleStatusUpdate(transfer.id, "received")}>Terima</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="Transfer Stok Baru" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Cabang Asal</span>
              <select value={fromBranchId} onChange={(event) => setFromBranchId(event.target.value)} className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]">
                <option value="">Pilih Cabang</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Cabang Tujuan</span>
              <select value={toBranchId} onChange={(event) => setToBranchId(event.target.value)} className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]">
                <option value="">Pilih Cabang</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Pilih Produk</span>
            <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]">
              <option value="">Pilih Produk</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name} (SKU: {product.sku || "-"})</option>)}
            </select>
          </label>

          <Input label="Jumlah" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="Masukkan jumlah item..." />
          <p className="text-xs text-[var(--text-tertiary)]">Transfer baru dibuat sebagai draft. Gunakan tombol Kirim lalu Terima pada riwayat transfer untuk memutasi stok.</p>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" onClick={() => setTransferModal(false)}>Batal</Button>
            <Button onClick={handleTransferSubmit} loading={submitting}>Buat Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
