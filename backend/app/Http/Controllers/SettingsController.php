<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function update(Request $request)
    {
        $user = auth()->user();
        if ($user->role !== 'owner') {
            return response()->json(['message' => 'Hanya owner yang dapat mengubah pengaturan.'], 403);
        }

        $tenant = $user->tenant;

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'tax_rate' => 'required|integer|min:0|max:100',
        ]);

        $tenant->update([
            'name' => $validated['name'],
            'tax_rate' => $validated['tax_rate'],
        ]);

        return response()->json([
            'message' => 'Pengaturan berhasil diperbarui.',
            'tenant' => $tenant
        ]);
    }
}
