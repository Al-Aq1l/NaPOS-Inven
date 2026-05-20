<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use Illuminate\Http\Request;

class BillingController extends Controller
{
    /**
     * GET /api/billing — Get current tenant billing info.
     */
    public function index()
    {
        $tenant = auth()->user()->tenant;

        $planLimits = $this->getPlanLimits($tenant->plan);

        return response()->json([
            'tenant_id'   => $tenant->id,
            'plan'        => $tenant->plan,
            'is_active'   => $tenant->is_active,
            'trial_ends_at' => $tenant->trial_ends_at,
            'limits'      => $planLimits,
        ]);
    }

    /**
     * POST /api/billing/upgrade — Simulate plan upgrade (instant).
     */
    public function upgrade(Request $request)
    {
        $validated = $request->validate([
            'plan' => 'required|in:starter,basic,growth,business',
        ]);

        $tenant = auth()->user()->tenant;
        $oldPlan = $tenant->plan;
        $tenant->update(['plan' => $validated['plan']]);

        return response()->json([
            'message'  => "Paket berhasil diubah dari {$oldPlan} ke {$validated['plan']}.",
            'plan'     => $validated['plan'],
            'limits'   => $this->getPlanLimits($validated['plan']),
        ]);
    }

    /**
     * Get plan-specific feature limits.
     */
    private function getPlanLimits(string $plan): array
    {
        $plans = [
            'starter' => [
                'max_sku'      => 30,
                'max_branches' => 1,
                'max_users'    => 1,
                'features'     => ['pos', 'basic_inventory'],
            ],
            'basic' => [
                'max_sku'      => 500,
                'max_branches' => 1,
                'max_users'    => 2,
                'features'     => ['pos', 'basic_inventory', 'stock_transfer'],
            ],
            'growth' => [
                'max_sku'      => 5000,
                'max_branches' => 5,
                'max_users'    => 10,
                'features'     => ['pos', 'basic_inventory', 'stock_transfer', 'optimization', 'opname', 'analytics'],
            ],
            'business' => [
                'max_sku'      => 999999,
                'max_branches' => 999,
                'max_users'    => 999,
                'features'     => ['pos', 'basic_inventory', 'stock_transfer', 'optimization', 'opname', 'analytics', 'omnichannel', 'api_access'],
            ],
        ];

        return $plans[$plan] ?? $plans['starter'];
    }
}
