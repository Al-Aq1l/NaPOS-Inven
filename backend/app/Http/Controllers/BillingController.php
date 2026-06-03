<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\Product;
use App\Models\User;
use App\Services\PlanLimits;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    /**
     * GET /api/billing — Get current tenant billing info.
     */
    public function index()
    {
        $tenant = auth()->user()->tenant;

        $planLimits = PlanLimits::forPlan($tenant->plan);

        return response()->json([
            'tenant_id'   => $tenant->id,
            'plan'        => $tenant->plan,
            'is_active'   => $tenant->is_active,
            'trial_ends_at' => $tenant->trial_ends_at,
            'limits'      => $planLimits,
            'usage'       => [
                'sku' => Product::count(),
                'branches' => Branch::count(),
                'users' => User::where('tenant_id', $tenant->id)->count(),
            ],
        ]);
    }

    /**
     * POST /api/billing/upgrade — Request a plan change.
     *
     * The active tenant plan is intentionally not changed here. Actual plan
     * changes should happen through payment/admin approval or a billing webhook.
     */
    public function upgrade(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|in:' . PlanLimits::planKeys(),
        ]);

        $tenant = auth()->user()->tenant;
        if ($validated['plan'] === $tenant->plan) {
            return response()->json([
                'message' => 'Paket ini sudah aktif.',
                'plan' => $tenant->plan,
                'limits' => PlanLimits::forPlan($tenant->plan),
            ], 422);
        }

        return response()->json([
            'message' => "Permintaan perubahan paket ke {$validated['plan']} sudah diterima. Paket aktif belum berubah sampai pembayaran atau approval selesai.",
            'requested_plan' => $validated['plan'],
            'current_plan' => $tenant->plan,
            'status' => 'pending',
            'limits' => PlanLimits::forPlan($tenant->plan),
        ]);
    }
}
