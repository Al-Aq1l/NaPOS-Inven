"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter, Download, Upload, AlertTriangle, Package, ArrowUpDown } from "lucide-react";
import { Button, Input, Badge, Card, DataTable } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fetchBranches, fetchProducts, type ApiProduct } from "@/lib/dashboard-api";

interface Produk {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  costPrice: number;
  sellPrice: number;
  stock: Record<string, number>;
  rop: number;
  unit: string;
  status: string;
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
    category: item.category?.name ?? "Tanpa Kategori",
    costPrice: Number(item.cost_price),
    sellPrice: Number(item.sell_price),
    stock,
    rop: item.rop,
    unit: item.unit,
    status: item.status,
  };
}

export default function StokBarangPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("Semua");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [branchData, productData] = await Promise.all([fetchBranches(), fetchProducts()]);
        if (!isMounted) return;

        const branchNames = branchData.map((b) => b.name);
        setBranches(branchNames);
        setSelectedBranch((prev) => prev || branchNames[0] || "");
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stok Barang</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {produk.length} produk - {menipisStockCount} peringatan stok menipis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory/optimization">
            <Button variant="outline" size="sm" icon={<AlertTriangle className="w-4 h-4" />}>
              EOQ/ROP
            </Button>
          </Link>
          <Button variant="outline" size="sm" icon={<Upload className="w-4 h-4" />}>
            Impor
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>
            Ekspor
          </Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />}>
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
            <option key={b} value={b}>
              {b}
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
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{p.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {p.category} - {p.barcode}
                  </p>
                </div>
              ),
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
          ]}
          data={filtered}
          keyExtractor={(p) => p.id}
          emptyMessage="Produk tidak ditemukan"
        />
      )}
    </div>
  );
}
