"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Filter, Download, Upload, AlertTriangle, Package, ArrowUpDown, Barcode as BarcodeIcon, QrCode, PackagePlus, Trash2, Pencil, Info } from "lucide-react";
import Barcode from "react-barcode";
import { QRCodeSVG } from "qrcode.react";
import { Button, Input, Badge, Card, DataTable, Modal, Toast } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fetchBranches, fetchCategories, fetchProducts, type ApiBranch, type ApiCategory, type ApiProduct } from "@/lib/dashboard-api";
import api from "@/lib/api";

interface Produk {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  imageUrl: string | null;
  category: string;
  costPrice: number;
  sellPrice: number;
  stock: Record<string, number>;
  rop: number;
  unit: string;
  status: string;
}

interface ReceivingItem {
  productId: string;
  quantity: string;
  unitCost: string;
}

interface NewProductForm {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  costPrice: string;
  sellPrice: string;
  unit: string;
  rop: string;
  branchId: string;
  openingStock: string;
}

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  costPrice: string;
  sellPrice: string;
  unit: string;
  rop: string;
  status: "active" | "inactive";
}

function mapProdukFromApi(item: ApiProduct): Produk {
  const stock: Record<string, number> = {};
  for (const branch of item.branches ?? []) {
    stock[branch.name] = branch.pivot?.stock ?? 0;
  }

  return {
    id: String(item.id),
    sku: item.sku ?? `SKU-${item.id}`,
    barcode: item.barcode ?? "-",
    name: item.name,
    imageUrl: item.image_url ?? null,
    category: item.category?.name ?? "Tanpa Kategori",
    costPrice: Number(item.cost_price),
    sellPrice: Number(item.sell_price),
    stock,
    rop: item.rop,
    unit: item.unit,
    status: item.status,
  };
}

function appendProductFormData(formData: FormData, data: Record<string, string | number | null | File | undefined>) {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value instanceof File) {
      formData.append(key, value);
      return;
    }
    formData.append(key, value === null ? "" : String(value));
  });
}

export default function StokBarangPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingBarcode, setGeneratingBarcode] = useState<string | null>(null);
  const [labelProduct, setLabelProduct] = useState<Produk | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [newProductImagePreview, setNewProductImagePreview] = useState<string | null>(null);
  const [editProductModalOpen, setEditProductModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductSubmitting, setEditProductSubmitting] = useState(false);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [editProductImagePreview, setEditProductImagePreview] = useState<string | null>(null);
  const [removeEditImage, setRemoveEditImage] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Produk | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Produk | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductForm>({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    costPrice: "0",
    sellPrice: "0",
    unit: "pcs",
    rop: "0",
    status: "active",
  });
  const [newProduct, setNewProduct] = useState<NewProductForm>({
    name: "",
    sku: "",
    barcode: "",
    categoryId: "",
    costPrice: "0",
    sellPrice: "0",
    unit: "pcs",
    rop: "0",
    branchId: "",
    openingStock: "0",
  });
  const [receivingOpen, setReceivingOpen] = useState(false);
  const [receivingBranchId, setReceivingBranchId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [receivingNotes, setReceivingNotes] = useState("");
  const [updateCostPrice, setUpdateCostPrice] = useState(false);
  const [receivingItems, setReceivingItems] = useState<ReceivingItem[]>([{ productId: "", quantity: "1", unitCost: "" }]);
  const [receivingSubmitting, setReceivingSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [branchData, categoryData, productData] = await Promise.all([fetchBranches(), fetchCategories(), fetchProducts()]);
        if (!isMounted) return;

        setBranches(branchData);
        setCategories(categoryData);
        setSelectedBranch((prev) => prev || branchData[0]?.name || "");
        setReceivingBranchId((prev) => prev || String(branchData[0]?.id ?? ""));
        setNewProduct((prev) => ({ ...prev, branchId: prev.branchId || String(branchData[0]?.id ?? "") }));
        setProduk(productData.map(mapProdukFromApi));
      } catch {
        if (!isMounted) return;
        setError("Gagal memuat data stok.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const kategori = useMemo(() => ["Semua", ...new Set(produk.map((p) => p.category))], [produk]);

  const filtered = produk.filter(
    (p) =>
      (filterCategory === "Semua" || p.category === filterCategory) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search)),
  );

  const menipisStockCount = produk.filter((p) => {
    const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
    return totalStock <= p.rop;
  }).length;

  const totalNilaiStok = produk.reduce((sum, p) => {
    const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
    return sum + totalStock * p.costPrice;
  }, 0);

  const handleGenerateBarcode = async (product: Produk) => {
    const generatedCode = `NAPS-${product.id.padStart(6, "0")}`;

    try {
      setGeneratingBarcode(product.id);
      await api.put(`/products/${product.id}`, { barcode: generatedCode });
      setProduk((prev) => prev.map((item) => (
        item.id === product.id ? { ...item, barcode: generatedCode } : item
      )));
      setLabelProduct({ ...product, barcode: generatedCode });
      showToast(`Barcode ${generatedCode} berhasil disimpan.`, "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal generate barcode produk.", "error");
    } finally {
      setGeneratingBarcode(null);
    }
  };

  const loadInventoryData = async () => {
    const [branchData, categoryData, productData] = await Promise.all([fetchBranches(), fetchCategories(), fetchProducts()]);
    setBranches(branchData);
    setCategories(categoryData);
    setSelectedBranch((prev) => prev || branchData[0]?.name || "");
    setReceivingBranchId((prev) => prev || String(branchData[0]?.id ?? ""));
    setNewProduct((prev) => ({ ...prev, branchId: prev.branchId || String(branchData[0]?.id ?? "") }));
    setProduk(productData.map(mapProdukFromApi));
  };

  const updateNewProduct = (patch: Partial<NewProductForm>) => {
    setNewProduct((prev) => ({ ...prev, ...patch }));
  };

  const updateEditProduct = (patch: Partial<ProductForm>) => {
    setEditProduct((prev) => ({ ...prev, ...patch }));
  };

  const resetNewProductForm = () => {
    if (newProductImagePreview) URL.revokeObjectURL(newProductImagePreview);
    setNewProductImage(null);
    setNewProductImagePreview(null);
    setNewProduct({
      name: "",
      sku: "",
      barcode: "",
      categoryId: "",
      costPrice: "0",
      sellPrice: "0",
      unit: "pcs",
      rop: "0",
      branchId: branches[0] ? String(branches[0].id) : "",
      openingStock: "0",
    });
  };

  const handleNewProductImageChange = (file: File | null) => {
    if (newProductImagePreview) URL.revokeObjectURL(newProductImagePreview);
    setNewProductImage(file);
    setNewProductImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const handleEditProductImageChange = (file: File | null) => {
    if (editProductImagePreview?.startsWith("blob:")) URL.revokeObjectURL(editProductImagePreview);
    setEditProductImage(file);
    setRemoveEditImage(false);
    setEditProductImagePreview(file ? URL.createObjectURL(file) : editProductImagePreview);
  };

  const handleSubmitProduct = async () => {
    if (!newProduct.name.trim()) {
      showToast("Nama produk wajib diisi.", "warning");
      return;
    }

    const branchPayload = newProduct.branchId
      ? {
          [newProduct.branchId]: {
            stock: Math.max(0, Number(newProduct.openingStock) || 0),
          },
        }
      : undefined;

    try {
      setProductSubmitting(true);
      const formData = new FormData();
      appendProductFormData(formData, {
        name: newProduct.name.trim(),
        sku: newProduct.sku.trim() || null,
        barcode: newProduct.barcode.trim() || null,
        category_id: newProduct.categoryId ? Number(newProduct.categoryId) : null,
        cost_price: Number(newProduct.costPrice) || 0,
        sell_price: Number(newProduct.sellPrice) || 0,
        unit: newProduct.unit.trim() || "pcs",
        rop: Math.max(0, Number(newProduct.rop) || 0),
        status: "active",
      });
      if (newProductImage) formData.append("image", newProductImage);
      if (branchPayload) {
        Object.entries(branchPayload).forEach(([branchId, value]) => {
          formData.append(`branches[${branchId}][stock]`, String(value.stock));
        });
      }

      await api.post("/products", formData, { headers: { "Content-Type": "multipart/form-data" } });

      await loadInventoryData();
      resetNewProductForm();
      setProductModalOpen(false);
      showToast("Produk baru berhasil ditambahkan.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menambahkan produk.", "error");
    } finally {
      setProductSubmitting(false);
    }
  };

  const openEditProduct = (product: Produk) => {
    setEditingProductId(product.id);
    const apiProduct = produk.find((item) => item.id === product.id);
    if (editProductImagePreview?.startsWith("blob:")) URL.revokeObjectURL(editProductImagePreview);
    setEditProductImage(null);
    setEditProductImagePreview(product.imageUrl);
    setRemoveEditImage(false);
    setEditProduct({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode === "-" ? "" : product.barcode,
      categoryId: categories.find((category) => category.name === product.category)?.id.toString() ?? "",
      costPrice: String(product.costPrice),
      sellPrice: String(product.sellPrice),
      unit: product.unit || "pcs",
      rop: String(product.rop),
      status: apiProduct?.status === "inactive" ? "inactive" : "active",
    });
    setEditProductModalOpen(true);
  };

  const handleSubmitEditProduct = async () => {
    if (!editingProductId) return;
    if (!editProduct.name.trim()) {
      showToast("Nama produk wajib diisi.", "warning");
      return;
    }

    try {
      setEditProductSubmitting(true);
      const formData = new FormData();
      appendProductFormData(formData, {
        _method: "PUT",
        name: editProduct.name.trim(),
        sku: editProduct.sku.trim() || null,
        barcode: editProduct.barcode.trim() || null,
        category_id: editProduct.categoryId ? Number(editProduct.categoryId) : null,
        cost_price: Number(editProduct.costPrice) || 0,
        sell_price: Number(editProduct.sellPrice) || 0,
        unit: editProduct.unit.trim() || "pcs",
        rop: Math.max(0, Number(editProduct.rop) || 0),
        status: editProduct.status,
      });
      if (editProductImage) formData.append("image", editProductImage);
      if (removeEditImage) formData.append("remove_image", "1");

      await api.post(`/products/${editingProductId}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      await loadInventoryData();
      setEditProductModalOpen(false);
      setEditingProductId(null);
      if (editProductImagePreview?.startsWith("blob:")) URL.revokeObjectURL(editProductImagePreview);
      setEditProductImage(null);
      setEditProductImagePreview(null);
      setRemoveEditImage(false);
      showToast("Produk berhasil diperbarui.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal memperbarui produk.", "error");
    } finally {
      setEditProductSubmitting(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProduct) return;

    try {
      setDeleteSubmitting(true);
      await api.delete(`/products/${deleteProduct.id}`);
      await loadInventoryData();
      setDeleteProduct(null);
      showToast("Produk berhasil dihapus.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menghapus produk. Pastikan produk tidak masih dipakai transaksi penting.", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleProductAction = (product: Produk, action: string) => {
    if (action === "detail") {
      setDetailProduct(product);
      return;
    }

    if (action === "edit") {
      openEditProduct(product);
      return;
    }

    if (action === "delete") {
      setDeleteProduct(product);
    }
  };

  const selectedReceivingBranchName = branches.find((b) => String(b.id) === receivingBranchId)?.name ?? "";

  const receivingTotal = receivingItems.reduce((sum, item) => {
    const product = produk.find((p) => p.id === item.productId);
    const qty = Number(item.quantity) || 0;
    const unitCost = Number(item.unitCost || product?.costPrice || 0);
    return sum + qty * unitCost;
  }, 0);

  const updateReceivingItem = (index: number, patch: Partial<ReceivingItem>) => {
    setReceivingItems((prev) => prev.map((item, itemIndex) => (
      itemIndex === index ? { ...item, ...patch } : item
    )));
  };

  const addReceivingItem = () => {
    setReceivingItems((prev) => [...prev, { productId: "", quantity: "1", unitCost: "" }]);
  };

  const removeReceivingItem = (index: number) => {
    setReceivingItems((prev) => prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetReceivingForm = () => {
    setSupplierName("");
    setReferenceNumber("");
    setReceivingNotes("");
    setUpdateCostPrice(false);
    setReceivingItems([{ productId: "", quantity: "1", unitCost: "" }]);
  };

  const handleSubmitReceiving = async () => {
    if (!receivingBranchId) {
      showToast("Pilih cabang penerima terlebih dahulu.", "warning");
      return;
    }

    const items = receivingItems
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => {
        const product = produk.find((p) => p.id === item.productId);
        return {
          product_id: Number(item.productId),
          quantity: Number(item.quantity),
          unit_cost: Number(item.unitCost || product?.costPrice || 0),
        };
      });

    if (items.length === 0) {
      showToast("Tambahkan minimal satu produk yang diterima.", "warning");
      return;
    }

    try {
      setReceivingSubmitting(true);
      await api.post("/stock-receipts", {
        branch_id: Number(receivingBranchId),
        supplier_name: supplierName || null,
        reference_number: referenceNumber || null,
        notes: receivingNotes || null,
        update_cost_price: updateCostPrice,
        items,
      });

      await loadInventoryData();
      resetReceivingForm();
      setReceivingOpen(false);
      showToast("Penerimaan stok berhasil disimpan dan stok cabang diperbarui.", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menyimpan penerimaan stok.", "error");
    } finally {
      setReceivingSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stok Barang</h1>
            <span
              title="Halaman utama untuk melihat daftar produk, harga, SKU, barcode, dan stok berjalan per cabang."
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            >
              <Info className="h-3.5 w-3.5" />
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {produk.length} produk - {menipisStockCount} peringatan stok menipis
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" icon={<Upload className="w-4 h-4" />}>
            Impor
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
            Ekspor
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setProductModalOpen(true)}>
            Tambah Produk
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{produk.length}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Total produk</p>
            </div>
          </div>
        </Card>
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg dark:bg-green-900/30 dark:text-green-400">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{formatIDR(totalNilaiStok)}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Nilai stok</p>
            </div>
          </div>
        </Card>
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg dark:bg-amber-900/30 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--danger-500)]">{menipisStockCount}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Di bawah ROP</p>
            </div>
          </div>
        </Card>
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{kategori.length - 1}</p>
              <p className="text-xs text-[var(--text-tertiary)]">Kategori</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Cari nama, SKU, atau barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {kategori.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border",
                filterCategory === cat
                  ? "bg-[var(--brand-50)] border-[var(--brand-300)] text-[var(--brand-700)] dark:bg-[var(--brand-950)] dark:border-[var(--brand-700)] dark:text-[var(--brand-300)]"
                  : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]",
              )}
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] cursor-pointer"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">Memuat data stok...</p>
        </Card>
      )}
      {error && (
        <Card>
          <p className="text-sm text-[var(--danger-500)]">{error}</p>
        </Card>
      )}

      {!loading && !error && (
        <DataTable
          columns={[
            {
              key: "sku",
              label: "SKU",
              render: (p: Produk) => <span className="font-mono text-xs text-[var(--text-tertiary)]">{p.sku}</span>,
            },
            {
              key: "name",
              label: "Produk",
              render: (p: Produk) => (
                <div className="flex items-center gap-3">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="h-10 w-10 rounded-lg object-cover ring-1 ring-[var(--border)]" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-xs font-bold text-[var(--text-secondary)] ring-1 ring-[var(--border)]">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--text-primary)]">{p.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {p.category} - {p.barcode}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: "barcode",
              label: "Barcode / QR",
              render: (p: Produk) => {
                const hasBarcode = p.barcode && p.barcode !== "-";

                return (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs px-2.5"
                      icon={<QrCode className="w-3.5 h-3.5" />}
                      onClick={() => setLabelProduct(p)}
                    >
                      Label
                    </Button>
                    {!hasBarcode && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs px-2.5"
                        loading={generatingBarcode === p.id}
                        icon={<BarcodeIcon className="w-3.5 h-3.5" />}
                        onClick={() => handleGenerateBarcode(p)}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                );
              },
            },
            { key: "costPrice", label: "HPP", render: (p: Produk) => <span className="text-sm">{formatIDR(p.costPrice)}</span> },
            {
              key: "sellPrice",
              label: "Harga Jual",
              render: (p: Produk) => <span className="text-sm font-medium">{formatIDR(p.sellPrice)}</span>,
            },
            {
              key: "stock",
              label: `Stok (${selectedBranch || "Cabang"})`,
              render: (p: Produk) => {
                const stock = p.stock[selectedBranch] || 0;
                const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
                const isMenipis = totalStock <= p.rop;
                return (
                  <div className="flex items-center gap-2">
                    <span className={cn("text-sm font-semibold", isMenipis ? "text-[var(--danger-500)]" : "text-[var(--text-primary)]")}>{stock}</span>
                    {isMenipis && <Badge variant="danger" size="sm">Menipis</Badge>}
                  </div>
                );
              },
            },
            { key: "rop", label: "ROP", render: (p: Produk) => <span className="text-sm text-[var(--text-tertiary)]">{p.rop}</span> },
            {
              key: "margin",
              label: "Margin",
              render: (p: Produk) => {
                const margin = p.sellPrice > 0 ? Math.round(((p.sellPrice - p.costPrice) / p.sellPrice) * 100) : 0;
                return <Badge variant={margin > 30 ? "success" : margin > 15 ? "warning" : "danger"} size="sm">{margin}%</Badge>;
              },
            },
            {
              key: "actions",
              label: "Aksi",
              render: (p: Produk) => (
                <select
                  defaultValue=""
                  onChange={(event) => {
                    handleProductAction(p, event.target.value);
                    event.currentTarget.value = "";
                  }}
                  className="h-8 min-w-28 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="" disabled>Aksi</option>
                  <option value="detail">Detail</option>
                  <option value="edit">Edit</option>
                  <option value="delete">Hapus</option>
                </select>
              ),
            },
          ]}
          data={filtered}
          keyExtractor={(p) => p.id}
          emptyMessage="Produk tidak ditemukan"
        />
      )}

      <Modal open={!!labelProduct} onClose={() => setLabelProduct(null)} title="Label Barcode / QR Produk" size="md">
        {labelProduct && (
          <div className="space-y-5">
            <div className="rounded-lg border border-[var(--border)] bg-white p-5 text-center text-slate-900">
              <p className="text-sm font-bold">{labelProduct.name}</p>
              <p className="mt-1 text-xs text-slate-500">{labelProduct.sku}</p>
              {labelProduct.barcode && labelProduct.barcode !== "-" ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="overflow-hidden rounded border border-slate-200 bg-white p-3">
                    <Barcode
                      value={labelProduct.barcode}
                      format="CODE128"
                      height={54}
                      width={1.6}
                      fontSize={12}
                      margin={4}
                    />
                  </div>
                  <div className="mx-auto rounded border border-slate-200 bg-white p-3">
                    <QRCodeSVG value={labelProduct.barcode} size={112} marginSize={2} />
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">
                  Produk ini belum punya barcode.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              {(!labelProduct.barcode || labelProduct.barcode === "-") && (
                <Button
                  variant="primary"
                  icon={<BarcodeIcon className="w-4 h-4" />}
                  loading={generatingBarcode === labelProduct.id}
                  onClick={() => handleGenerateBarcode(labelProduct)}
                >
                  Generate Barcode
                </Button>
              )}
              <Button variant="outline" onClick={() => window.print()}>
                Cetak
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)} title="Tambah Produk Baru" size="lg">
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/40 p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Foto Produk (Opsional)</p>
            <div className="flex items-center gap-4">
              {newProductImagePreview ? (
                <img src={newProductImagePreview} alt="Preview produk" className="h-20 w-20 rounded-lg object-cover ring-1 ring-[var(--border)]" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[var(--surface)] text-xs font-semibold text-[var(--text-tertiary)] ring-1 ring-[var(--border)]">
                  Foto
                </div>
              )}
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handleNewProductImageChange(event.target.files?.[0] ?? null)}
                  className="block text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--text-primary)]"
                />
                {newProductImagePreview && (
                  <button type="button" onClick={() => handleNewProductImageChange(null)} className="text-xs font-semibold text-[var(--danger-500)]">Hapus foto</button>
                )}
                <p className="text-xs text-[var(--text-tertiary)]">JPG, PNG, atau WEBP. Maksimal 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Nama Produk"
              placeholder="Misal: Kopi Susu 250ml"
              value={newProduct.name}
              onChange={(e) => updateNewProduct({ name: e.target.value })}
            />
            <Input
              label="SKU"
              placeholder="Auto/manual, misal BEV-201"
              value={newProduct.sku}
              onChange={(e) => updateNewProduct({ sku: e.target.value })}
            />
            <Input
              label="Barcode / QR Value"
              placeholder="Kosongkan jika belum ada"
              value={newProduct.barcode}
              onChange={(e) => updateNewProduct({ barcode: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Kategori</label>
              <select
                value={newProduct.categoryId}
                onChange={(e) => updateNewProduct({ categoryId: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Tanpa kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="HPP"
              type="number"
              min="0"
              value={newProduct.costPrice}
              onChange={(e) => updateNewProduct({ costPrice: e.target.value })}
            />
            <Input
              label="Harga Jual"
              type="number"
              min="0"
              value={newProduct.sellPrice}
              onChange={(e) => updateNewProduct({ sellPrice: e.target.value })}
            />
            <Input
              label="Unit"
              placeholder="pcs, pack, bottle..."
              value={newProduct.unit}
              onChange={(e) => updateNewProduct({ unit: e.target.value })}
            />
            <Input
              label="ROP"
              type="number"
              min="0"
              value={newProduct.rop}
              onChange={(e) => updateNewProduct({ rop: e.target.value })}
            />
          </div>

          <div className="rounded-lg border border-[var(--border)] p-4 bg-[var(--surface-raised)]/40">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Stok Awal</p>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Cabang</label>
                <select
                  value={newProduct.branchId}
                  onChange={(e) => updateNewProduct({ branchId: e.target.value })}
                  className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                >
                  <option value="">Belum ditempatkan di cabang</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Jumlah Stok Awal"
                type="number"
                min="0"
                value={newProduct.openingStock}
                onChange={(e) => updateNewProduct({ openingStock: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" onClick={() => setProductModalOpen(false)}>Batal</Button>
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} loading={productSubmitting} onClick={handleSubmitProduct}>
              Simpan Produk
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={editProductModalOpen} onClose={() => setEditProductModalOpen(false)} title="Edit Produk" size="lg">
        <div className="space-y-5">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/40 p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--text-primary)]">Foto Produk</p>
            <div className="flex items-center gap-4">
              {editProductImagePreview && !removeEditImage ? (
                <img src={editProductImagePreview} alt="Preview produk" className="h-20 w-20 rounded-lg object-cover ring-1 ring-[var(--border)]" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-[var(--surface)] text-xs font-semibold text-[var(--text-tertiary)] ring-1 ring-[var(--border)]">
                  Foto
                </div>
              )}
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => handleEditProductImageChange(event.target.files?.[0] ?? null)}
                  className="block text-sm text-[var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--surface)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--text-primary)]"
                />
                {editProductImagePreview && !removeEditImage && (
                  <button
                    type="button"
                    onClick={() => {
                      if (editProductImagePreview.startsWith("blob:")) URL.revokeObjectURL(editProductImagePreview);
                      setEditProductImage(null);
                      setEditProductImagePreview(null);
                      setRemoveEditImage(true);
                    }}
                    className="text-xs font-semibold text-[var(--danger-500)]"
                  >
                    Hapus foto
                  </button>
                )}
                <p className="text-xs text-[var(--text-tertiary)]">Ganti foto hanya jika perlu. Maksimal 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Nama Produk"
              value={editProduct.name}
              onChange={(e) => updateEditProduct({ name: e.target.value })}
            />
            <Input
              label="SKU"
              value={editProduct.sku}
              onChange={(e) => updateEditProduct({ sku: e.target.value })}
            />
            <Input
              label="Barcode / QR Value"
              value={editProduct.barcode}
              onChange={(e) => updateEditProduct({ barcode: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Kategori</label>
              <select
                value={editProduct.categoryId}
                onChange={(e) => updateEditProduct({ categoryId: e.target.value })}
                className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Tanpa kategori</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="HPP"
              type="number"
              min="0"
              value={editProduct.costPrice}
              onChange={(e) => updateEditProduct({ costPrice: e.target.value })}
            />
            <Input
              label="Harga Jual"
              type="number"
              min="0"
              value={editProduct.sellPrice}
              onChange={(e) => updateEditProduct({ sellPrice: e.target.value })}
            />
            <Input
              label="Unit"
              value={editProduct.unit}
              onChange={(e) => updateEditProduct({ unit: e.target.value })}
            />
            <Input
              label="ROP"
              type="number"
              min="0"
              value={editProduct.rop}
              onChange={(e) => updateEditProduct({ rop: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Status</label>
              <select
                value={editProduct.status}
                onChange={(e) => updateEditProduct({ status: e.target.value as "active" | "inactive" })}
                className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/40 p-4">
            <p className="text-xs text-[var(--text-tertiary)]">
              Perubahan harga, HPP, ROP, barcode, dan status akan mempengaruhi POS, label QR/barcode, serta rekomendasi stok berikutnya. Perubahan ini tidak mengubah jumlah stok fisik.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="ghost" onClick={() => setEditProductModalOpen(false)}>Batal</Button>
            <Button variant="primary" icon={<Pencil className="w-4 h-4" />} loading={editProductSubmitting} onClick={handleSubmitEditProduct}>
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!detailProduct} onClose={() => setDetailProduct(null)} title="Detail Produk" size="lg">
        {detailProduct && (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                {detailProduct.imageUrl ? (
                  <img src={detailProduct.imageUrl} alt={detailProduct.name} className="h-14 w-14 rounded-lg object-cover ring-1 ring-[var(--border)]" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--surface-raised)] text-sm font-bold text-[var(--text-secondary)] ring-1 ring-[var(--border)]">
                    {detailProduct.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">{detailProduct.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">{detailProduct.category}</p>
                </div>
              </div>
              <Badge variant={detailProduct.status === "active" ? "success" : "default"}>
                {detailProduct.status === "active" ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <p className="text-xs text-[var(--text-tertiary)]">SKU</p>
                <p className="font-mono font-semibold text-[var(--text-primary)]">{detailProduct.sku}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <p className="text-xs text-[var(--text-tertiary)]">Barcode / QR Value</p>
                <p className="font-mono font-semibold text-[var(--text-primary)]">{detailProduct.barcode}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <p className="text-xs text-[var(--text-tertiary)]">HPP</p>
                <p className="font-semibold text-[var(--text-primary)]">{formatIDR(detailProduct.costPrice)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <p className="text-xs text-[var(--text-tertiary)]">Harga Jual</p>
                <p className="font-semibold text-[var(--text-primary)]">{formatIDR(detailProduct.sellPrice)}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <p className="text-xs text-[var(--text-tertiary)]">Unit / ROP</p>
                <p className="font-semibold text-[var(--text-primary)]">{detailProduct.unit} / {detailProduct.rop}</p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-3">
                <p className="text-xs text-[var(--text-tertiary)]">Margin</p>
                <p className="font-semibold text-[var(--text-primary)]">
                  {detailProduct.sellPrice > 0 ? Math.round(((detailProduct.sellPrice - detailProduct.costPrice) / detailProduct.sellPrice) * 100) : 0}%
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] overflow-hidden">
              <div className="px-3 py-2 bg-[var(--surface-raised)] border-b border-[var(--border)]">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Stok per Cabang</p>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {Object.entries(detailProduct.stock).map(([branchName, stock]) => (
                  <div key={branchName} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-[var(--text-secondary)]">{branchName}</span>
                    <span className="font-semibold text-[var(--text-primary)]">{stock} {detailProduct.unit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setLabelProduct(detailProduct);
                  setDetailProduct(null);
                }}
                icon={<QrCode className="w-4 h-4" />}
              >
                Label
              </Button>
              <Button variant="primary" onClick={() => openEditProduct(detailProduct)} icon={<Pencil className="w-4 h-4" />}>
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!deleteProduct} onClose={() => setDeleteProduct(null)} title="Hapus Produk" size="sm">
        {deleteProduct && (
          <div className="space-y-4">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              <p className="text-sm font-semibold">Yakin ingin menghapus produk ini?</p>
              <p className="mt-1 text-sm">{deleteProduct.name}</p>
              <p className="mt-1 text-xs opacity-80">Produk yang sudah dipakai di transaksi mungkin tidak bisa dihapus karena relasi data.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteProduct(null)}>Batal</Button>
              <Button variant="danger" loading={deleteSubmitting} onClick={handleDeleteProduct} icon={<Trash2 className="w-4 h-4" />}>
                Hapus
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={receivingOpen} onClose={() => setReceivingOpen(false)} title="Penerimaan Stok" size="lg">
        <div className="space-y-5">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Cabang Penerima</label>
              <select
                value={receivingBranchId}
                onChange={(e) => setReceivingBranchId(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Pilih cabang</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
            <Input
              label="Supplier (Opsional)"
              placeholder="Nama supplier/vendor..."
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
            <Input
              label="No. Referensi / Invoice"
              placeholder="INV-2026-..."
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
            <Input
              label="Catatan"
              placeholder="Catatan penerimaan..."
              value={receivingNotes}
              onChange={(e) => setReceivingNotes(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-[var(--border)] overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-3 bg-[var(--surface-raised)] border-b border-[var(--border)]">
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">Item Barang Masuk</p>
                <p className="text-xs text-[var(--text-tertiary)]">Stok akan bertambah di cabang {selectedReceivingBranchName || "terpilih"}.</p>
              </div>
              <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={addReceivingItem}>
                Tambah Item
              </Button>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {receivingItems.map((item, index) => {
                const product = produk.find((p) => p.id === item.productId);
                const currentStock = product ? product.stock[selectedReceivingBranchName] || 0 : 0;
                const qty = Number(item.quantity) || 0;
                const unitCost = Number(item.unitCost || product?.costPrice || 0);

                return (
                  <div key={index} className="grid gap-3 p-3 lg:grid-cols-[1.6fr_0.55fr_0.75fr_0.7fr_auto] lg:items-end">
                    <div>
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Produk</label>
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const nextProduct = produk.find((p) => p.id === e.target.value);
                          updateReceivingItem(index, { productId: e.target.value, unitCost: nextProduct ? String(nextProduct.costPrice) : "" });
                        }}
                        className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                      >
                        <option value="">Pilih produk</option>
                        {produk.map((productOption) => (
                          <option key={productOption.id} value={productOption.id}>
                            {productOption.name} ({productOption.sku})
                          </option>
                        ))}
                      </select>
                    </div>
                    <Input
                      label="Qty Masuk"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateReceivingItem(index, { quantity: e.target.value })}
                    />
                    <Input
                      label="HPP/Unit"
                      type="number"
                      min="0"
                      value={item.unitCost}
                      onChange={(e) => updateReceivingItem(index, { unitCost: e.target.value })}
                    />
                    <div className="rounded-lg bg-[var(--surface-raised)] px-3 py-2 border border-[var(--border)]">
                      <p className="text-[10px] text-[var(--text-tertiary)]">Stok / Subtotal</p>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{currentStock} {"->"} {currentStock + qty}</p>
                      <p className="text-xs text-[var(--brand-600)]">{formatIDR(qty * unitCost)}</p>
                    </div>
                    <button
                      type="button"
                      className="h-10 w-10 inline-flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--danger-500)] hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      onClick={() => removeReceivingItem(index)}
                      title="Hapus item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={updateCostPrice}
              onChange={(e) => setUpdateCostPrice(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--border)]"
            />
            Perbarui HPP produk mengikuti HPP penerimaan ini
          </label>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <div>
              <p className="text-xs text-[var(--text-tertiary)]">Total nilai barang masuk</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{formatIDR(receivingTotal)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReceivingOpen(false)}>Batal</Button>
              <Button variant="primary" icon={<PackagePlus className="w-4 h-4" />} loading={receivingSubmitting} onClick={handleSubmitReceiving}>
                Simpan Penerimaan
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
