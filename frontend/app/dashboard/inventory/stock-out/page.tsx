"use client";
import { useEffect, useMemo, useState } from "react";
import { Info, PackageMinus, Plus, Trash2, Eye, Search, Calendar } from "lucide-react";
import { Button, Card, Input, Toast, Modal, DataTable, Badge } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { fetchBranches, fetchProducts, fetchStockOpnames, type ApiBranch, type ApiProduct, type ApiStockOpname } from "@/lib/dashboard-api";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

interface StockOutItem {
  productId: string;
  quantity: string;
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
      <p className="text-xs font-medium text-[var(--text-tertiary)] text-center sm:text-left">
        Menampilkan {Math.min(PAGE_SIZE, totalItems - (page - 1) * PAGE_SIZE)} dari {totalItems} riwayat
      </p>
      <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex-1 sm:flex-none h-8 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--surface-raised)] cursor-pointer"
        >
          Sebelumnya
        </button>
        <span className="text-xs font-semibold text-[var(--text-secondary)] px-2 shrink-0">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex-1 sm:flex-none h-8 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--surface-raised)] cursor-pointer"
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

function getProductStock(product: ApiProduct | undefined, branchId: string) {
  if (!product || !branchId) return 0;
  const branch = product.branches?.find((item) => String(item.id) === branchId);
  return branch?.pivot?.stock ?? 0;
}

function parseStockOutNotes(notes: string | null) {
  if (!notes) return { reason: "-", detail: "-" };
  if (!notes.startsWith("Stok keluar - ")) return { reason: "Lainnya", detail: notes };
  const content = notes.substring("Stok keluar - ".length);
  const splitIndex = content.indexOf(": ");
  if (splitIndex === -1) {
    return { reason: content, detail: "-" };
  }
  return {
    reason: content.substring(0, splitIndex),
    detail: content.substring(splitIndex + 2),
  };
}

export default function StockOutPage() {
  const [view, setView] = useState<"list" | "form">("list");
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [opnames, setOpnames] = useState<ApiStockOpname[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [branchId, setBranchId] = useState("");
  const [reason, setReason] = useState("Barang rusak");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<StockOutItem[]>([{ productId: "", quantity: "1" }]);
  const [submitting, setSubmitting] = useState(false);

  // List states
  const [search, setSearch] = useState("");
  const [filterBranchId, setFilterBranchId] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [selectedOpname, setSelectedOpname] = useState<ApiStockOpname | null>(null);

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
      const [branchData, productData, opnameData] = await Promise.all([
        fetchBranches(),
        fetchProducts(),
        fetchStockOpnames(),
      ]);
      setBranches(branchData);
      setProducts(productData);
      
      // Filter khusus penyesuaian yang dideskripsikan sebagai Stok Keluar
      const stockOuts = opnameData.filter((op) => (op.notes || "").startsWith("Stok keluar"));
      setOpnames(stockOuts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      
      if (branchData.length > 0 && !branchId) {
        setBranchId(String(branchData[0].id));
      }
    } catch {
      showToast("Gagal memuat data stok keluar.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Stock Outs
  const filteredOpnames = useMemo(() => {
    const query = search.trim().toLowerCase();
    return opnames.filter((op) => {
      const branchMatches = filterBranchId === "all" || String(op.branch_id) === filterBranchId;
      const parsed = parseStockOutNotes(op.notes);
      const searchMatches = !query ||
        parsed.reason.toLowerCase().includes(query) ||
        parsed.detail.toLowerCase().includes(query) ||
        `OPN-${op.id}`.toLowerCase().includes(query);
      return branchMatches && searchMatches;
    });
  }, [opnames, search, filterBranchId]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredOpnames.length / PAGE_SIZE));
  const effectiveHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedOpnames = filteredOpnames.slice(
    (effectiveHistoryPage - 1) * PAGE_SIZE,
    effectiveHistoryPage * PAGE_SIZE
  );

  // Form total quantity estimation
  const totalQty = useMemo(() => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), [items]);

  const updateItem = (index: number, patch: Partial<StockOutItem>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const addItem = () => setItems((current) => [...current, { productId: "", quantity: "1" }]);
  const removeItem = (index: number) => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  const submit = async () => {
    if (!branchId) {
      showToast("Pilih cabang terlebih dahulu.", "warning");
      return;
    }

    const payloadItems = items
      .map((item) => {
        const product = products.find((productItem) => String(productItem.id) === item.productId);
        const currentStock = getProductStock(product, branchId);
        const quantity = Number(item.quantity) || 0;
        return {
          product_id: Number(item.productId),
          physical_stock: Math.max(0, currentStock - quantity),
          currentStock,
          quantity,
        };
      })
      .filter((item) => item.product_id && item.quantity > 0);

    if (payloadItems.length === 0) {
      showToast("Pilih minimal satu produk.", "warning");
      return;
    }

    const overQty = payloadItems.find((item) => item.quantity > item.currentStock);
    if (overQty) {
      showToast("Jumlah stok keluar tidak boleh melebihi stok tersedia.", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/stock-opname", {
        branch_id: Number(branchId),
        notes: `Stok keluar - ${reason}${notes ? `: ${notes}` : ""}`,
        items: payloadItems.map(({ product_id, physical_stock }) => ({ product_id, physical_stock })),
      });
      setItems([{ productId: "", quantity: "1" }]);
      setNotes("");
      showToast("Stok keluar berhasil disimpan dan stok produk berkurang.", "success");
      await loadData();
      setView("list");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menyimpan stok keluar.", "error");
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
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stok Keluar</h1>
            <span
              title="Catat barang keluar selain transaksi POS, seperti barang rusak, hilang, retur supplier, atau pemakaian internal. Stok produk akan berkurang di cabang yang dipilih."
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Pengurangan stok non-penjualan yang langsung menyesuaikan stok produk.</p>
        </div>
        {view === "list" && (
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setView("form")}>
            Catat Stok Keluar
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
              placeholder="Cari Alasan, Catatan..."
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

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  <th className="py-3 pr-4">ID Transaksi</th>
                  <th className="py-3 pr-4 hidden sm:table-cell">Tanggal</th>
                  <th className="py-3 pr-4 hidden sm:table-cell">Cabang</th>
                  <th className="py-3 pr-4">Alasan</th>
                  <th className="py-3 pr-4 hidden md:table-cell">Detail Catatan</th>
                  <th className="py-3 pr-4 text-center">Unit Keluar</th>
                  <th className="py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredOpnames.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[var(--text-secondary)]">Tidak ada riwayat stok keluar.</td>
                  </tr>
                )}
                {paginatedOpnames.map((opname) => {
                  const parsed = parseStockOutNotes(opname.notes);
                  const totalQtyOut = (opname.items || []).reduce((sum, item) => sum + Math.abs(item.variance), 0);
                  return (
                    <tr key={opname.id} className="hover:bg-[var(--surface-raised)] transition-colors">
                      <td className="py-3 pr-4 font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {`OPN-${opname.id.toString().padStart(5, '0')}`}
                      </td>
                      <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] whitespace-nowrap hidden sm:table-cell">{formatDateTime(opname.created_at)}</td>
                      <td className="py-3 pr-4 text-[var(--text-secondary)] hidden sm:table-cell">{opname.branch?.name || `Cabang #${opname.branch_id}`}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="danger">{parsed.reason}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] max-w-xs truncate hidden md:table-cell">{parsed.detail}</td>
                      <td className="py-3 pr-4 text-center font-semibold text-[var(--text-primary)]">{totalQtyOut} unit</td>
                      <td className="py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedOpname(opname)}
                          className="p-2 text-[var(--text-tertiary)] hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-[var(--border)]">
            {filteredOpnames.length === 0 ? (
              <div className="py-8 text-center text-sm text-[var(--text-secondary)]">
                Tidak ada riwayat stok keluar.
              </div>
            ) : (
              paginatedOpnames.map((opname) => {
                const parsed = parseStockOutNotes(opname.notes);
                const totalQtyOut = (opname.items || []).reduce((sum, item) => sum + Math.abs(item.variance), 0);
                return (
                  <div
                    key={opname.id}
                    onClick={() => setSelectedOpname(opname)}
                    className="py-4 flex flex-col gap-2 cursor-pointer active:bg-[var(--surface-raised)] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-black text-[var(--brand-600)]">
                        {`OPN-${opname.id.toString().padStart(5, '0')}`}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)]">{formatDateTime(opname.created_at)}</span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      <p><span className="text-[var(--text-tertiary)]">Cabang:</span> {opname.branch?.name || `Cabang #${opname.branch_id}`}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[var(--text-tertiary)]">Alasan:</span>
                        <Badge variant="danger" size="sm">{parsed.reason}</Badge>
                      </div>
                      {parsed.detail && parsed.detail !== "-" && (
                        <p className="truncate"><span className="text-[var(--text-tertiary)]">Catatan:</span> {parsed.detail}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-dashed border-[var(--border)] pt-2 mt-1">
                      <span className="text-xs text-[var(--text-tertiary)]">Kuantitas Keluar:</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-rose-600">{totalQtyOut} unit</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOpname(opname);
                          }}
                          className="p-1 text-[var(--brand-600)] hover:bg-[var(--brand-50)] rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <PaginationControls
            page={effectiveHistoryPage}
            totalPages={historyTotalPages}
            totalItems={filteredOpnames.length}
            onPageChange={(nextPage) => setHistoryPage(Math.min(Math.max(1, nextPage), historyTotalPages))}
          />
        </Card>
      ) : (
        /* ================= INPUT FORM VIEW ================= */
        <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          <Card className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Cabang</span>
                <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[var(--text-primary)]">Alasan</span>
                <select value={reason} onChange={(event) => setReason(event.target.value)} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
                  <option>Barang rusak</option>
                  <option>Barang hilang</option>
                  <option>Retur supplier</option>
                  <option>Pemakaian internal</option>
                  <option>Lainnya</option>
                </select>
              </label>
              <div className="md:col-span-2">
                <Input label="Catatan" placeholder="Detail tambahan..." value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Produk Keluar</h2>
                <Button variant="outline" size="sm" onClick={addItem} icon={<Plus className="h-4 w-4" />}>Tambah Baris</Button>
              </div>

              {items.map((item, index) => {
                const product = products.find((productItem) => String(productItem.id) === item.productId);
                const currentStock = getProductStock(product, branchId);
                return (
                  <div key={index} className="grid gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3 md:grid-cols-[1fr_8rem_8rem_auto]">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Produk</span>
                      <select value={item.productId} onChange={(event) => updateItem(index, { productId: event.target.value })} className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
                        <option value="">Pilih produk</option>
                        {products.map((productItem) => <option key={productItem.id} value={productItem.id}>{productItem.name}</option>)}
                      </select>
                    </label>
                    <Input label="Qty Keluar" type="number" min="1" value={item.quantity} onChange={(event) => updateItem(index, { quantity: event.target.value })} />
                    <div>
                      <p className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Stok Saat Ini</p>
                      <div className="flex h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-secondary)]">{currentStock}</div>
                    </div>
                    <button type="button" onClick={() => removeItem(index)} disabled={items.length === 1} className="mt-6 inline-flex h-10 items-center justify-center rounded-lg px-3 text-[var(--danger-500)] hover:bg-[var(--danger-50)] disabled:opacity-40">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="h-fit space-y-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-100">
              <PackageMinus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-[var(--text-secondary)]">Total stok keluar</p>
              <p className="mt-1 text-2xl font-bold text-[var(--text-primary)]">{totalQty} unit</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button className="w-full" onClick={submit} loading={submitting}>Simpan Stok Keluar</Button>
              <Button variant="outline" className="w-full" onClick={() => setView("list")}>Batal</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ================= DETAIL TRANSAKSI MODAL ================= */}
      <Modal
        open={!!selectedOpname}
        onClose={() => setSelectedOpname(null)}
        title={selectedOpname ? `Detail Stok Keluar: OPN-${selectedOpname.id.toString().padStart(5, '0')}` : "Detail Stok Keluar"}
        size="lg"
      >
        {selectedOpname && (
          <div className="space-y-6">
            {(() => {
              const parsed = parseStockOutNotes(selectedOpname.notes);
              return (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-6 border-b border-[var(--border)]">
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">Tanggal Waktu</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{formatDateTime(selectedOpname.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">Cabang Asal</p>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedOpname.branch?.name || `Cabang #${selectedOpname.branch_id}`}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">Alasan Keluar</p>
                      <div className="mt-0.5"><Badge variant="danger">{parsed.reason}</Badge></div>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--text-tertiary)] mb-1">ID Transaksi</p>
                      <p className="text-sm font-semibold font-mono text-[var(--text-primary)]">{`OPN-${selectedOpname.id.toString().padStart(5, '0')}`}</p>
                    </div>
                  </div>

                  {parsed.detail && parsed.detail !== "-" && (
                    <div className="rounded-lg bg-[var(--surface-raised)] p-3 border border-[var(--border)] text-xs text-[var(--text-secondary)]">
                      <span className="font-bold block mb-1">Catatan Tambahan:</span>
                      {parsed.detail}
                    </div>
                  )}
                </>
              );
            })()}

            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Item Produk Keluar</h4>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)] bg-[var(--surface)] text-sm">
                {/* Header (desktop only) */}
                <div className="hidden sm:grid sm:grid-cols-[3fr_1fr_1.5fr_1.5fr] gap-4 bg-[var(--surface-raised)] px-4 py-2.5 text-xs text-[var(--text-secondary)] font-semibold uppercase tracking-wider">
                  <div>Produk</div>
                  <div className="text-center">Stok Sistem</div>
                  <div className="text-center">Stok Aktual</div>
                  <div className="text-right">Qty Keluar</div>
                </div>

                {/* Items */}
                {(selectedOpname.items || []).map((item) => {
                  const qtyOut = Math.abs(item.variance);
                  return (
                    <div
                      key={item.id}
                      className="p-4 sm:px-4 sm:py-3 grid grid-cols-1 sm:grid-cols-[3fr_1fr_1.5fr_1.5fr] gap-2 sm:gap-4 items-start sm:items-center text-sm hover:bg-[var(--surface-raised)]/30 transition-colors"
                    >
                      {/* Column 1: Product info */}
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{item.product?.name || `Produk #${item.product_id}`}</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-0.5 font-mono">{item.product?.sku || "Tanpa SKU"}</p>
                      </div>

                      {/* Column 2: System stock (desktop only) */}
                      <div className="hidden sm:block text-center font-medium text-[var(--text-secondary)]">
                        {item.system_stock}
                      </div>

                      {/* Column 3: Physical stock (desktop only) */}
                      <div className="hidden sm:block text-center font-medium text-[var(--text-secondary)]">
                        {item.physical_stock}
                      </div>

                      {/* Column 4: Qty Out */}
                      <div className="flex justify-between items-center sm:block sm:text-right font-semibold text-rose-600">
                        <span className="text-[10px] uppercase font-bold text-[var(--text-tertiary)] sm:hidden">Qty Keluar:</span>
                        <span>
                          {qtyOut} unit
                          <span className="sm:hidden font-normal text-[10px] text-[var(--text-tertiary)] block">
                            Sistem: {item.system_stock} · Aktual: {item.physical_stock}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Footer / Total */}
                <div className="bg-[var(--surface-raised)] px-4 py-3 flex justify-between items-center font-bold text-[var(--text-primary)] text-sm border-t border-[var(--border)]">
                  <span>Total Kuantitas Keluar:</span>
                  <span className="text-base text-rose-600 font-extrabold">
                    {(selectedOpname.items || []).reduce((sum, item) => sum + Math.abs(item.variance), 0)} unit
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedOpname(null)}
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
