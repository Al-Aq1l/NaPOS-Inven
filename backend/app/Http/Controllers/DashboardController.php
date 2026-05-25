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
        $startOfMonth = $now->copy()->startOfMonth();
        $endOfMonth = $now->copy()->endOfMonth();
        $daysInMonth = $now->daysInMonth;

        $orderStats = Order::query()
            ->selectRaw('COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue')
            ->first();

        $trendRows = Order::query()
            ->selectRaw('DAY(created_at) as day, COALESCE(SUM(total_amount), 0) as total')
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->groupByRaw('DAY(created_at)')
            ->pluck('total', 'day');

        $salesTrend = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            $salesTrend[] = [
                'day' => $day,
                'total' => (float) ($trendRows[$day] ?? 0),
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
