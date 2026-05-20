<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\StockReceipt;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockReceiptController extends Controller
{
    public function index()
    {
        $receipts = StockReceipt::with(['branch', 'user', 'items.product'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($receipts);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'supplier_name' => 'nullable|string|max:255',
            'reference_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string|max:500',
            'update_cost_price' => 'boolean',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            $receipt = StockReceipt::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => auth()->id(),
                'supplier_name' => $validated['supplier_name'] ?? null,
                'reference_number' => $validated['reference_number'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'total_cost' => 0,
            ]);

            $totalCost = 0;
            $itemsByProduct = collect($validated['items'])
                ->groupBy('product_id')
                ->map(function ($items) {
                    return [
                        'quantity' => $items->sum('quantity'),
                        'unit_cost' => (float) ($items->last()['unit_cost'] ?? 0),
                    ];
                });

            $products = Product::whereIn('id', $itemsByProduct->keys())->get()->keyBy('id');

            foreach ($itemsByProduct as $productId => $item) {
                $product = $products->get((int) $productId);
                if (!$product) {
                    DB::rollBack();
                    return response()->json(['message' => 'Produk tidak ditemukan.'], 422);
                }

                $unitCost = $item['unit_cost'] > 0 ? $item['unit_cost'] : (float) $product->cost_price;
                $quantity = (int) $item['quantity'];
                $subtotal = $quantity * $unitCost;

                $pivot = DB::table('branch_product')
                    ->where('branch_id', $validated['branch_id'])
                    ->where('product_id', $product->id)
                    ->lockForUpdate()
                    ->first();

                $stockBefore = $pivot ? (int) $pivot->stock : 0;
                $stockAfter = $stockBefore + $quantity;

                if ($pivot) {
                    DB::table('branch_product')
                        ->where('id', $pivot->id)
                        ->update([
                            'stock' => $stockAfter,
                            'updated_at' => now(),
                        ]);
                } else {
                    DB::table('branch_product')->insert([
                        'branch_id' => $validated['branch_id'],
                        'product_id' => $product->id,
                        'stock' => $stockAfter,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                if (($validated['update_cost_price'] ?? false) && $unitCost > 0) {
                    $product->update(['cost_price' => $unitCost]);
                }

                $receipt->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_cost' => $unitCost,
                    'subtotal' => $subtotal,
                    'stock_before' => $stockBefore,
                    'stock_after' => $stockAfter,
                ]);

                $totalCost += $subtotal;
            }

            $receipt->update(['total_cost' => $totalCost]);

            DB::commit();

            return response()->json($receipt->load(['branch', 'user', 'items.product']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal menyimpan penerimaan stok.', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(StockReceipt $stockReceipt)
    {
        return response()->json($stockReceipt->load(['branch', 'user', 'items.product']));
    }
}
