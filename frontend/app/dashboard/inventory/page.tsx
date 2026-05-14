"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Plus, Filter, Download, Upload, AlertTriangle, Package, ArrowUpDown } from "lucide-react";
import { Button, Input, Badge, Card, DataTable } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Product {
  id: string; sku: string; barcode: string; name: string; category: string;
  costPrice: number; sellPrice: number; stock: Record<string, number>; rop: number; unit: string; status: string;
}

const BRANCHES = ["Cabang Utama", "Cabang Mall", "Cabang Pasar"];

const PRODUCTS: Product[] = [
  { id: "1", sku: "KOP-001", barcode: "8991234001", name: "Kopi Arabica 250g", category: "Beverages", costPrice: 62000, sellPrice: 85000, stock: { "Cabang Utama": 24, "Cabang Mall": 12, "Cabang Pasar": 8 }, rop: 10, unit: "pcs", status: "active" },
  { id: "2", sku: "TEH-001", barcode: "8991234002", name: "Teh Celup Box 25s", category: "Beverages", costPrice: 11000, sellPrice: 18500, stock: { "Cabang Utama": 42, "Cabang Mall": 30, "Cabang Pasar": 2 }, rop: 12, unit: "box", status: "active" },
  { id: "3", sku: "SUS-001", barcode: "8991234003", name: "Susu UHT 1L", category: "Dairy", costPrice: 10000, sellPrice: 16000, stock: { "Cabang Utama": 36, "Cabang Mall": 5, "Cabang Pasar": 18 }, rop: 20, unit: "pcs", status: "active" },
  { id: "4", sku: "GUL-001", barcode: "8991234004", name: "Gula Pasir 1kg", category: "Groceries", costPrice: 10000, sellPrice: 14500, stock: { "Cabang Utama": 5, "Cabang Mall": 8, "Cabang Pasar": 3 }, rop: 15, unit: "kg", status: "low" },
  { id: "5", sku: "MIE-001", barcode: "8991234005", name: "Mie Instan Box 40pcs", category: "Rice & Noodles", costPrice: 72000, sellPrice: 95000, stock: { "Cabang Utama": 120, "Cabang Mall": 80, "Cabang Pasar": 45 }, rop: 30, unit: "box", status: "active" },
  { id: "6", sku: "BRS-001", barcode: "8991234006", name: "Beras Premium 5kg", category: "Rice & Noodles", costPrice: 52000, sellPrice: 68000, stock: { "Cabang Utama": 15, "Cabang Mall": 3, "Cabang Pasar": 7 }, rop: 10, unit: "sak", status: "active" },
  { id: "7", sku: "KRP-001", barcode: "8991234007", name: "Keripik Singkong 200g", category: "Snacks", costPrice: 7000, sellPrice: 12000, stock: { "Cabang Utama": 65, "Cabang Mall": 40, "Cabang Pasar": 22 }, rop: 20, unit: "pcs", status: "active" },
  { id: "8", sku: "MYK-001", barcode: "8991234008", name: "Minyak Goreng 2L", category: "Groceries", costPrice: 24000, sellPrice: 32000, stock: { "Cabang Utama": 44, "Cabang Mall": 18, "Cabang Pasar": 10 }, rop: 15, unit: "pcs", status: "active" },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [selectedBranch, setSelectedBranch] = useState("Cabang Utama");

  const categories = ["All", ...new Set(PRODUCTS.map((p) => p.category))];

  const filtered = PRODUCTS.filter((p) =>
    (filterCategory === "All" || p.category === filterCategory) &&
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search))
  );

  const lowStockCount = PRODUCTS.filter((p) => {
    const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
    return totalStock <= p.rop;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Inventory</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{PRODUCTS.length} products · {lowStockCount} low stock alerts</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/inventory/optimization">
            <Button variant="outline" size="sm" icon={<AlertTriangle className="w-4 h-4" />}>
              EOQ/ROP
            </Button>
          </Link>
          <Button variant="outline" size="sm" icon={<Upload className="w-4 h-4" />}>Import</Button>
          <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />}>Add Product</Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400"><Package className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-[var(--text-primary)]">{PRODUCTS.length}</p><p className="text-xs text-[var(--text-tertiary)]">Total Products</p></div>
          </div>
        </Card>
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600 rounded-lg dark:bg-green-900/30 dark:text-green-400"><ArrowUpDown className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-[var(--text-primary)]">{formatIDR(12_540_000)}</p><p className="text-xs text-[var(--text-tertiary)]">Stock Value</p></div>
          </div>
        </Card>
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg dark:bg-amber-900/30 dark:text-amber-400"><AlertTriangle className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-[var(--danger-500)]">{lowStockCount}</p><p className="text-xs text-[var(--text-tertiary)]">Below ROP</p></div>
          </div>
        </Card>
        <Card hover padding="sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400"><Filter className="w-5 h-5" /></div>
            <div><p className="text-2xl font-bold text-[var(--text-primary)]">{categories.length - 1}</p><p className="text-xs text-[var(--text-tertiary)]">Categories</p></div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input placeholder="Search by name, SKU, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((cat) => (
            <button key={cat} onClick={() => setFilterCategory(cat)}
              className={cn("px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border",
                filterCategory === cat ? "bg-[var(--brand-50)] border-[var(--brand-300)] text-[var(--brand-700)] dark:bg-[var(--brand-950)] dark:border-[var(--brand-700)] dark:text-[var(--brand-300)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-hover)]")}>
              {cat}
            </button>
          ))}
        </div>
        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
          className="h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] cursor-pointer">
          {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Product Table */}
      <DataTable
        columns={[
          { key: "sku", label: "SKU", render: (p: Product) => <span className="font-mono text-xs text-[var(--text-tertiary)]">{p.sku}</span> },
          { key: "name", label: "Product", render: (p: Product) => (
            <div><p className="font-medium text-[var(--text-primary)]">{p.name}</p><p className="text-xs text-[var(--text-tertiary)]">{p.category} · {p.barcode}</p></div>
          )},
          { key: "costPrice", label: "Cost (HPP)", render: (p: Product) => <span className="text-sm">{formatIDR(p.costPrice)}</span> },
          { key: "sellPrice", label: "Sell Price", render: (p: Product) => <span className="text-sm font-medium">{formatIDR(p.sellPrice)}</span> },
          { key: "stock", label: `Stock (${selectedBranch})`, render: (p: Product) => {
            const stock = p.stock[selectedBranch] || 0;
            const totalStock = Object.values(p.stock).reduce((a, b) => a + b, 0);
            const isLow = totalStock <= p.rop;
            return (
              <div className="flex items-center gap-2">
                <span className={cn("text-sm font-semibold", isLow ? "text-[var(--danger-500)]" : "text-[var(--text-primary)]")}>{stock}</span>
                {isLow && <Badge variant="danger" size="sm">Low</Badge>}
              </div>
            );
          }},
          { key: "rop", label: "ROP", render: (p: Product) => <span className="text-sm text-[var(--text-tertiary)]">{p.rop}</span> },
          { key: "margin", label: "Margin", render: (p: Product) => {
            const margin = Math.round(((p.sellPrice - p.costPrice) / p.sellPrice) * 100);
            return <Badge variant={margin > 30 ? "success" : margin > 15 ? "warning" : "danger"} size="sm">{margin}%</Badge>;
          }},
        ]}
        data={filtered}
        keyExtractor={(p) => p.id}
        emptyMessage="No products found"
      />
    </div>
  );
}
