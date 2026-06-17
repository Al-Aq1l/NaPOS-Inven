<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\WhatsAppService;
use Illuminate\Http\Request;

class WhatsAppController extends Controller
{
    protected WhatsAppService $whatsAppService;

    public function __construct(WhatsAppService $whatsAppService)
    {
        $this->whatsAppService = $whatsAppService;
    }

    /**
     * GET /api/whatsapp/status
     * Check if WhatsApp is connected.
     */
    public function status()
    {
        $status = $this->whatsAppService->getStatus();
        return response()->json($status);
    }

    /**
     * GET /api/whatsapp/qr
     * Fetch WhatsApp QR code for linking.
     */
    public function qr()
    {
        $qrData = $this->whatsAppService->getQr();
        if (isset($qrData['error'])) {
            return response()->json(['message' => $qrData['error']], 502);
        }
        return response()->json($qrData);
    }

    /**
     * POST /api/whatsapp/logout
     * Disconnect the WhatsApp session.
     */
    public function logout()
    {
        $result = $this->whatsAppService->logout();
        if (isset($result['success']) && $result['success'] === false) {
            return response()->json(['message' => $result['error']], 500);
        }
        return response()->json($result);
    }

    /**
     * POST /api/whatsapp/send-receipt/{orderId}
     * Send receipt message via WhatsApp.
     */
    public function sendReceipt(Request $request, $orderId)
    {
        $validated = $request->validate([
            'phone' => 'required|string|min:8',
        ]);

        $tenantId = auth()->user()->tenant_id;

        // Ensure order exists and belongs to the authenticated user's tenant
        $order = Order::where('id', $orderId)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$order) {
            return response()->json(['message' => 'Transaksi tidak ditemukan.'], 404);
        }

        // Format the message
        $message = $this->whatsAppService->formatReceipt($order);

        // Send message
        $sendResult = $this->whatsAppService->sendMessage($validated['phone'], $message);

        if (isset($sendResult['success']) && !$sendResult['success']) {
            return response()->json([
                'message' => $sendResult['error'] ?? 'Gagal mengirim struk via WhatsApp.'
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Struk berhasil dikirim ke nomor WhatsApp pelanggan.'
        ]);
    }
}
