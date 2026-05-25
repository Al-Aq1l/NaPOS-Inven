"use client";

import { useEffect, useMemo, useState } from "react";
import { Info, PackagePlus, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Toast } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { fetchBranches, fetchProducts, type ApiBranch, type ApiProduct } from "@/lib/dashboard-api";
import api from "@/lib/api";

interface StockInItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

export default function StockInPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [branchId, setBranchId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [updateCostPrice, setUpdateCostPrice] = useState(false);
  const [items, setItems] = useState<StockInItem[]>([{ productId: "", quantity: "1", unitCost: "" }]);
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

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [branchData, productData] = await Promise.all([fetchBranches(), fetchProducts()]);
        if (!mounted) return;
        setBranches(branchData);
        setProducts(productData);
        setBranchId(String(branchData[0]?.id ?? ""));
      } catch {
        showToast("Gagal memuat data stok masuk.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const totalCost = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => String(p.id) === item.productId);
      const quantity = Number(item.quantity) || 0;
      const unitCost = Number(item.unitCost) || Number(product?.cost_price ?? 0);
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
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menyimpan stok masuk.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

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

      {loading ? (
        <Card className="text-sm text-[var(--text-secondary)]">Memuat data stok masuk...</Card>
      ) : (
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
            <Button className="w-full" onClick={submit} loading={submitting}>Simpan Stok Masuk</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
