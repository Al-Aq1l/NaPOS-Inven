<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenant
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! auth()->check()) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        $user = auth()->user();
        
        if (! $user->tenant_id) {
            return response()->json(['message' => 'User does not belong to any tenant.'], 403);
        }

        if (! $user->tenant->is_active) {
            return response()->json(['message' => 'Your business account has been suspended or is inactive.'], 403);
        }

        // In a real multi-tenant app, we might set a global scope or binding here
        // e.g., app()->instance('tenant_id', $user->tenant_id);

        return $next($request);
    }
}
