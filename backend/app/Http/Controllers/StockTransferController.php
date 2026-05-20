<?php

namespace App\Http\Controllers;

use App\Models\StockTransfer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockTransferController extends Controller
{
    /**
     * GET /api/transfers — List all stock transfers for the tenant.
     */
    public function index()
    {
        $transfers = StockTransfer::with(['fromBranch', 'toBranch', 'user', 'items.product'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json($transfers);
    }

    /**
     * POST /api/transfers — Create a new stock transfer (status: draft).
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'from_branch_id' => 'required|exists:branches,id',
            'to_branch_id'   => 'required|exists:branches,id|different:from_branch_id',
            'notes'          => 'nullable|string|max:500',
            'items'          => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity'   => 'required|integer|min:1',
        ]);

        try {
            DB::beginTransaction();

            $transfer = StockTransfer::create([
                'from_branch_id' => $validated['from_branch_id'],
                'to_branch_id'   => $validated['to_branch_id'],
                'user_id'        => auth()->id(),
                'status'         => 'draft',
                'notes'          => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $item) {
                $transfer->items()->create([
                    'product_id' => $item['product_id'],
                    'quantity'   => $item['quantity'],
                ]);
            }

            DB::commit();

            return response()->json($transfer->load(['fromBranch', 'toBranch', 'items.product']), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal membuat transfer stok.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * GET /api/transfers/{id} — Show a single transfer.
     */
    public function show(StockTransfer $transfer)
    {
        return response()->json($transfer->load(['fromBranch', 'toBranch', 'user', 'items.product']));
    }

    /**
     * PUT /api/transfers/{transfer}/status — Advance the transfer status.
     *
     * Allowed transitions:
     *   draft → in-transit   (no stock mutation yet)
     *   in-transit → received (subtract from_branch, add to_branch)
     */
    public function updateStatus(Request $request, StockTransfer $transfer)
    {
        $validated = $request->validate([
            'status' => 'required|in:in-transit,received',
        ]);

        $newStatus = $validated['status'];

        // Validate allowed transitions
        $allowedTransitions = [
            'draft'      => 'in-transit',
            'in-transit' => 'received',
        ];

        if (!isset($allowedTransitions[$transfer->status]) || $allowedTransitions[$transfer->status] !== $newStatus) {
            return response()->json([
                'message' => "Transisi status tidak valid: {$transfer->status} → {$newStatus}",
            ], 422);
        }

        try {
            DB::beginTransaction();

            // When transitioning to "received", mutate the branch_product pivot stock
            if ($newStatus === 'received') {
                $transfer->load('items');

                foreach ($transfer->items as $item) {
                    $fromPivot = DB::table('branch_product')
                        ->where('branch_id', $transfer->from_branch_id)
                        ->where('product_id', $item->product_id)
                        ->lockForUpdate()
                        ->first();

                    $fromStock = $fromPivot ? (int) $fromPivot->stock : 0;
                    if ($fromStock < $item->quantity) {
                        DB::rollBack();
                        return response()->json([
                            'message' => 'Stok cabang asal tidak cukup untuk menerima transfer ini.',
                            'product_id' => $item->product_id,
                            'available_stock' => $fromStock,
                            'requested_quantity' => $item->quantity,
                        ], 422);
                    }

                    DB::table('branch_product')
                        ->where('id', $fromPivot->id)
                        ->update([
                            'stock' => $fromStock - $item->quantity,
                            'updated_at' => now(),
                        ]);

                    $toPivot = DB::table('branch_product')
                        ->where('branch_id', $transfer->to_branch_id)
                        ->where('product_id', $item->product_id)
                        ->lockForUpdate()
                        ->first();

                    if ($toPivot) {
                        DB::table('branch_product')
                            ->where('id', $toPivot->id)
                            ->update([
                                'stock' => ((int) $toPivot->stock) + $item->quantity,
                                'updated_at' => now(),
                            ]);
                    } else {
                        DB::table('branch_product')->insert([
                            'branch_id' => $transfer->to_branch_id,
                            'product_id' => $item->product_id,
                            'stock' => $item->quantity,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            }

            $transfer->update(['status' => $newStatus]);

            DB::commit();

            return response()->json($transfer->load(['fromBranch', 'toBranch', 'items.product']));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Gagal memperbarui status transfer.', 'error' => $e->getMessage()], 500);
        }
    }
}
