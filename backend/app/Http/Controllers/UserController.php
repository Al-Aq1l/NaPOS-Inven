<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\PlanLimits;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return response()->json(
            User::where('tenant_id', auth()->user()->tenant_id)
                ->with('branch:id,name')
                ->select(['id', 'tenant_id', 'branch_id', 'name', 'email', 'role', 'created_at'])
                ->orderBy('name')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $tenant = auth()->user()->tenant;
        $limits = PlanLimits::forPlan($tenant->plan);
        $currentUsers = User::where('tenant_id', $tenant->id)->count();

        if ($currentUsers >= $limits['max_users']) {
            return response()->json([
                'message' => "Batas pengguna paket Anda ({$limits['max_users']} akun) telah tercapai. Ajukan upgrade paket untuk menambah anggota tim.",
            ], 403);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(['owner', 'manager', 'cashier'])],
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')->where('tenant_id', $tenant->id)],
        ]);

        if ($validated['role'] === 'cashier' && empty($validated['branch_id'])) {
            return response()->json([
                'message' => 'Kasir wajib memiliki cabang kerja.',
                'errors' => [
                    'branch_id' => ['Kasir wajib memiliki cabang kerja.'],
                ],
            ], 422);
        }

        $user = User::create([
            'tenant_id' => $tenant->id,
            'branch_id' => $validated['role'] === 'cashier' ? $validated['branch_id'] : null,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        return response()->json($user->load(['tenant', 'branch']), 201);
    }

    public function update(Request $request, User $user)
    {
        $tenantId = auth()->user()->tenant_id;

        if ($user->tenant_id !== $tenantId) {
            abort(404);
        }

        $validated = $request->validate([
            'role' => ['required', Rule::in(['owner', 'manager', 'cashier'])],
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')->where('tenant_id', $tenantId)],
        ]);

        if ($user->id === auth()->id() && $validated['role'] !== 'owner') {
            return response()->json([
                'message' => 'Owner tidak dapat menurunkan role akunnya sendiri.',
            ], 422);
        }

        if ($validated['role'] === 'cashier' && empty($validated['branch_id'])) {
            return response()->json([
                'message' => 'Kasir wajib memiliki cabang kerja.',
                'errors' => [
                    'branch_id' => ['Kasir wajib memiliki cabang kerja.'],
                ],
            ], 422);
        }

        $user->update([
            'role' => $validated['role'],
            'branch_id' => $validated['role'] === 'cashier' ? $validated['branch_id'] : null,
        ]);

        return response()->json($user->load(['tenant', 'branch']));
    }
}
