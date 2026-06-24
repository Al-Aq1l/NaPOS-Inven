<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\Subscription;
use App\Models\User;
use App\Models\Branch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;

class AdminController extends Controller
{
    /**
     * Get system statistics summary.
     */
    public function summary()
    {
        $totalTenants = Tenant::count();
        
        $activeSubscribers = Tenant::where('is_active', true)
            ->where('plan', '!=', 'starter')
            ->count();

        $trialAccounts = Tenant::where('is_active', true)
            ->where('plan', 'starter')
            ->count();

        $suspendedTenants = Tenant::where('is_active', false)->count();

        // Total revenue from all paid subscriptions
        $totalRevenue = Subscription::where('status', 'settlement')->sum('amount');

        // Upcoming expirations (paid plans expiring within next 7 days)
        $upcomingExpirations = [];
        $nearExpirySubscriptions = Subscription::where('status', 'settlement')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(7))
            ->orderBy('expires_at')
            ->get();

        foreach ($nearExpirySubscriptions as $sub) {
            $tenant = Tenant::find($sub->tenant_id);
            if ($tenant) {
                // Check if this subscription is indeed the latest one for the tenant
                $latestSub = Subscription::where('tenant_id', $tenant->id)
                    ->where('status', 'settlement')
                    ->orderBy('expires_at', 'desc')
                    ->first();
                
                if ($latestSub && $latestSub->id === $sub->id) {
                    $upcomingExpirations[] = [
                        'tenant_id'   => $tenant->id,
                        'tenant_name' => $tenant->name,
                        'plan'        => $tenant->plan,
                        'phone'       => $tenant->phone,
                        'expires_at'  => $sub->expires_at->toIso8601String(),
                        'days_left'   => ceil(now()->diffInDays($sub->expires_at, false)),
                    ];
                }
            }
        }

        return response()->json([
            'total_tenants'        => $totalTenants,
            'active_subscribers'   => $activeSubscribers,
            'trial_accounts'       => $trialAccounts,
            'suspended_tenants'    => $suspendedTenants,
            'total_revenue'        => (int) $totalRevenue,
            'upcoming_expirations' => $upcomingExpirations,
        ]);
    }

    /**
     * Get list of all tenants with filtering and pagination.
     */
    public function tenants(Request $request)
    {
        $query = Tenant::query();

        // Search by name or slug
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Filter by plan
        if ($request->filled('plan')) {
            $query->where('plan', $request->plan);
        }

        // Filter by status (active / inactive)
        if ($request->filled('status')) {
            $status = $request->status === 'active' ? 1 : 0;
            $query->where('is_active', $status);
        }

        $tenants = $query->orderBy('created_at', 'desc')->paginate(15);

        // Append counts and subscription info
        $tenants->getCollection()->transform(function ($tenant) {
            $latestSub = Subscription::where('tenant_id', $tenant->id)
                ->where('status', 'settlement')
                ->orderBy('expires_at', 'desc')
                ->first();

            // Disable tenant scoping temporarily to get correct global count
            $usersCount = DB::table('users')->where('tenant_id', $tenant->id)->count();
            $branchesCount = DB::table('branches')->where('tenant_id', $tenant->id)->count();

            return [
                'id'             => $tenant->id,
                'name'           => $tenant->name,
                'slug'           => $tenant->slug,
                'phone'          => $tenant->phone,
                'plan'           => $tenant->plan,
                'trial_ends_at'  => $tenant->trial_ends_at ? $tenant->trial_ends_at->toIso8601String() : null,
                'is_active'      => (bool) $tenant->is_active,
                'created_at'     => $tenant->created_at->toIso8601String(),
                'expires_at'     => $latestSub && $latestSub->expires_at ? $latestSub->expires_at->toIso8601String() : null,
                'billing_cycle'  => $latestSub ? $latestSub->billing_cycle : 'monthly',
                'users_count'    => $usersCount,
                'branches_count' => $branchesCount,
            ];
        });

        return response()->json($tenants);
    }

    /**
     * Manually override a tenant's subscription plan and expiry.
     */
    public function updateSubscription(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);

        $request->validate([
            'plan'          => 'required|string|in:starter,basic,growth,business',
            'billing_cycle' => 'required|string|in:monthly,annual',
            'expires_at'    => 'nullable|date',
        ]);

        $plan = $request->plan;
        $billingCycle = $request->billing_cycle;
        $expiresAt = $request->expires_at ? Carbon::parse($request->expires_at) : null;

        // If plan is starter, expires_at should be null
        if ($plan === 'starter') {
            $expiresAt = null;
        }

        // Update the tenant's plan directly
        $tenant->update([
            'plan' => $plan,
        ]);

        // Insert a new manual subscription entry
        Subscription::create([
            'tenant_id'     => $tenant->id,
            'user_id'       => auth()->id(), // Admin who updated it
            'plan'          => $plan,
            'billing_cycle' => $billingCycle,
            'order_id'      => 'MANUAL-ADMIN-' . strtoupper($plan) . '-' . time(),
            'amount'        => 0,
            'status'        => 'settlement',
            'payment_type'  => 'manual_admin',
            'paid_at'       => now(),
            'expires_at'    => $expiresAt,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Langganan untuk tenant {$tenant->name} berhasil diperbarui secara manual.",
        ]);
    }

    /**
     * Toggle active/suspension status of a tenant.
     */
    public function toggleActive(Request $request, $id)
    {
        $tenant = Tenant::findOrFail($id);
        
        $tenant->update([
            'is_active' => !$tenant->is_active,
        ]);

        $statusStr = $tenant->is_active ? 'diaktifkan' : 'ditangguhkan (suspend)';

        return response()->json([
            'success'   => true,
            'is_active' => (bool) $tenant->is_active,
            'message'   => "Tenant {$tenant->name} berhasil {$statusStr}.",
        ]);
    }
}
