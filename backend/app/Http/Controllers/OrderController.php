<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Branch;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    public function index()
    {
        return response()->json(Order::with(['branch', 'user', 'items.product'])->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|exists:branches,id',
            'customer_name' => 'nullable|string|max:255',
            'payment_method' => 'required|in:cash,qris,transfer',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $totalAmount = 0;
            $orderItemsData = [];

            foreach ($validated['items'] as $item) {
                $product = Product::findOrFail($item['product_id']);
                $price = $product->sell_price;
                $subtotal = $price * $item['quantity'];
                
                $totalAmount += $subtotal;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'price' => $price,
                    'subtotal' => $subtotal,
                ];

                // Reduce stock at the specific branch
                $branchProduct = $product->branches()->where('branch_id', $validated['branch_id'])->first();
                if ($branchProduct) {
                    $newStock = $branchProduct->pivot->stock - $item['quantity'];
                    $product->branches()->updateExistingPivot($validated['branch_id'], ['stock' => $newStock]);
                } else {
                    // Create entry if it doesn't exist (e.g. stock goes negative)
                    $product->branches()->attach($validated['branch_id'], ['stock' => -$item['quantity']]);
                }
            }

            $order = Order::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => auth()->id(),
                'customer_name' => $validated['customer_name'] ?? null,
                'total_amount' => $totalAmount,
                'payment_method' => $validated['payment_method'],
                'status' => 'completed',
            ]);

            foreach ($orderItemsData as $data) {
                $order->items()->create($data);
            }

            DB::commit();

            return response()->json($order->load(['items.product']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Transaction failed', 'error' => $e->getMessage()], 500);
        }
    }

    public function show(Order $order)
    {
        return response()->json($order->load(['branch', 'user', 'items.product']));
    }
}
