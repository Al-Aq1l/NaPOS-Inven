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
            ->select(['id', 'name', 'sku', 'cost_price', 'rop', 'status'])
            ->where('status', 'active')
            ->orderBy('name')
            ->get();

        $productIds = $products->pluck('id');

        $stockByProduct = DB::table('branch_product')
            ->select('product_id', DB::raw('SUM(stock) as stock'))
            ->whereIn('product_id', $productIds)
            ->groupBy('product_id')
            ->pluck('stock', 'product_id');

        $demandByProduct = OrderItem::query()
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.tenant_id', $tenantId)
            ->where('orders.status', 'completed')
            ->where('orders.created_at', '>=', now()->subDays(90))
            ->select('order_items.product_id', DB::raw('SUM(order_items.quantity) as quantity'))
            ->groupBy('order_items.product_id')
            ->pluck('quantity', 'product_id');

        // Dynamic parameters from query or defaults
        $orderingCostInput = (float) $request->query('ordering_cost', 50000);
        $holdingCostRateInput = (float) $request->query('holding_cost_rate', 0.2); // 20%
        $leadTimeDaysInput = (int) $request->query('lead_time_days', 5); // default 5 days

        $items = $products->map(function (Product $product) use ($stockByProduct, $demandByProduct, $orderingCostInput, $holdingCostRateInput, $leadTimeDaysInput) {
            $soldIn90Days = (int) ($demandByProduct[$product->id] ?? 0);
            $annualDemand = max(1, (int) round(($soldIn90Days / 90) * 365));
            $avgDailyUsage = max(1, (int) ceil($soldIn90Days / 90));
            $currentStock = (int) ($stockByProduct[$product->id] ?? 0);
            $costPrice = max(1, (float) $product->cost_price);
            
            $orderingCost = $orderingCostInput;
            $holdingCostPerUnit = max(1, (int) round($costPrice * $holdingCostRateInput));
            
            $eoq = max(1, (int) round(sqrt((2 * $annualDemand * $orderingCost) / $holdingCostPerUnit)));
            $leadTimeDays = max(1, $leadTimeDaysInput); // Hindari nol hari
            
            // Reorder point formula: (average daily usage * lead time) + safety stock
            // Safety stock secara sederhana diambil 50% dari kebutuhan waktu tunggu sebagai buffer
            $safetyStock = (int) ceil(($avgDailyUsage * $leadTimeDays) * 0.5);
            $calculatedRop = ($avgDailyUsage * $leadTimeDays) + $safetyStock;

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
                'avgDailyUsage' => $avgDailyUsage,
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
