"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CheckCircle2, ChevronDown, Info, Send } from "lucide-react";
import { Badge, Button, Card, Input, Modal, Toast } from "@/components/ui";
import { fetchBranches, fetchProducts, type ApiBranch, type ApiProduct } from "@/lib/dashboard-api";
import api from "@/lib/api";

interface StockTransferItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: ApiProduct;
}

interface StockTransfer {
  id: number;
  from_branch?: ApiBranch;
  to_branch?: ApiBranch;
  status: "draft" | "in-transit" | "received";
  items?: StockTransferItem[];
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  }

  return fallback;
}

function getProductStock(product: ApiProduct | undefined, branchId: string) {
  if (!product || !branchId) return 0;
  const branch = product.branches?.find((item) => String(item.id) === branchId);
  return branch?.pivot?.stock ?? 0;
}

export default function StockTransfersPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
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
  const [openActionTransferId, setOpenActionTransferId] = useState<number | null>(null);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === selectedProductId),
    [products, selectedProductId],
  );
  const selectedFromStock = getProductStock(selectedProduct, fromBranchId);

  const loadData = async () => {
    setLoading(true);
    try {
      setError(null);
      const [branchData, productData, transferRes] = await Promise.all([
        fetchBranches(),
        fetchProducts(),
        api.get<StockTransfer[]>("/transfers"),
      ]);
      setBranches(branchData);
      setProducts(productData);
      setTransfers(transferRes.data);
    } catch {
      setError("Gagal memuat data transfer stok.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadInitialData() {
      try {
        setError(null);
        const [branchData, productData, transferRes] = await Promise.all([
          fetchBranches(),
          fetchProducts(),
          api.get<StockTransfer[]>("/transfers"),
        ]);
        if (!mounted) return;
        setBranches(branchData);
        setProducts(productData);
        setTransfers(transferRes.data);
      } catch {
        if (mounted) setError("Gagal memuat data transfer stok.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadInitialData();
    return () => {
      mounted = false;
    };
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
      await loadData();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, "Gagal membuat transfer stok."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (transferId: number, newStatus: string) => {
    setOpenActionTransferId(null);

    try {
      await api.put(`/transfers/${transferId}/status`, { status: newStatus });
      showToast(`Status transfer berhasil diubah ke ${newStatus}.`, "success");
      await loadData();
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, "Gagal mengubah status transfer."), "error");
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
              title="Pindahkan stok antar cabang. Saat dikirim, stok cabang asal berkurang. Saat diterima, stok cabang tujuan bertambah."
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
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
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
              {transfers.map((transfer) => {
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
                    <td className="p-4 text-right">
                      <div className="relative inline-flex justify-end">
                        <button
                          type="button"
                          onClick={() => setOpenActionTransferId((current) => current === transfer.id ? null : transfer.id)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] cursor-pointer"
                          aria-expanded={openActionTransferId === transfer.id}
                          aria-label={`Aksi transfer TRF-${transfer.id}`}
                        >
                          Aksi
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {openActionTransferId === transfer.id && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-left shadow-[var(--shadow-lg)]">
                            {transfer.status === "draft" && (
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(transfer.id, "in-transit")}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                              >
                                <Send className="h-3.5 w-3.5" />
                                Kirim
                              </button>
                            )}
                            {transfer.status === "in-transit" && (
                              <button
                                type="button"
                                onClick={() => handleStatusUpdate(transfer.id, "received")}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Terima
                              </button>
                            )}
                            {transfer.status === "received" && (
                              <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                                Tidak ada aksi
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="block md:hidden divide-y divide-[var(--border)] p-4 space-y-4">
          {transfers.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Belum ada riwayat transfer stok.</div>
          ) : (
            transfers.map((transfer) => {
              const item = transfer.items?.[0];
              const productName = item?.product?.name || `Produk ID #${item?.product_id}`;
              const qty = item?.quantity || 0;
              return (
                <div key={transfer.id} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--text-secondary)] font-bold">TRF-{transfer.id}</span>
                    <Badge variant={transfer.status === "received" ? "success" : transfer.status === "in-transit" ? "warning" : "default"}>
                      {transfer.status}
                    </Badge>
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold text-[var(--text-primary)]">{productName}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--text-secondary)] bg-[var(--surface-raised)] p-2 rounded-lg border border-[var(--border)]">
                      <span className="font-medium text-[var(--text-primary)]">{transfer.from_branch?.name}</span>
                      <span className="text-[var(--text-tertiary)]">→</span>
                      <span className="font-medium text-[var(--text-primary)]">{transfer.to_branch?.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <Badge variant="info">{qty} Pcs</Badge>
                    
                    {/* Aksi Dropdown for Mobile */}
                    <div className="relative inline-flex justify-end">
                      <button
                        type="button"
                        onClick={() => setOpenActionTransferId((current) => current === transfer.id ? null : transfer.id)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] cursor-pointer"
                        aria-expanded={openActionTransferId === transfer.id}
                        aria-label={`Aksi transfer TRF-${transfer.id}`}
                      >
                        Aksi
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {openActionTransferId === transfer.id && (
                        <div className="absolute right-0 bottom-full z-20 mb-2 w-36 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] text-left shadow-[var(--shadow-lg)]">
                          {transfer.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(transfer.id, "in-transit")}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                            >
                              <Send className="h-3.5 w-3.5" />
                              Kirim
                            </button>
                          )}
                          {transfer.status === "in-transit" && (
                            <button
                              type="button"
                              onClick={() => handleStatusUpdate(transfer.id, "received")}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Terima
                            </button>
                          )}
                          {transfer.status === "received" && (
                            <div className="px-3 py-2 text-xs text-[var(--text-tertiary)]">
                              Tidak ada aksi
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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
          {fromBranchId && selectedProductId && (
            <p className="text-xs text-[var(--text-secondary)]">
              Stok tersedia di cabang asal: <span className="font-semibold text-[var(--text-primary)]">{selectedFromStock}</span>
            </p>
          )}
          <p className="text-xs text-[var(--text-tertiary)]">Transfer baru dibuat sebagai draft. Tombol Kirim akan mengurangi stok cabang asal, lalu tombol Terima akan menambah stok cabang tujuan.</p>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" onClick={() => setTransferModal(false)}>Batal</Button>
            <Button onClick={handleTransferSubmit} loading={submitting}>Buat Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
