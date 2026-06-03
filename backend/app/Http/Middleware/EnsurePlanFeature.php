<?php

namespace App\Http\Middleware;

use App\Services\PlanLimits;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePlanFeature
{
    public function handle(Request $request, Closure $next, string $feature): Response
    {
        $tenant = $request->user()?->tenant;
        if (! $tenant) {
            return response()->json(['message' => 'Tenant tidak ditemukan.'], 403);
        }

        $limits = PlanLimits::forPlan($tenant->plan);
        if (! in_array($feature, $limits['features'], true)) {
            return response()->json([
                'message' => 'Fitur ini tidak tersedia pada paket langganan aktif. Ajukan upgrade paket untuk membuka fitur ini.',
                'feature' => $feature,
                'plan' => $tenant->plan,
            ], 403);
        }

        return $next($request);
    }
}
