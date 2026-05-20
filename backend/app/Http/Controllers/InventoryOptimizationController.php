<?php

namespace App\Http\Controllers;

use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class InventoryOptimizationController extends Controller
{
    public function index()
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

        $items = $products->map(function (Product $product) use ($stockByProduct, $demandByProduct) {
            $soldIn90Days = (int) ($demandByProduct[$product->id] ?? 0);
            $annualDemand = max(1, (int) round(($soldIn90Days / 90) * 365));
            $avgDailyUsage = max(1, (int) ceil($soldIn90Days / 90));
            $currentStock = (int) ($stockByProduct[$product->id] ?? 0);
            $costPrice = max(1, (float) $product->cost_price);
            $orderingCost = 50000;
            $holdingCostPerUnit = max(1, (int) round($costPrice * 0.2));
            $eoq = max(1, (int) round(sqrt((2 * $annualDemand * $orderingCost) / $holdingCostPerUnit)));
            $leadTimeDays = 5;
            $safetyStock = max(0, (int) $product->rop - ($avgDailyUsage * $leadTimeDays));

            return [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku ?: "SKU-{$product->id}",
                'annualDemand' => $annualDemand,
                'PesananingCost' => $orderingCost,
                'holdingCostPerUnit' => $holdingCostPerUnit,
                'eoq' => $eoq,
                'currentPesananQty' => max(1, ($product->rop * 2) ?: $currentStock ?: $eoq),
                'leadWaktuDays' => $leadTimeDays,
                'avgDailyUsage' => $avgDailyUsage,
                'safetyStock' => $safetyStock,
                'rop' => (int) $product->rop,
                'currentStock' => $currentStock,
            ];
        })->values();

        return response()->json($items);
    }
}
