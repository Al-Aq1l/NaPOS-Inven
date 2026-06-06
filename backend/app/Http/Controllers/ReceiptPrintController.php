<?php

namespace App\Http\Controllers;

use App\Services\EscPosReceiptPrinter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class ReceiptPrintController extends Controller
{
    public function store(Request $request, EscPosReceiptPrinter $printer): JsonResponse
    {
        $validated = $request->validate([
            'receipt_id' => 'required|string|max:80',
            'receipt_time' => 'required|string|max:80',
            'branch_name' => 'required|string|max:120',
            'cashier_name' => 'nullable|string|max:120',
            'customer_name' => 'nullable|string|max:120',
            'payment_method_label' => 'required|string|max:40',
            'cash_paid' => 'nullable|integer|min:0',
            'change' => 'nullable|integer|min:0',
            'subtotal' => 'required|integer|min:0',
            'tax' => 'required|integer|min:0',
            'total' => 'required|integer|min:0',
            'is_offline' => 'boolean',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:160',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|integer|min:0',
            'items.*.discount_amount' => 'nullable|integer|min:0',
            'items.*.subtotal' => 'required|integer|min:0',
        ]);

        try {
            $printer->print($validated);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json([
                'message' => 'Gagal mencetak struk ESC/POS.',
                'error' => $exception->getMessage(),
            ], 500);
        }

        return response()->json(['message' => 'Struk dikirim ke printer.']);
    }
}
