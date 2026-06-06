<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Order;
use App\Models\Product;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function summary()
    {
        $now = Carbon::now();
        $startOfYear = $now->copy()->startOfYear();
        $endOfToday = $now->copy()->endOfDay();
        $currentMonth = $now->month;

        $orderStats = Order::query()
            ->selectRaw('COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue')
            ->first();

        $trendRows = Order::query()
            ->selectRaw('MONTH(created_at) as month, COALESCE(SUM(total_amount), 0) as total')
            ->whereBetween('created_at', [$startOfYear, $endOfToday])
            ->groupByRaw('MONTH(created_at)')
            ->pluck('total', 'month');

        $monthLabels = [1 => 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        $salesTrend = [];
        for ($month = 1; $month <= $currentMonth; $month++) {
            $salesTrend[] = [
                'month' => $month,
                'label' => $monthLabels[$month],
                'total' => (float) ($trendRows[$month] ?? 0),
            ];
        }

        $recentOrders = Order::query()
            ->select(['id', 'customer_name', 'total_amount', 'status', 'created_at'])
            ->withSum('items as item_count', 'quantity')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn ($order) => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'total_amount' => $order->total_amount,
                'status' => $order->status,
                'created_at' => $order->created_at,
                'item_count' => (int) ($order->item_count ?? 0),
            ]);

        $lowStock = Product::query()
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.rop',
            ])
            ->leftJoin('branch_product', 'products.id', '=', 'branch_product.product_id')
            ->selectRaw('COALESCE(SUM(branch_product.stock), 0) as stock')
            ->groupBy('products.id', 'products.name', 'products.sku', 'products.rop')
            ->havingRaw('COALESCE(SUM(branch_product.stock), 0) <= products.rop')
            ->orderBy('stock')
            ->limit(8)
            ->get()
            ->map(fn ($product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'rop' => (int) $product->rop,
                'stock' => (int) $product->stock,
            ]);

        return response()->json([
            'total_revenue' => (float) ($orderStats->total_revenue ?? 0),
            'total_orders' => (int) ($orderStats->total_orders ?? 0),
            'branch_count' => Branch::count(),
            'sales_trend' => $salesTrend,
            'recent_orders' => $recentOrders,
            'low_stock' => $lowStock,
        ]);
    }
}
