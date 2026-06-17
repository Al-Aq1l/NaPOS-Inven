<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryOptimizationController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = auth()->user()->tenant_id;
        $products = Product::query()
            ->select(['id', 'name', 'sku', 'cost_price', 'rop', 'lead_time', 'created_at', 'status'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        $productIds = $products->pluck('id');

        $stockByProduct = DB::table('branch_product')
            ->select('product_id', DB::raw('SUM(stock) as stock'))
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id')
            ->pluck('stock', 'product_id');

        $dailySales = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('orders.status', 'completed')
            ->where('orders.created_at', '>=', now()->subDays(90))
            ->select(
                'order_items.product_id',
                DB::raw('DATE(orders.created_at) as sale_date'),
                DB::raw('SUM(order_items.quantity) as daily_qty')
            )
            ->groupBy('order_items.product_id', 'sale_date')
            ->get()
            ->groupBy('product_id');

        // Dynamic parameters from query or defaults
        $orderingCostInput = (float) $request->query('ordering_cost', 50000);
        $holdingCostRateInput = (float) $request->query('holding_cost_rate', 0.2); // 20%
        $leadTimeDaysInput = (int) $request->query('lead_time_days', 5); // default 5 days

        $items = $products->map(function (Product $product) use ($stockByProduct, $dailySales, $orderingCostInput, $holdingCostRateInput, $leadTimeDaysInput) {
            $productSales = $dailySales->get($product->id, collect());
            
            // 3. Active Days Calculation to prevent new/inactive product bias
            $firstSaleDate = $productSales->isNotEmpty() ? $productSales->min('sale_date') : null;
            $daysSinceFirstSale = $firstSaleDate ? (int) ceil(now()->diffInDays(\Carbon\Carbon::parse($firstSaleDate), true)) : 0;
            $daysSinceCreation = (int) ceil(now()->diffInDays($product->created_at, true));
            
            // Active days window is min 90, max of days since first sale or days since creation, but at least 1 day.
            $activeDays = (int) max(1, min(90, max($daysSinceFirstSale, $daysSinceCreation)));
            
            // Build daily sales array of size activeDays
            $salesArray = [];
            $salesByDate = $productSales->pluck('daily_qty', 'sale_date')->toArray();
            for ($i = 0; $i < $activeDays; $i++) {
                $dateStr = now()->subDays($i)->toDateString();
                $salesArray[] = (float) ($salesByDate[$dateStr] ?? 0.0);
            }
            
            $totalSold = array_sum($salesArray);
            $avgDailyUsage = $activeDays > 0 ? ($totalSold / $activeDays) : 0.0;
            
            // Calculate Standard Deviation of Daily Demand (sigma_d)
            $sigma = 0.0;
            if ($activeDays > 1) {
                $sumOfSquares = 0.0;
                foreach ($salesArray as $qty) {
                    $sumOfSquares += pow($qty - $avgDailyUsage, 2);
                }
                $sigma = sqrt($sumOfSquares / $activeDays);
            }

            // Lead Time spesifik per produk, fallback ke global input slider
            $leadTimeDays = $product->lead_time ?: $leadTimeDaysInput;
            $leadTimeDays = max(1, $leadTimeDays);

            // Annual Demand extrapolasi dari penjualan harian
            $annualDemand = max(1, (int) round($avgDailyUsage * 365));
            $currentStock = (int) ($stockByProduct[$product->id] ?? 0);
            $costPrice = max(1, (float) $product->cost_price);
            
            $orderingCost = $orderingCostInput;
            $holdingCostPerUnit = max(1, (int) round($costPrice * $holdingCostRateInput));
            
            // 1. EOQ Calculation
            $eoq = max(1, (int) round(sqrt((2 * $annualDemand * $orderingCost) / $holdingCostPerUnit)));
            
            // 2. Safety Stock Berbasis Statistik (Z-score 1.65 untuk service level 95%)
            $zScore = 1.65;
            $safetyStock = (int) ceil($zScore * $sigma * sqrt($leadTimeDays));
            
            // 3. ROP Calculation
            $calculatedRop = (int) ceil(($avgDailyUsage * $leadTimeDays) + $safetyStock);

            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku ?: "SKU-{$product->id}",
                'annualDemand' => $annualDemand,
                'orderingCost' => $orderingCost,
                'holdingCostPerUnit' => $holdingCostPerUnit,
                'eoq' => $eoq,
                'currentOrderQty' => max(1, ($product->rop * 2) ?: $currentStock ?: $eoq),
                'leadTimeDays' => $leadTimeDays,
                'hasCustomLeadTime' => !is_null($product->lead_time),
                'avgDailyUsage' => (float) round($avgDailyUsage, 2),
                'totalSold' => (int) $totalSold,
                'activeDays' => (int) $activeDays,
                'safetyStock' => $safetyStock,
                'rop' => (int) $product->rop,
                'suggested_rop' => $calculatedRop,
                'currentStock' => $currentStock,
            ];
        })->values();

        return response()->json($items);
    }

    /**
     * POST /api/inventory/optimization/apply
     * Applies ROP suggestions to products in bulk or individually.
     */
    public function apply(Request $request)
    {
        $validated = $request->validate([
            'products' => 'required|array',
            'products.*.id' => 'required|exists:products,id',
            'products.*.rop' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['products'] as $item) {
                Product::where('id', $item['id'])->update([
                    'rop' => $item['rop']
                ]);
            }

            DB::commit();

            return response()->json(['message' => 'Nilai ROP produk berhasil diperbarui.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menerapkan ROP.', 'error' => $e->getMessage()], 500);
        }
    }
}
