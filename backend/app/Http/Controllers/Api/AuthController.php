<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Tenant;
use App\Models\Subscription;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;
use Midtrans\Config as MidtransConfig;
use Midtrans\Snap;

class AuthController extends Controller
{
    /** Plan pricing in IDR */
    private const PLAN_PRICES = [
        'monthly' => [
            'starter'  => 0,
            'basic'    => 45000,
            'growth'   => 95000,
            'business' => 195000,
        ],
        'annual' => [
            'starter'  => 0,
            'basic'    => 432000,   // 45000 * 12 * 0.8
            'growth'   => 912000,   // 95000 * 12 * 0.8
            'business' => 1872000,  // 195000 * 12 * 0.8
        ],
    ];

    public function register(Request $request)
    {
        $request->validate([
            'business_name' => 'required|string|max:255',
            'name'          => 'required|string|max:255',
            'email'         => 'required|string|email|max:255|unique:users',
            'password'      => 'required|string|min:8',
            'plan'          => 'required|string|in:starter,basic,growth,business',
            'billing_cycle' => 'nullable|string|in:monthly,annual',
        ]);

        $tenant = Tenant::create([
            'name' => $request->business_name,
            'slug' => Str::slug($request->business_name) . '-' . Str::random(6),
            'plan' => 'starter',
        ]);

        $user = User::create([
            'tenant_id' => $tenant->id,
            'name'      => $request->name,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'role'      => 'owner',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        $plan         = strtolower($request->plan);
        $billingCycle = strtolower($request->billing_cycle ?? 'monthly');
        $amount       = self::PLAN_PRICES[$billingCycle][$plan] ?? 0;
        $snapToken    = null;
        $orderId   = null;

        if ($amount > 0) {
            // Configure Midtrans
            MidtransConfig::$serverKey    = config('services.midtrans.server_key');
            MidtransConfig::$isProduction = !config('services.midtrans.is_sandbox');
            MidtransConfig::$isSanitized  = true;
            MidtransConfig::$is3ds        = true;

            $orderId = 'NAPOS-' . strtoupper($plan) . '-' . $user->id . '-' . time();

            $params = [
                'transaction_details' => [
                    'order_id'     => $orderId,
                    'gross_amount' => $amount,
                ],
                'customer_details' => [
                    'first_name' => $user->name,
                    'email'      => $user->email,
                ],
                'item_details' => [[
                    'id'       => $plan . '_' . $billingCycle,
                    'price'    => $amount,
                    'quantity' => 1,
                    'name'     => 'NaPOS Paket ' . ucfirst($plan) . ' (' . ($billingCycle === 'annual' ? '1 Tahun' : '1 Bulan') . ')',
                ]],
                'enabled_payments' => [
                    'gopay',
                    'dana',
                    'qris',
                    'bca_va',
                    'bni_va',
                    'bri_va',
                    'other_va',
                    'permata_va',
                ],
                'gopay'  => ['enable_callback' => false],
                'qris'   => ['acquirer' => 'gopay'],
            ];

            $snapToken = Snap::getSnapToken($params);

            Subscription::create([
                'tenant_id'     => $tenant->id,
                'user_id'       => $user->id,
                'plan'          => $plan,
                'billing_cycle' => $billingCycle,
                'order_id'      => $orderId,
                'amount'        => $amount,
                'snap_token'    => $snapToken,
                'status'        => 'pending',
            ]);
        } else {
            // Free Starter plan
            Subscription::create([
                'tenant_id'     => $tenant->id,
                'user_id'       => $user->id,
                'plan'          => 'starter',
                'billing_cycle' => $billingCycle,
                'order_id'      => 'FREE-' . $user->id,
                'amount'        => 0,
                'status'        => 'settlement',
                'paid_at'       => now(),
            ]);
        }

        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user->load(['tenant', 'branch']),
            'snap_token'   => $snapToken,
            'order_id'     => $orderId ?? null,
            'plan'         => $plan,
        ]);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial yang diberikan tidak cocok dengan data kami.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type'   => 'Bearer',
            'user'         => $user->load(['tenant', 'branch']),
        ]);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['tenant', 'branch']);

        // Auto-verify any pending subscriptions with Midtrans to handle delayed webhooks
        // especially useful on localhost where webhooks cannot reach the app
        $pendingSub = \App\Models\Subscription::where('tenant_id', $user->tenant_id)
            ->where('status', 'pending')
            ->first();

        if ($pendingSub) {
            try {
                \Midtrans\Config::$serverKey = config('services.midtrans.server_key');
                \Midtrans\Config::$isProduction = !config('services.midtrans.is_sandbox');
                
                $status = \Midtrans\Transaction::status($pendingSub->order_id);
                $transactionStatus = $status->transaction_status ?? null;
                $fraudStatus = $status->fraud_status ?? 'accept';

                if (in_array($transactionStatus, ['capture', 'settlement']) && $fraudStatus === 'accept') {
                    $expiresAt = $pendingSub->billing_cycle === 'annual' 
                        ? now()->addYear() 
                        : now()->addMonth();

                    $pendingSub->update([
                        'status'       => 'settlement',
                        'payment_type' => $status->payment_type ?? null,
                        'paid_at'      => now(),
                        'expires_at'   => $expiresAt,
                    ]);

                    if ($user->tenant) {
                        $user->tenant->update(['plan' => $pendingSub->plan]);
                        $user->refresh();
                        $user->load(['tenant', 'branch']); // Reload tenant with new plan
                    }
                }
            } catch (\Exception $e) {
                // Ignore errors (e.g., Midtrans Sandbox offline)
            }
        }

        return response()->json([
            'user' => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }
}
