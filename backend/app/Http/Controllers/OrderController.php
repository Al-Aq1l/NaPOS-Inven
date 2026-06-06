<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Branch;
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
            'items.*.discount_amount' => 'nullable|numeric|min:0',
        ]);

        $user = auth()->user();

        if ($user->role !== 'cashier') {
            return response()->json([
                'message' => 'Transaksi POS hanya dapat dibuat oleh akun kasir.',
            ], 403);
        }

        $branch = Branch::where('tenant_id', $user->tenant_id)->find($validated['branch_id']);

        if (! $branch) {
            return response()->json(['message' => 'Cabang tidak ditemukan untuk tenant ini.'], 422);
        }

        if ((int) $user->branch_id !== (int) $validated['branch_id']) {
            return response()->json([
                'message' => 'Kasir hanya dapat membuat transaksi pada cabang kerja yang ditetapkan owner.',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $itemsByProduct = collect($validated['items'])
                ->groupBy('product_id')
                ->map(fn ($items) => [
                    'quantity' => $items->sum('quantity'),
                    'discount_amount' => $items->sum(fn ($item) => (float) ($item['discount_amount'] ?? 0)),
                ]);

            $products = Product::whereIn('id', $itemsByProduct->keys())->get()->keyBy('id');
            $totalAmount = 0;
            $orderItemsData = [];

            foreach ($itemsByProduct as $productId => $itemData) {
                $quantity = (int) $itemData['quantity'];
                $product = $products->get((int) $productId);
                if (!$product) {
                    DB::rollBack();
                    return response()->json(['message' => 'Produk tidak ditemukan.'], 422);
                }

                $price = $product->sell_price;
                $grossSubtotal = $price * $quantity;
                $discountAmount = min($grossSubtotal, max(0, (float) $itemData['discount_amount']));
                $subtotal = $grossSubtotal - $discountAmount;

                $pivot = DB::table('branch_product')
                    ->where('branch_id', $validated['branch_id'])
                    ->where('product_id', $product->id)
                    ->lockForUpdate()
                    ->first();

                $currentStock = $pivot ? (int) $pivot->stock : 0;
                if ($currentStock < $quantity) {
                    DB::rollBack();
                    return response()->json([
                        'message' => "Stok {$product->name} di cabang ini tidak cukup.",
                        'available_stock' => $currentStock,
                        'requested_quantity' => $quantity,
                    ], 422);
                }
                
                $totalAmount += $subtotal;

                $orderItemsData[] = [
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'price' => $price,
                    'subtotal' => $subtotal,
                ];

                DB::table('branch_product')
                    ->where('id', $pivot->id)
                    ->update([
                        'stock' => $currentStock - $quantity,
                        'updated_at' => now(),
                    ]);
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
