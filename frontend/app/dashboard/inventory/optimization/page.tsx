"use client";

import { Card, Badge, StatCard } from "@/components/ui";
import { formatIDR, formatNumber } from "@/lib/constants";
import { Calculator, TrendingDown, AlertTriangle, ArrowRight, Package, BarChart3 } from "lucide-react";

interface EOQItem {
  id: string; name: string; sku: string; annualDemand: number; orderingCost: number;
  holdingCostPerUnit: number; eoq: number; currentOrderQty: number; leadTimeDays: number;
  avgDailyUsage: number; safetyStock: number; rop: number; currentStock: number;
}

const ITEMS: EOQItem[] = [
  { id: "1", name: "Kopi Arabica 250g", sku: "KOP-001", annualDemand: 2400, orderingCost: 50000, holdingCostPerUnit: 8000, eoq: 173, currentOrderQty: 100, leadTimeDays: 5, avgDailyUsage: 7, safetyStock: 14, rop: 49, currentStock: 44 },
  { id: "2", name: "Gula Pasir 1kg", sku: "GUL-001", annualDemand: 3600, orderingCost: 35000, holdingCostPerUnit: 3000, eoq: 291, currentOrderQty: 200, leadTimeDays: 3, avgDailyUsage: 10, safetyStock: 20, rop: 50, currentStock: 16 },
  { id: "3", name: "Mie Instan Box", sku: "MIE-001", annualDemand: 1800, orderingCost: 75000, holdingCostPerUnit: 12000, eoq: 150, currentOrderQty: 120, leadTimeDays: 7, avgDailyUsage: 5, safetyStock: 10, rop: 45, currentStock: 120 },
  { id: "4", name: "Susu UHT 1L", sku: "SUS-001", annualDemand: 4800, orderingCost: 40000, holdingCostPerUnit: 4000, eoq: 310, currentOrderQty: 150, leadTimeDays: 4, avgDailyUsage: 13, safetyStock: 26, rop: 78, currentStock: 59 },
  { id: "5", name: "Minyak Goreng 2L", sku: "MYK-001", annualDemand: 2000, orderingCost: 45000, holdingCostPerUnit: 5000, eoq: 190, currentOrderQty: 100, leadTimeDays: 5, avgDailyUsage: 6, safetyStock: 12, rop: 42, currentStock: 72 },
  { id: "6", name: "Beras Premium 5kg", sku: "BRS-001", annualDemand: 1200, orderingCost: 60000, holdingCostPerUnit: 10000, eoq: 120, currentOrderQty: 80, leadTimeDays: 7, avgDailyUsage: 3, safetyStock: 6, rop: 27, currentStock: 25 },
];

export default function OptimizationPage() {
  const needsReorder = ITEMS.filter((i) => i.currentStock <= i.rop);
  const potentialSavings = ITEMS.reduce((sum, i) => {
    const currentCost = (i.annualDemand / i.currentOrderQty) * i.orderingCost + (i.currentOrderQty / 2) * i.holdingCostPerUnit;
    const optimalCost = (i.annualDemand / i.eoq) * i.orderingCost + (i.eoq / 2) * i.holdingCostPerUnit;
    return sum + (currentCost - optimalCost);
  }, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Inventory Optimization</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Mathematical EOQ & ROP analysis based on historical sales data</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Potential Savings" value={formatIDR(potentialSavings)} change="By switching to EOQ" changeType="positive" icon={<Calculator className="w-5 h-5" />} />
        <StatCard label="Needs Reorder" value={needsReorder.length.toString()} change="Below ROP level" changeType="negative" icon={<AlertTriangle className="w-5 h-5" />} />
        <StatCard label="Avg. Lead Time" value="5.2 days" change="Across all suppliers" changeType="neutral" icon={<TrendingDown className="w-5 h-5" />} />
        <StatCard label="Items Analyzed" value={ITEMS.length.toString()} change="With sufficient data" changeType="neutral" icon={<Package className="w-5 h-5" />} />
      </div>

      {/* Formulas Reference */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[var(--brand-600)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Optimization Formulas</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--brand-600)] mb-1">Economic Order Quantity (EOQ)</p>
            <p className="font-mono text-lg text-[var(--text-primary)]">EOQ = √(2DS / H)</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">D = Annual demand · S = Ordering cost · H = Holding cost/unit</p>
          </div>
          <div className="p-4 bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]">
            <p className="text-sm font-semibold text-[var(--brand-600)] mb-1">Reorder Point (ROP)</p>
            <p className="font-mono text-lg text-[var(--text-primary)]">ROP = (d × L) + SS</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-2">d = Avg daily usage · L = Lead time · SS = Safety stock</p>
          </div>
        </div>
      </Card>

      {/* EOQ Analysis Cards */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Product Analysis</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ITEMS.map((item) => {
            const belowROP = item.currentStock <= item.rop;
            const savingPct = Math.round(((item.currentOrderQty - item.eoq) / item.currentOrderQty) * -100);
            return (
              <Card key={item.id} hover>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{item.sku}</p>
                  </div>
                  {belowROP && <Badge variant="danger" dot pulse>Reorder Now</Badge>}
                </div>
                {/* EOQ vs Current */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 bg-[var(--brand-50)] rounded-lg text-center dark:bg-[var(--brand-950)]">
                    <p className="text-xs text-[var(--text-tertiary)]">Optimal EOQ</p>
                    <p className="text-xl font-bold text-[var(--brand-600)]">{item.eoq}</p>
                  </div>
                  <div className="p-3 bg-[var(--surface-raised)] rounded-lg text-center">
                    <p className="text-xs text-[var(--text-tertiary)]">Current Order</p>
                    <p className="text-xl font-bold text-[var(--text-primary)]">{item.currentOrderQty}</p>
                  </div>
                </div>
                {/* Stock Bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--text-secondary)]">Stock Level</span>
                    <span className={belowROP ? "text-[var(--danger-500)] font-medium" : "text-[var(--text-primary)]"}>{item.currentStock} / {item.rop} ROP</span>
                  </div>
                  <div className="h-2 bg-[var(--slate-200)] rounded-full overflow-hidden dark:bg-[var(--slate-700)]">
                    <div className={`h-full rounded-full transition-all ${belowROP ? "bg-[var(--danger-500)]" : "bg-[var(--success-500)]"}`} style={{ width: `${Math.min(100, (item.currentStock / (item.rop * 2)) * 100)}%` }} />
                  </div>
                </div>
                {/* Details */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Annual Demand</span><span className="text-[var(--text-primary)]">{formatNumber(item.annualDemand)} units</span></div>
                  <div className="flex justify-between"><span className="text-[var(--text-tertiary)]">Lead Time</span><span className="text-[var(--text-primary)]">{item.leadTimeDays} days</span></div>
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
