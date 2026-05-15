"use client";

import { Card, Badge, StatCard } from "@/components/ui";
import { formatIDR, formatNumber } from "@/lib/constants";
import { Calculator, TrendingDown, AlertTriangle, Package, BarChart3 } from "lucide-react";

interface EOQItem {
  id: string; name: string; sku: string; annualDemand: number; PesananingCost: number;
  holdingCostPerUnit: number; eoq: number; currentPesananQty: number; leadWaktuDays: number;
  avgDailyUsage: number; safetyStock: number; rop: number; currentStock: number;
}

const Item: EOQItem[] = [
  { id: "1", name: "Cold Brew 1L", sku: "KOP-001", annualDemand: 2400, PesananingCost: 50000, holdingCostPerUnit: 8000, eoq: 173, currentPesananQty: 100, leadWaktuDays: 5, avgDailyUsage: 7, safetyStock: 14, rop: 49, currentStock: 44 },
  { id: "2", name: "Pandan Rice 5kg", sku: "GUL-001", annualDemand: 3600, PesananingCost: 35000, holdingCostPerUnit: 3000, eoq: 291, currentPesananQty: 200, leadWaktuDays: 3, avgDailyUsage: 10, safetyStock: 20, rop: 50, currentStock: 16 },
  { id: "3", name: "Mie Instan Box", sku: "MIE-001", annualDemand: 1800, PesananingCost: 75000, holdingCostPerUnit: 12000, eoq: 150, currentPesananQty: 120, leadWaktuDays: 7, avgDailyUsage: 5, safetyStock: 10, rop: 45, currentStock: 120 },
  { id: "4", name: "Sparkling Water 330ml", sku: "SUS-001", annualDemand: 4800, PesananingCost: 40000, holdingCostPerUnit: 4000, eoq: 310, currentPesananQty: 150, leadWaktuDays: 4, avgDailyUsage: 13, safetyStock: 26, rop: 78, currentStock: 59 },
  { id: "5", name: "Minyak Goreng 2L", sku: "MYK-001", annualDemand: 2000, PesananingCost: 45000, holdingCostPerUnit: 5000, eoq: 190, currentPesananQty: 100, leadWaktuDays: 5, avgDailyUsage: 6, safetyStock: 12, rop: 42, currentStock: 72 },
  { id: "6", name: "Beras Premium 5kg", sku: "BRS-001", annualDemand: 1200, PesananingCost: 60000, holdingCostPerUnit: 10000, eoq: 120, currentPesananQty: 80, leadWaktuDays: 7, avgDailyUsage: 3, safetyStock: 6, rop: 27, currentStock: 25 },
];

export default function OptimizationPage() {
  const needsRePesanan = Item.filter((i) => i.currentStock <= i.rop);
  const potentialSavings = Item.reduce((sum, i) => {
    const currentCost = (i.annualDemand / i.currentPesananQty) * i.PesananingCost + (i.currentPesananQty / 2) * i.holdingCostPerUnit;
    const optimalCost = (i.annualDemand / i.eoq) * i.PesananingCost + (i.eoq / 2) * i.holdingCostPerUnit;
    return sum + (currentCost - optimalCost);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stok Barang Optimization</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Mathematical EOQ & ROP analysis based on historical sales data</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Potential Savings" value={formatIDR(potentialSavings)} change="By Pilihing to EOQ" changeType="positive" icon={<Calculator className="w-5 h-5" />} />
        <StatCard label="Needs RePesanan" value={needsRePesanan.length.toString()} change="Di bawah ROP level" changeType="negative" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Avg. Lead Waktu" value="5.2 days" change="Across all suppliers" changeType="neutral" icon={<TrendingDown className="w-5 h-5" />} />
        <StatCard label="Item Analyzed" value={Item.length.toString()} change="With sufficient data" changeType="neutral" icon={<Package className="w-5 h-5" />} />
      </div>

      {/* Formulas Reference */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[var(--brand-600)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Optimization Formulas</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--brand-600)] mb-1">Economic Pesanan Quantity (EOQ)</p>
            <p className="font-mono text-lg text-[var(--text-primary)]">EOQ = sqrt(2DS / H)</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">D = Annual demand - S = Pesananing cost - H = Holding cost/unit</p>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--brand-600)] mb-1">RePesanan Point (ROP)</p>
            <p className="font-mono text-lg text-[var(--text-primary)]">ROP = (d x L) + SS</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">d = Avg daily usage - L = Lead Waktu - SS = Safety stock</p>
          </div>
        </div>
      </Card>

      {/* EOQ Analysis Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Produk Analysis</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Item.map((item) => {
            const beMenipisROP = item.currentStock <= item.rop;
                        return (
              <Card key={item.id} hover>
                <div className="flex Item-start justify-between mb-3">
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
                    <p className="text-xl font-bold text-[var(--text-primary)]">{item.currentPesananQty}</p>
                  </div>
                </div>
                {/* Stock Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)]">Stock Level</span>
                    <span className={beMenipisROP ? "text-[var(--danger-500)] font-medium" : "text-[var(--text-primary)]"}>{item.currentStock} / {item.rop} ROP</span>
                  </div>
                  <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
                    <div className={`h-full rounded-full transition-all ${beMenipisROP ? "bg-[var(--danger-500)]" : "bg-[var(--success-500)]"}`} style={{ width: `${Math.min(100, (item.currentStock / (item.rop * 2)) * 100)}%` }} />
                  </div>
                </div>
                {/* Details */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Annual Demand</span><span className="text-[var(--text-primary)]">{formatNumber(item.annualDemand)} units</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Lead Waktu</span><span className="text-[var(--text-primary)]">{item.leadWaktuDays} days</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Safety Stock</span><span className="text-[var(--text-primary)]">{item.safetyStock} units</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Daily Usage</span><span className="text-[var(--text-primary)]">{item.avgDailyUsage} units/day</span></div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}



