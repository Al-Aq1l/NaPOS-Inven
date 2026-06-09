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
        $trendStart = $now->copy()->startOfMonth();
        $endOfToday = $now->copy()->endOfDay();

        $orderStats = Order::query()
            ->selectRaw('COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue')
            ->first();

        $todayStats = Order::query()
            ->whereBetween('created_at', [$now->copy()->startOfDay(), $endOfToday])
            ->selectRaw('COUNT(*) as today_orders, COALESCE(SUM(total_amount), 0) as today_revenue')
            ->first();

        $trendRows = Order::query()
            ->selectRaw('DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as orders')
            ->whereBetween('created_at', [$trendStart, $endOfToday])
            ->groupByRaw('DATE(created_at)')
            ->get()
            ->keyBy('date');

        $salesTrend = [];
        for ($date = $trendStart->copy(); $date->lte($endOfToday); $date->addDay()) {
            $dateKey = $date->toDateString();
            $salesTrend[] = [
                'date' => $dateKey,
                'label' => $date->format('M d'),
                'total' => (float) ($trendRows[$dateKey]->total ?? 0),
                'orders' => (int) ($trendRows[$dateKey]->orders ?? 0),
            ];
        }

        $recentOrders = Order::query()
            ->select(['id', 'customer_name', 'total_amount', 'status', 'payment_method', 'created_at'])
            ->withSum('items as item_count', 'quantity')
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn ($order) => [
                'id' => $order->id,
                'customer_name' => $order->customer_name,
                'total_amount' => $order->total_amount,
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'created_at' => $order->created_at,
                'item_count' => (int) ($order->item_count ?? 0),
            ]);

        $lowStock = Product::query()
            ->select([
                'products.id',
                'products.name',
                'products.sku',
                'products.rop',
                'categories.name as category_name',
            ])
            ->leftJoin('branch_product', 'products.id', '=', 'branch_product.product_id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->selectRaw('COALESCE(SUM(branch_product.stock), 0) as stock')
            ->groupBy('products.id', 'products.name', 'products.sku', 'products.rop', 'categories.name')
            ->havingRaw('COALESCE(SUM(branch_product.stock), 0) <= products.rop')
            ->orderBy('stock')
            ->limit(8)
            ->get()
            ->map(fn ($product) => [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'category_name' => $product->category_name,
                'rop' => (int) $product->rop,
                'stock' => (int) $product->stock,
            ]);

        return response()->json([
            'total_revenue' => (float) ($orderStats->total_revenue ?? 0),
            'total_orders' => (int) ($orderStats->total_orders ?? 0),
            'today_revenue' => (float) ($todayStats->today_revenue ?? 0),
            'today_orders' => (int) ($todayStats->today_orders ?? 0),
            'branch_count' => Branch::count(),
            'product_count' => Product::where('status', 'active')->count(),
            'sales_trend' => $salesTrend,
            'recent_orders' => $recentOrders,
            'low_stock' => $lowStock,
        ]);
    }
}
