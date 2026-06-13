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
  const [leadTimeDays, setLeadTimeDays] = useState(5);
  const [orderingCost, setOrderingCost] = useState(50000);
  const [holdingCostRate, setHoldingCostRate] = useState(20); // 20%

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

  const handleApply = async (productsToApply: { id: number; rop: number }[]) => {
    try {
      setApplying("auto");
      const res = await api.post("/inventory/optimization/apply", { products: productsToApply });
      showToast(res.data.message || "Batas minimum stok otomatis diperbarui!", "success");
    } catch (err: unknown) {
      showToast(getApiErrorMessage(err, "Gagal menerapkan batas minimum."), "error");
    } finally {
      setApplying(null);
    }
  };

  useEffect(() => {
    let active = true;

    async function load() {
      // Don't use cache if parameters changed from defaults to avoid stale custom data
      const useCache = leadTimeDays === 5 && orderingCost === 50000 && holdingCostRate === 20;
      const cachedItems = readCachedItems(cacheKey);
      if (useCache && cachedItems.length > 0) {
        setItems(cachedItems);
        setLoading(false);
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        setError(null);
        const data = await fetchInventoryOptimization({ 
          lead_time_days: leadTimeDays,
          ordering_cost: orderingCost,
          holding_cost_rate: holdingCostRate / 100 // send as decimal
        });
        if (!active) return;
        setItems(data);
        if (useCache) window.localStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {
        if (active) setError("Gagal memuat data optimasi stok.");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    // debounce loading
    const timer = setTimeout(load, 500);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [cacheKey, leadTimeDays, orderingCost, holdingCostRate]);

  // Auto-apply: setiap kali data berhasil dimuat, langsung terapkan suggested_rop ke database
  useEffect(() => {
    if (items.length === 0 || loading) return;
    
    // Cek apakah ada produk yang suggested_rop-nya berbeda dari rop saat ini
    const needsUpdate = items.filter((i) => i.rop !== i.suggested_rop);
    if (needsUpdate.length === 0) return;

    const productsToApply = needsUpdate.map((i) => ({ id: i.id, rop: i.suggested_rop }));
    handleApply(productsToApply);
  }, [items, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const needsRePesanan = useMemo(() => items.filter((i) => i.currentStock <= i.suggested_rop), [items]);
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Rekomendasi Stok & Pembelian</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Analisis stok otomatis berdasarkan data penjualan 90 hari terakhir</p>
        </div>
        {applying === "auto" && (
          <Badge variant="info" dot pulse>Menerapkan saran otomatis...</Badge>
        )}
      </div>

      <Card>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between pb-4 border-b border-[var(--border)]">
            <div className="w-full sm:w-1/2">
              <h3 className="font-medium text-[var(--text-primary)]">Waktu Pengiriman Supplier</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Estimasi hari sejak pesan hingga barang tiba di toko.</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-1/2 lg:w-1/3">
              <span className="text-sm font-semibold w-16 text-right">{leadTimeDays} Hari</span>
              <input 
                type="range" 
                min="1" 
                max="30" 
                value={leadTimeDays} 
                onChange={(e) => setLeadTimeDays(parseInt(e.target.value))}
                className="w-full accent-[var(--brand-600)]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between pb-4 border-b border-[var(--border)]">
            <div className="w-full sm:w-1/2">
              <h3 className="font-medium text-[var(--text-primary)]">Biaya Pemesanan (Per Transaksi)</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Ongkos kirim, biaya admin, atau tenaga yang keluar setiap kali order ke supplier.</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-1/2 lg:w-1/3">
              <span className="text-sm font-semibold w-24 text-right">{formatIDR(orderingCost)}</span>
              <input 
                type="range" 
                min="5000" 
                max="250000" 
                step="5000"
                value={orderingCost} 
                onChange={(e) => setOrderingCost(parseInt(e.target.value))}
                className="w-full accent-[var(--brand-600)]"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
            <div className="w-full sm:w-1/2">
              <h3 className="font-medium text-[var(--text-primary)]">Biaya Penyimpanan per Tahun (%)</h3>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Persentase kerugian jika barang menumpuk (sewa gudang, asuransi, barang kedaluwarsa).</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-1/2 lg:w-1/3">
              <span className="text-sm font-semibold w-16 text-right">{holdingCostRate}%</span>
              <input 
                type="range" 
                min="5" 
                max="50" 
                value={holdingCostRate} 
                onChange={(e) => setHoldingCostRate(parseInt(e.target.value))}
                className="w-full accent-[var(--brand-600)]"
              />
            </div>
          </div>
        </div>
      </Card>

      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Mengkalkulasi ulang rekomendasi stok...</Card>}
      {refreshing && !loading && <p className="text-xs text-[var(--text-tertiary)]">Menyegarkan data terbaru...</p>}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Potensi Hemat" value={formatIDR(potentialSavings)} change="Jika ikuti saran order" changeType="positive" icon={<Calculator className="w-5 h-5" />} />
        <StatCard label="Hampir Habis" value={needsRePesanan.length.toString()} change="Di bawah batas aman" changeType="negative" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Waktu Kirim" value={`${avgLeadTime.toFixed(1)} hari`} change="Estimasi tiba" changeType="neutral" icon={<TrendingDown className="w-5 h-5" />} />
        <StatCard label="Produk Dianalisis" value={items.length.toString()} change="Cukup data 90 hari" changeType="neutral" icon={<Package className="w-5 h-5" />} />
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
              <p className="mb-1 text-sm font-semibold text-[var(--brand-600)]">Saran Jumlah Order (EOQ)</p>
              <p className="font-mono text-lg text-[var(--text-primary)]">EOQ = akar(2 x D x S / H)</p>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">D = Total Penjualan Tahunan - S = Biaya Pemesanan - H = Biaya Simpan per Unit</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] p-4">
              <p className="mb-1 text-sm font-semibold text-[var(--brand-600)]">Batas Minimum (Reorder Point)</p>
              <p className="font-mono text-lg text-[var(--text-primary)]">Batas = (Penjualan Harian x Waktu Kirim) + Cadangan</p>
              <p className="mt-2 text-xs text-[var(--text-tertiary)]">Menentukan kapan Anda harus memesan barang lagi agar tidak kehabisan sebelum barang datang.</p>
            </div>
          </div>
        )}
      </Card>

      {/* EOQ Analysis Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Rincian Analisis Produk</h2>
        {!loading && items.length === 0 && (
          <Card className="text-sm text-[var(--text-secondary)]">Belum ada produk untuk dianalisis.</Card>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const beMenipisROP = item.currentStock <= item.rop;
            return (
              <Card key={item.id} hover>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-[var(--text-primary)] truncate" title={item.name}>{item.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{item.sku}</p>
                  </div>
                  {beMenipisROP && <Badge variant="danger" dot pulse>Restock Sekarang</Badge>}
                </div>
                {/* EOQ vs Current */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[var(--brand-50)] rounded-lg text-center dark:bg-[var(--brand-950)] border border-[var(--brand-100)] dark:border-[var(--brand-900)]">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--brand-600)] mb-1">Saran Order</p>
                    <p className="text-xl font-bold text-[var(--brand-700)] dark:text-[var(--brand-400)]">{item.eoq}</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-raised)] rounded-lg text-center border border-[var(--border)]">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-secondary)] mb-1">Stok Saat Ini</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{item.currentStock}</p>
                  </div>
                </div>
                {/* Details */}
                <div className="space-y-2 text-xs mb-4 p-3 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
                  <div className="flex justify-between items-center"><span className="text-[var(--text-tertiary)]">Terjual /Hari</span><span className="text-[var(--text-primary)] font-medium">{item.avgDailyUsage} unit</span></div>
                  <div className="flex justify-between items-center"><span className="text-[var(--text-tertiary)]">Stok Cadangan</span><span className="text-[var(--text-primary)] font-medium">{item.safetyStock} unit</span></div>
                  <div className="pt-2 mt-2 border-t border-[var(--border)] flex justify-between items-center">
                    <span className="text-[var(--text-secondary)] font-medium">Saran Batas Min.</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded">{item.suggested_rop} unit</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Batas Min. Otomatis Diterapkan</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

