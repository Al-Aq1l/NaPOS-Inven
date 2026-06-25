<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Mail;
use App\Mail\OtpMail;

class OtpController extends Controller
{
    /**
     * Generate and send a 6-digit OTP to the given email.
     */
    public function send(Request $request)
    {
        $request->validate([
            'email' => 'required|email|max:255',
            'type'  => 'nullable|string|in:register,reset',
        ]);

        if ($request->type === 'register' && \App\Models\User::where('email', $request->email)->exists()) {
            return response()->json([
                'message' => 'Email sudah terdaftar di sistem. Silakan masuk atau gunakan email lain.',
            ], 422);
        }

        $otp = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Store OTP in cache for 10 minutes
        Cache::put("otp:{$request->email}", $otp, 600);

        Mail::to($request->email)->send(new OtpMail($otp));

        return response()->json([
            'message' => 'OTP sent successfully',
        ]);
    }

    /**
     * Verify the OTP submitted by the user.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp'   => 'required|string|size:6',
        ]);

        $stored = Cache::get("otp:{$request->email}");

        if (!$stored || $stored !== $request->otp) {
            return response()->json([
                'message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.',
            ], 422);
        }

        // We do NOT consume the OTP here. 
        // Let the final action (e.g. Password Reset) consume it so it's still available for them.
        // Cache::forget("otp:{$request->email}");

        return response()->json([
            'message'  => 'OTP verified successfully',
            'verified' => true,
        ]);
    }
}
