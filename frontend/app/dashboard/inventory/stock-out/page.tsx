"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, PackageMinus, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Toast } from "@/components/ui";
import { fetchBranches, fetchProducts, type ApiBranch, type ApiProduct } from "@/lib/dashboard-api";
import api from "@/lib/api";

interface StockOutItem {
  productId: string;
  quantity: string;
}

function getProductStock(product: ApiProduct | undefined, branchId: string) {
  if (!product || !branchId) return 0;
  const branch = product.branches?.find((item) => String(item.id) === branchId);
  return branch?.pivot?.stock ?? 0;
}

export default function StockOutPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [branchId, setBranchId] = useState("");
  const [reason, setReason] = useState("Barang rusak");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<StockOutItem[]>([{ productId: "", quantity: "1" }]);
  const [loading, setLoading] = useState(true);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [branchData, productData] = await Promise.all([fetchBranches(), fetchProducts()]);
      setBranches(branchData);
      setProducts(productData);
      setBranchId((current) => current || String(branchData[0]?.id ?? ""));
    } catch {
      showToast("Gagal memuat data stok keluar.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menyimpan stok keluar.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

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

      {loading ? (
        <Card className="text-sm text-[var(--text-secondary)]">Memuat data stok keluar...</Card>
      ) : (
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
            <Button className="w-full" onClick={submit} loading={submitting}>Simpan Stok Keluar</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
