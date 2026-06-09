"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Badge, StatCard, Button, Toast } from "@/components/ui";
import { formatIDR, formatNumber } from "@/lib/constants";
import { Calculator, TrendingDown, AlertTriangle, Package, BarChart3, ChevronDown } from "lucide-react";
import { fetchInventoryOptimization, type InventoryOptimizationItem } from "@/lib/dashboard-api";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api";

const CACHE_KEY_PREFIX = "inventory_optimization_cache_v1";

function readCachedItems(cacheKey: string) {
  if (typeof window === "undefined") return [];
  try {
    const cached = window.localStorage.getItem(cacheKey);
    return cached ? (JSON.parse(cached) as InventoryOptimizationItem[]) : [];
  } catch {
    return [];
  }
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error !== "object" || error === null || !("response" in error)) return fallback;
  return (error as { response?: { data?: { message?: string } } }).response?.data?.message || fallback;
}

export default function OptimizationPage() {
  const { user } = useAuth();
  const cacheKey = `${CACHE_KEY_PREFIX}_${user?.tenant.id ?? "default"}`;
  const [items, setItems] = useState<InventoryOptimizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formulasOpen, setFormulasOpen] = useState(false);

  // Apply state & toast notifications
  const [applying, setApplying] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const handleApply = async (productsToApply: { id: number; rop: number }[], label: string) => {
    try {
      setApplying(label);
      const res = await api.post("/inventory/optimization/apply", { products: productsToApply });
      showToast(res.data.message || "Reorder Point berhasil diperbarui!", "success");
      // refresh optimization
      const data = await fetchInventoryOptimization();
      setItems(data);
      window.localStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, "Gagal menerapkan ROP."), "error");
    } finally {
      setApplying(null);
    }
  };

  useEffect(() => {
    let active = true;

    async function load() {
      const cachedItems = readCachedItems(cacheKey);
      if (cachedItems.length > 0) {
        setItems(cachedItems);
        setLoading(false);
        setRefreshing(true);
      }

      try {
        setError(null);
        const data = await fetchInventoryOptimization();
        if (!active) return;
        setItems(data);
        window.localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        if (active) setError("Gagal memuat data optimasi stok.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [cacheKey]);

  const needsRePesanan = useMemo(() => items.filter((i) => i.currentStock <= i.rop), [items]);
  const potentialSavings = useMemo(() => items.reduce((sum, i) => {
    const currentCost = (i.annualDemand / i.currentOrderQty) * i.orderingCost + (i.currentOrderQty / 2) * i.holdingCostPerUnit;
    const optimalCost = (i.annualDemand / i.eoq) * i.orderingCost + (i.eoq / 2) * i.holdingCostPerUnit;
    return sum + (currentCost - optimalCost);
  }, 0), [items]);
  const avgLeadTime = items.length ? items.reduce((sum, item) => sum + item.leadTimeDays, 0) / items.length : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stok Barang Optimization</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Mathematical EOQ & ROP analysis based on historical sales data</p>
        </div>
        {items.length > 0 && (
          <Button
            onClick={() => {
              const products = items.map(item => ({ id: item.id, rop: item.suggested_rop }));
              handleApply(products, "all");
            }}
            loading={applying === "all"}
            disabled={applying !== null}
            variant="primary"
          >
            Terapkan Semua Saran ROP
          </Button>
        )}
      </div>

      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data optimasi stok...</Card>}
      {refreshing && !loading && <p className="text-xs text-[var(--text-tertiary)]">Menyegarkan data terbaru...</p>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Potential Savings" value={formatIDR(potentialSavings)} change="By Pilihing to EOQ" changeType="positive" icon={<Calculator className="w-5 h-5" />} />
        <StatCard label="Needs RePesanan" value={needsRePesanan.length.toString()} change="Di bawah ROP level" changeType="negative" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Avg. Lead Waktu" value={`${avgLeadTime.toFixed(1)} days`} change="Across all suppliers" changeType="neutral" icon={<TrendingDown className="w-5 h-5" />} />
        <StatCard label="Item Analyzed" value={items.length.toString()} change="With sufficient data" changeType="neutral" icon={<Package className="w-5 h-5" />} />
      </div>

      {/* Formulas Reference */}
      <Card padding="none" className="overflow-hidden">
        <button
          type="button"
          onClick={() => setFormulasOpen((open) => !open)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-[var(--surface-raised)]"
          aria-expanded={formulasOpen}
        >
          <span className="flex min-w-0 items-center gap-2">
            <BarChart3 className="h-5 w-5 shrink-0 text-[var(--brand-600)]" />
            <span>
              <span className="block text-sm font-semibold text-[var(--text-primary)]">Optimization Formulas</span>
              <span className="mt-0.5 block text-xs text-[var(--text-tertiary)]">
                Lihat rumus EOQ dan ROP yang dipakai sistem.
              </span>
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform ${formulasOpen ? "rotate-180" : ""}`} />
        </button>
        {formulasOpen && (
          <div className="grid gap-4 border-t border-[var(--border)] p-4 sm:grid-cols-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--brand-600)]">Economic Order Quantity (EOQ)</p>
              <p className="font-mono text-lg text-[var(--text-primary)]">EOQ = sqrt(2DS / H)</p>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">D = Annual demand - S = Ordering cost - H = Holding cost/unit</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--brand-600)]">Reorder Point (ROP)</p>
              <p className="font-mono text-lg text-[var(--text-primary)]">ROP = (d x L) + SS</p>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">d = Avg daily usage - L = Lead time - SS = Safety stock</p>
            </div>
          </div>
        )}
      </Card>

      {/* EOQ Analysis Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Produk Analysis</h2>
        {!loading && items.length === 0 && (
          <Card className="text-sm text-[var(--text-secondary)]">Belum ada produk untuk dianalisis.</Card>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const beMenipisROP = item.currentStock <= item.rop;
            return (
              <Card key={item.id} hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{item.sku}</p>
                  </div>
                  {beMenipisROP && <Badge variant="danger" dot pulse>RePesanan Now</Badge>}
                </div>
                {/* EOQ vs Current */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[var(--brand-50)] rounded-lg text-center dark:bg-[var(--brand-950)]">
                    <p className="text-xs text-[var(--text-tertiary)]">Optimal EOQ</p>
                    <p className="text-xl font-bold text-[var(--brand-600)]">{item.eoq}</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-raised)] rounded-lg text-center">
                    <p className="text-xs text-[var(--text-tertiary)]">Current Pesanan</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{item.currentOrderQty}</p>
                  </div>
                </div>
                {/* Stock Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)]">Stock Level</span>
                    <span className={beMenipisROP ? "text-[var(--danger-500)] font-medium" : "text-[var(--text-primary)]"}>{item.currentStock} / {item.rop} ROP</span>
                  </div>
                  <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
                    <div className={`h-full rounded-full transition-all ${beMenipisROP ? "bg-[var(--danger-500)]" : "bg-[var(--success-500)]"}`} style={{ width: `${Math.min(100, (item.currentStock / (Math.max(1, item.rop) * 2)) * 100)}%` }} />
                  </div>
                </div>
                {/* Details */}
                <div className="space-y-1.5 text-xs mb-4">
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Annual Demand</span><span className="text-[var(--text-primary)]">{formatNumber(item.annualDemand)} units</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Lead Waktu</span><span className="text-[var(--text-primary)]">{item.leadTimeDays} days</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Safety Stock</span><span className="text-[var(--text-primary)]">{item.safetyStock} units</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Suggested ROP</span><span className="text-emerald-600 font-semibold">{item.suggested_rop} units</span></div>
                </div>

                <Button
                  size="sm"
                  variant={item.rop === item.suggested_rop ? "secondary" : "outline"}
                  className="w-full text-xs h-8"
                  disabled={applying !== null || item.rop === item.suggested_rop}
                  loading={applying === String(item.id)}
                  onClick={() => handleApply([{ id: item.id, rop: item.suggested_rop }], String(item.id))}
                >
                  {item.rop === item.suggested_rop ? "Sesuai Saran ROP" : `Terapkan ROP (${item.suggested_rop})`}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

