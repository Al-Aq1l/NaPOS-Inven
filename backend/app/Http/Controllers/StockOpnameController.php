<?php

namespace App\Http\Controllers;

use App\Models\StockOpname;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockOpnameController extends Controller
{
    /**
     * GET /api/stock-opname — List all opnames for the tenant.
     */
    public function index()
    {
        $opnames = StockOpname::with(['branch', 'user', 'items.product'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($opnames);
    }

    /**
     * POST /api/stock-opname — Create a completed stock opname.
     *
     * Accepts branch_id and array of items with product_id and physical_stock.
     * Automatically calculates system_stock from branch_product pivot,
     * computes variance, and adjusts pivot stock to match physical count.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'notes'     => 'nullable|string|max:500',
            'items'     => 'required|array|min:1',
            'items.*.product_id'    => 'required|exists:products,id',
            'items.*.physical_stock' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            $opname = StockOpname::create([
                'branch_id' => $validated['branch_id'],
                'user_id'   => auth()->id(),
                'status'    => 'completed',
                'notes'     => $validated['notes'] ?? null,
            ]);

            $varianceReport = [];

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);

                // Get current system stock at this branch
                $pivot = $product->branches()->where('branch_id', $validated['branch_id'])->first();
                $systemStock = $pivot ? $pivot->pivot->stock : 0;
                $physicalStock = $item['physical_stock'];
                $variance = $physicalStock - $systemStock;

                $opname->items()->create([
                    'product_id'     => $product->id,
                    'system_stock'   => $systemStock,
                    'physical_stock' => $physicalStock,
                    'variance'       => $variance,
                ]);

                // Adjust actual stock in branch_product pivot to match physical count
                if ($pivot) {
                    $product->branches()->updateExistingPivot($validated['branch_id'], ['stock' => $physicalStock]);
                } else {
                    $product->branches()->attach($validated['branch_id'], ['stock' => $physicalStock]);
                }

                $varianceReport[] = [
                    'product_id'     => $product->id,
                    'product_name'   => $product->name,
                    'sku'            => $product->sku,
                    'system_stock'   => $systemStock,
                    'physical_stock' => $physicalStock,
                    'variance'       => $variance,
                    'value_impact'   => $variance * (float) $product->cost_price,
                ];
            }

            DB::commit();

            return response()->json([
                'opname'          => $opname->load(['branch', 'items.product']),
                'variance_report' => $varianceReport,
                'total_variance_value' => array_sum(array_column($varianceReport, 'value_impact')),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan stock opname.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/stock-opname/{id} — Show a single opname with variance report.
     */
    public function show(StockOpname $stockOpname)
    {
        return response()->json($stockOpname->load(['branch', 'user', 'items.product']));
    }
}
