<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;

class BranchController extends Controller
{
    public function index()
    {
        // TenantScope automatically filters by auth()->user()->tenant_id
        return response()->json(Branch::all());
    }

    public function store(Request $request)
    {
        $tenant = auth()->user()->tenant;
        if ($tenant) {
            $planLimits = [
                'starter' => 1,
                'basic' => 1,
                'growth' => 5,
                'business' => 999,
            ];
            $maxBranches = $planLimits[strtolower($tenant->plan)] ?? 1;
            $currentBranchCount = Branch::count();
            if ($currentBranchCount >= $maxBranches) {
                return response()->json([
                    'message' => "Batas jumlah cabang paket Anda ({$maxBranches} Cabang) telah tercapai. Harap upgrade ke paket langganan yang lebih tinggi!"
                ], 403);
            }
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'status' => 'in:online,offline',
        ]);

        $branch = Branch::create($validated);
        return response()->json($branch, 201);
    }

    public function show(Branch $branch)
    {
        return response()->json($branch);
    }

    public function update(Request $request, Branch $branch)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'status' => 'in:online,offline',
        ]);

        $branch->update($validated);
        return response()->json($branch);
    }

    public function destroy(Branch $branch)
    {
        $branch->delete();
        return response()->json(null, 204);
    }
}
