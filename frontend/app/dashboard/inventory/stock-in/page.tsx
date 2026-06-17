"use client";
import { useEffect, useMemo, useState } from "react";
import { Info, PackagePlus, Plus, Trash2, Eye, Search, Calendar } from "lucide-react";
import { Button, Card, Input, Toast, Modal, DataTable, Badge } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { fetchBranches, fetchProducts, fetchStockReceipts, type ApiBranch, type ApiProduct, type ApiStockReceipt } from "@/lib/dashboard-api";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface StockInItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= PAGE_SIZE) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-[var(--text-tertiary)]">
        Menampilkan {Math.min(PAGE_SIZE, totalItems - (page - 1) * PAGE_SIZE)} dari {totalItems} riwayat
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--surface-raised)]"
        >
          Sebelumnya
        </button>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--surface-raised)]"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StockInPage() {
  const [view, setView] = useState<"list" | "form">("list");
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [receipts, setReceipts] = useState<ApiStockReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [branchId, setBranchId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [updateCostPrice, setUpdateCostPrice] = useState(false);
  const [items, setItems] = useState<StockInItem[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [submitting, setSubmitting] = useState(false);

  // List states
  const [search, setSearch] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedReceipt, setSelectedReceipt] = useState<ApiStockReceipt | null>(null);

  // Toast state
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchData, productData, receiptData] = await Promise.all([
        fetchBranches(),
        fetchProducts(),
        fetchStockReceipts(),
      ]);
      setBranches(branchData);
      setProducts(productData);
      setReceipts(receiptData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      if (branchData.length > 0 && !branchId) {
        setBranchId(String(branchData[0].id));
      }
    } catch {
      showToast("Gagal memuat data stok masuk.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return receipts.filter((rcv) => {
      const branchMatches = filterBranchId === "all" || String(rcv.branch_id) === filterBranchId;
      const searchMatches = !query ||
        (rcv.reference_number || "").toLowerCase().includes(query) ||
        (rcv.supplier_name || "").toLowerCase().includes(query) ||
        `RCV-${rcv.id}`.toLowerCase().includes(query);
      return branchMatches && searchMatches;
    });
  }, [receipts, search, filterBranchId]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredReceipts.length / PAGE_SIZE));
  const effectiveHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedReceipts = filteredReceipts.slice(
    (effectiveHistoryPage - 1) * PAGE_SIZE,
    effectiveHistoryPage * PAGE_SIZE
  );

  // Form total cost estimation
  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => String(p.id) === item.productId);
      const quantity = Number(item.quantity) || 0;
      const unitCost = item.unitCost ? Number(item.unitCost) : Number(product?.cost_price ?? 0);
      return sum + quantity * unitCost;
    }, 0);
  }, [items, products]);

  const updateItem = (index: number, patch: Partial<StockInItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const addItem = () => setItems((current) => [...current, { productId: "", quantity: "1", unitCost: "" }]);
  const removeItem = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const resetForm = () => {
    setSupplierName("");
    setReferenceNumber("");
    setNotes("");
    setUpdateCostPrice(false);
    setItems([{ productId: "", quantity: "1", unitCost: "" }]);
  };

  const submit = async () => {
    const payloadItems = items
      .map((item) => ({
        product_id: Number(item.productId),
        quantity: Number(item.quantity),
        unit_cost: item.unitCost ? Number(item.unitCost) : undefined,
      }))
      .filter((item) => item.product_id && item.quantity > 0);

    if (!branchId || payloadItems.length === 0) {
      showToast("Pilih cabang dan minimal satu produk.", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/stock-receipts", {
        branch_id: Number(branchId),
        supplier_name: supplierName || null,
        reference_number: referenceNumber || null,
        notes: notes || null,
        update_cost_price: updateCostPrice,
        items: payloadItems,
      });
      resetForm();
      showToast("Stok masuk berhasil disimpan dan stok produk bertambah.", "success");
      await loadData();
      setView("list");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menyimpan stok masuk.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stok Masuk</h1>
            <span
              title="Catat barang yang masuk dari supplier atau restock toko. Stok produk akan bertambah di cabang yang dipilih."
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Penerimaan barang untuk menambah stok produk per cabang.</p>
        </div>
        {view === "list" && (
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setView("form")}>
            Tambah Stok Masuk
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="text-sm text-[var(--text-secondary)]">Memuat data...</Card>
      ) : view === "list" ? (
        /* ================= LIST RIWAYAT VIEW ================= */
        <Card className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_12rem]">
            <Input
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Cari Ref, Supplier..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setHistoryPage(1);
              }}
            />
            <select
              value={filterBranchId}
              onChange={(event) => {
                setFilterBranchId(event.target.value);
                setHistoryPage(1);
              }}
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
            >
              <option value="all">Semua Cabang</option>
              {branches.map((branch) => <option key={branch.id} value={String(branch.id)}>{branch.name}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 pr-4">ID Penerimaan</th>
                  <th className="py-3 pr-4">Tanggal</th>
                  <th className="py-3 pr-4">Cabang</th>
                  <th className="py-3 pr-4">Supplier</th>
                  <th className="py-3 pr-4 text-center">Item</th>
                  <th className="py-3 pr-4 text-right">Nilai Masuk</th>
                  <th className="py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredReceipts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">Tidak ada riwayat penerimaan stok.</td>
                  </tr>
                )}
                {paginatedReceipts.map((receipt) => (
                  <tr key={receipt.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-[var(--text-primary)]">
                      {receipt.reference_number || `RCV-${receipt.id.toString().padStart(5, '0')}`}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(receipt.created_at)}</td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">{receipt.branch?.name || `Cabang #${receipt.branch_id}`}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">{receipt.supplier_name || "-"}</td>
                    <td className="py-3 pr-4 text-center text-[var(--text-secondary)]">{(receipt.items || []).length} SKU</td>
                    <td className="py-3 pr-4 text-right font-semibold text-[var(--text-primary)]">{formatIDR(parseFloat(receipt.total_cost))}</td>
                    <td className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedReceipt(receipt)}
                        className="p-2 text-[var(--text-tertiary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors inline-flex items-center justify-center"
                        title="Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={effectiveHistoryPage}
            totalPages={historyTotalPages}
            totalItems={filteredReceipts.length}
            onPageChange={(nextPage) => setHistoryPage(Math.min(Math.max(1, nextPage), historyTotalPages))}
          />
        </Card>
      ) : (
        /* ================= INPUT FORM VIEW ================= */
        <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          <Card className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Cabang Tujuan</span>
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <Input label="Supplier" placeholder="Nama supplier..." value={supplierName} onChange={(event) => setSupplierName(event.target.value)} />
              <Input label="Nomor Referensi" placeholder="Invoice / PO..." value={referenceNumber} onChange={(event) => setReferenceNumber(event.target.value)} />
              <Input label="Catatan" placeholder="Opsional..." value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Produk Diterima</h2>
                <Button variant="outline" size="sm" onClick={addItem} icon={<Plus className="h-4 w-4" />}>Tambah Baris</Button>
              </div>

              {items.map((item, index) => {
                const product = products.find((p) => String(p.id) === item.productId);
                return (
                  <div key={index} className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 md:grid-cols-[1fr_7rem_9rem_auto]">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Produk</span>
                      <select value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
                        <option value="">Pilih produk</option>
                        {products.map((productItem) => <option key={productItem.id} value={productItem.id}>{productItem.name}</option>)}
                      </select>
                    </label>
                    <Input label="Qty" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
                    <Input label="HPP" type="number" min="0" placeholder={product ? String(product.cost_price) : "0"} value={item.unitCost} onChange={(event) => updateItem(index, { unitCost: event.target.value })} />
                    <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="mt-6 inline-flex h-10 items-center justify-center rounded-lg px-3 text-[var(--danger-500)] hover:bg-[var(--danger-50)] disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <input type="checkbox" checked={updateCostPrice} onChange={(event) => setUpdateCostPrice(event.target.checked)} />
              Perbarui HPP produk dari input stok masuk
            </label>
          </Card>

          <Card className="h-fit space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-100">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total estimasi nilai masuk</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{formatIDR(totalCost)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={submit} loading={submitting}>Simpan Stok Masuk</Button>
              <Button variant="outline" className="w-full" onClick={() => setView("list")}>Batal</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ================= DETAIL TRANSAKSI MODAL ================= */}
      <Modal
        open={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title={selectedReceipt ? `Detail Stok Masuk: ${selectedReceipt.reference_number || `RCV-${selectedReceipt.id.toString().padStart(5, '0')}`}` : "Detail Stok Masuk"}
        size="lg"
      >
        {selectedReceipt && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-6 border-b border-[var(--border)]">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Tanggal Waktu</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{formatDateTime(selectedReceipt.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Cabang Penerima</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedReceipt.branch?.name || `Cabang #${selectedReceipt.branch_id}`}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Supplier</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedReceipt.supplier_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Nomor Referensi</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedReceipt.reference_number || "-"}</p>
              </div>
            </div>

            {selectedReceipt.notes && (
              <div className="rounded-lg bg-[var(--surface-raised)] p-3 border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                <span className="font-bold block mb-1">Catatan:</span>
                {selectedReceipt.notes}
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Item Produk</h4>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)] bg-[var(--surface)] text-sm">
                {/* Header (desktop only) */}
                <div className="hidden sm:grid sm:grid-cols-[3fr_1fr_1.5fr_1.5fr] gap-4 bg-[var(--surface-raised)] px-4 py-2.5 text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                  <div>Produk</div>
                  <div className="text-center">Qty</div>
                  <div className="text-right">Harga Beli (HPP)</div>
                  <div className="text-right">Subtotal</div>
                </div>

                {/* Items */}
                {(selectedReceipt.items || []).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 sm:px-4 sm:py-3 grid grid-cols-1 sm:grid-cols-[3fr_1fr_1.5fr_1.5fr] gap-2 sm:gap-4 items-start sm:items-center text-sm hover:bg-[var(--surface-raised)]/30 transition-colors"
                  >
                    {/* Column 1: Product info */}
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{item.product?.name || `Produk #${item.product_id}`}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-0.5 font-mono">{item.product?.sku || "Tanpa SKU"}</p>
                    </div>

                    {/* Column 2: Qty (desktop only) */}
                    <div className="hidden sm:block text-center font-semibold text-[var(--text-primary)]">
                      {item.quantity}
                    </div>

                    {/* Column 3: HPP (responsive grid on mobile, right aligned text on desktop) */}
                    <div className="flex justify-between items-center sm:block sm:text-right text-[var(--text-secondary)]">
                      <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] sm:hidden">HPP:</span>
                      <span>
                        {formatIDR(parseFloat(item.unit_cost))}
                        <span className="sm:hidden font-normal text-[10px] text-[var(--text-tertiary)] block">
                          Qty: {item.quantity}
                        </span>
                      </span>
                    </div>

                    {/* Column 4: Subtotal (responsive grid on mobile, right aligned text on desktop) */}
                    <div className="flex justify-between items-center sm:block sm:text-right">
                      <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] sm:hidden">Subtotal:</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatIDR(parseFloat(item.subtotal))}</span>
                    </div>
                  </div>
                ))}

                {/* Footer / Total */}
                <div className="bg-[var(--surface-raised)] px-4 py-3 flex justify-between items-center font-bold text-[var(--text-primary)] text-sm border-t border-[var(--border)]">
                  <span>Total Nilai Masuk:</span>
                  <span className="text-base text-emerald-600 font-extrabold">{formatIDR(parseFloat(selectedReceipt.total_cost))}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 bg-[var(--surface-raised)] hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-primary)] font-medium rounded-lg transition-colors text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
