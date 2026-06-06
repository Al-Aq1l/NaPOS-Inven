<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class PasswordResetController extends Controller
{
    /**
     * Reset the user's password using the verified OTP.
     */
    public function reset(Request $request)
    {
        $request->validate([
            'email'    => 'required|email|exists:users,email',
            'otp'      => 'required|string|size:6',
            'password' => 'required|string|min:8',
        ]);

        $stored = Cache::get("otp:{$request->email}");

        if (!$stored || $stored !== $request->otp) {
            throw ValidationException::withMessages([
                'otp' => ['Kode OTP tidak valid atau sudah kedaluwarsa.'],
            ]);
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        // Update password
        $user->password = Hash::make($request->password);
        $user->save();

        // Consume OTP
        Cache::forget("otp:{$request->email}");

        return response()->json([
            'message' => 'Password berhasil diubah. Silakan login dengan password baru.',
        ]);
    }
}
