<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use App\Models\Subscription;
use App\Models\Tenant;

class PaymentWebhookController extends Controller
{
    /**
     * Handle Midtrans payment notification webhook.
     */
    public function handle(Request $request)
    {
        // Validate Midtrans signature
        $serverKey   = config('services.midtrans.server_key');
        $orderId     = $request->order_id;
        $statusCode  = $request->status_code;
        $grossAmount = $request->gross_amount;

        $signatureKey = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);

        if ($signatureKey !== $request->signature_key) {
            Log::warning('Midtrans: invalid signature for order ' . $orderId);
            return response()->json(['message' => 'Invalid signature'], 403);
        }

        $subscription = Subscription::where('order_id', $orderId)->first();
        if (!$subscription) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        $transactionStatus = $request->transaction_status;
        $fraudStatus       = $request->fraud_status ?? 'accept';

        Log::info("Midtrans notification: order={$orderId}, status={$transactionStatus}, fraud={$fraudStatus}");

        if ($transactionStatus === 'capture' && $fraudStatus === 'accept') {
            $this->markPaid($subscription, $request);
        } elseif ($transactionStatus === 'settlement') {
            $this->markPaid($subscription, $request);
        } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'])) {
            $subscription->update(['status' => $transactionStatus]);
        } elseif ($transactionStatus === 'pending') {
            $subscription->update(['status' => 'pending']);
        }

        return response()->json(['message' => 'OK']);
    }

    private function markPaid(Subscription $subscription, Request $request): void
    {
        $subscription->update([
            'status'       => 'settlement',
            'payment_type' => $request->payment_type,
            'paid_at'      => now(),
            'expires_at'   => now()->addMonth(),
        ]);
    }
}
