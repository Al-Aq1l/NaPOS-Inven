<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Product;
use App\Models\Branch;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    /**
     * Endpoint analitik agregat — menghitung semua metrik di sisi server
     * untuk menghindari N+1 problem dan kalkulasi berat di browser.
     */
    public function index(Request $request)
    {
        $user = auth()->user();
        $tenantId = $user->tenant_id;
        $branchId = $request->query('branch_id');
        $range = $request->query('range', 'month'); // 7d, 30d, month, year

        $now = Carbon::now();

        // Tentukan rentang tanggal berdasarkan filter
        $startDate = match ($range) {
            '7d'    => $now->copy()->subDays(7)->startOfDay(),
            '30d'   => $now->copy()->subDays(30)->startOfDay(),
            'month' => $now->copy()->startOfMonth(),
            'year'  => $now->copy()->startOfYear(),
            default => $now->copy()->startOfMonth(),
        };

        // ============================
        // 1. Metrik Agregat Utama
        // ============================
        $metricsQuery = Order::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $now]);

        if ($branchId) {
            $metricsQuery->where('branch_id', $branchId);
        }

        $metrics = $metricsQuery
            ->selectRaw('
                COUNT(*) as total_transactions,
                COALESCE(SUM(total_amount), 0) as total_revenue,
                COUNT(DISTINCT NULLIF(customer_name, "")) as unique_customers
            ')
            ->first();

        // HPP dari order_items (menggunakan cost_price snapshot jika tersedia)
        $hppQuery = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.tenant_id', $tenantId)
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$startDate, $now]);

        if ($branchId) {
            $hppQuery->where('orders.branch_id', $branchId);
        }

        $hppResult = $hppQuery
            ->selectRaw('COALESCE(SUM(
                CASE
                    WHEN order_items.cost_price > 0 THEN order_items.cost_price * order_items.quantity
                    ELSE 0
                END
            ), 0) as total_hpp')
            ->first();

        $totalRevenue = (float) ($metrics->total_revenue ?? 0);
        $totalTransactions = (int) ($metrics->total_transactions ?? 0);
        $totalHpp = (float) ($hppResult->total_hpp ?? 0);
        $totalMargin = $totalRevenue - $totalHpp;
        $avgBasket = $totalTransactions > 0 ? round($totalRevenue / $totalTransactions) : 0;
        $uniqueCustomers = (int) ($metrics->unique_customers ?? 0);

        // ============================
        // 2. Valuasi Stok (Modal Stok)
        // ============================
        $stockQuery = DB::table('products')
            ->where('products.tenant_id', $tenantId)
            ->leftJoin('branch_product', 'products.id', '=', 'branch_product.product_id');

        if ($branchId) {
            $stockQuery->where('branch_product.branch_id', $branchId);
        }

        $stockValuation = (float) $stockQuery
            ->selectRaw('COALESCE(SUM(products.cost_price * branch_product.stock), 0) as valuation')
            ->value('valuation');

        // ============================
        // 3. Tren Penjualan (per hari/bulan)
        // ============================
        $trendQuery = Order::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $now]);

        if ($branchId) {
            $trendQuery->where('branch_id', $branchId);
        }

        if (in_array($range, ['7d', '30d', 'month'])) {
            // Trend harian
            $trendRows = $trendQuery
                ->selectRaw('DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as orders')
                ->groupByRaw('DATE(created_at)')
                ->get()
                ->keyBy('date');

            $salesTrend = [];
            for ($date = $startDate->copy(); $date->lte($now); $date->addDay()) {
                $dateKey = $date->toDateString();
                $salesTrend[] = [
                    'date' => $dateKey,
                    'label' => $date->format('d M'),
                    'total' => (float) ($trendRows[$dateKey]->total ?? 0),
                    'orders' => (int) ($trendRows[$dateKey]->orders ?? 0),
                ];
            }
        } else {
            // Trend bulanan (untuk range 'year')
            $trendRows = $trendQuery
                ->selectRaw('MONTH(created_at) as month, COALESCE(SUM(total_amount), 0) as total, COUNT(*) as orders')
                ->groupByRaw('MONTH(created_at)')
                ->get()
                ->keyBy('month');

            $monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            $salesTrend = [];
            for ($m = 1; $m <= $now->month; $m++) {
                $salesTrend[] = [
                    'date' => $now->year . '-' . str_pad($m, 2, '0', STR_PAD_LEFT),
                    'label' => $monthLabels[$m - 1],
                    'total' => (float) ($trendRows[$m]->total ?? 0),
                    'orders' => (int) ($trendRows[$m]->orders ?? 0),
                ];
            }
        }

        // ============================
        // 4. Distribusi Jam Ramai
        // ============================
        $hourlyQuery = Order::query()
            ->where('status', 'completed')
            ->whereBetween('created_at', [$startDate, $now]);

        if ($branchId) {
            $hourlyQuery->where('branch_id', $branchId);
        }

        $hourlyRows = $hourlyQuery
            ->selectRaw('HOUR(created_at) as hour, COUNT(*) as count')
            ->groupByRaw('HOUR(created_at)')
            ->get()
            ->keyBy('hour');

        $hourlyData = [];
        for ($h = 6; $h <= 21; $h++) {
            $hourlyData[] = [
                'hour' => $h,
                'count' => (int) ($hourlyRows[$h]->count ?? 0),
            ];
        }

        // ============================
        // 5. Top Produk
        // ============================
        $topQuery = DB::table('order_items')
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->join('products', 'products.id', '=', 'order_items.product_id')
            ->where('orders.tenant_id', $tenantId)
            ->where('orders.status', 'completed')
            ->whereBetween('orders.created_at', [$startDate, $now]);

        if ($branchId) {
            $topQuery->where('orders.branch_id', $branchId);
        }

        $topProducts = $topQuery
            ->select('products.id', 'products.name')
            ->selectRaw('SUM(order_items.quantity) as qty, MAX(order_items.price) as price')
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('qty')
            ->limit(20)
            ->get()
            ->map(fn ($p) => [
                'name' => $p->name,
                'qty' => (int) $p->qty,
                'price' => (float) $p->price,
            ]);

        // ============================
        // 6. Kategori Produk
        // ============================
        $categoryData = Product::query()
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id')
            ->selectRaw('COALESCE(categories.name, "Lainnya") as category_name, COUNT(*) as count')
            ->groupByRaw('COALESCE(categories.name, "Lainnya")')
            ->orderByDesc('count')
            ->limit(6)
            ->get()
            ->map(fn ($c) => [
                'name' => $c->category_name,
                'count' => (int) $c->count,
            ]);

        // ============================
        // 7. Stok Kritis (di bawah ROP)
        // ============================
        $lowStockQuery = Product::query()
            ->where('products.tenant_id', $tenantId)
            ->leftJoin('branch_product', 'products.id', '=', 'branch_product.product_id')
            ->leftJoin('categories', 'products.category_id', '=', 'categories.id');

        if ($branchId) {
            $lowStockQuery->where('branch_product.branch_id', $branchId);
        }

        $lowStockProducts = $lowStockQuery
            ->select('products.id', 'products.name', 'products.sku', 'products.rop', 'categories.name as category_name')
            ->selectRaw('COALESCE(SUM(branch_product.stock), 0) as stock')
            ->groupBy('products.id', 'products.name', 'products.sku', 'products.rop', 'categories.name')
            ->havingRaw('COALESCE(SUM(branch_product.stock), 0) <= products.rop')
            ->orderBy('stock')
            ->limit(20)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'rop' => (int) $p->rop,
                'stock' => (int) $p->stock,
                'category_name' => $p->category_name,
            ]);

        return response()->json([
            // Metrik utama
            'total_revenue' => $totalRevenue,
            'total_transactions' => $totalTransactions,
            'total_hpp' => $totalHpp,
            'total_margin' => $totalMargin,
            'avg_basket' => $avgBasket,
            'unique_customers' => $uniqueCustomers,
            'stock_valuation' => $stockValuation,

            // Grafik
            'sales_trend' => $salesTrend,
            'hourly_data' => $hourlyData,
            'top_products' => $topProducts,
            'category_data' => $categoryData,
            'low_stock_products' => $lowStockProducts,
        ]);
    }
}
