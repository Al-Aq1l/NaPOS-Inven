<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    protected string $baseUrl;

    public function __construct()
    {
        $this->baseUrl = config('services.whatsapp.url', 'http://localhost:3001');
    }

    /**
     * Get the connection status from the microservice.
     */
    public function getStatus(): array
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/status");
            if ($response->successful()) {
                return $response->json();
            }
            return ['connected' => false, 'error' => 'Gagal mengambil status dari microservice.'];
        } catch (\Exception $e) {
            Log::error("WhatsAppService getStatus error: {$e->getMessage()}");
            return ['connected' => false, 'error' => 'Layanan WhatsApp tidak merespon.'];
        }
    }

    /**
     * Get the QR code base64 from the microservice.
     */
    public function getQr(): array
    {
        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/qr");
            return $response->json();
        } catch (\Exception $e) {
            Log::error("WhatsAppService getQr error: {$e->getMessage()}");
            return ['error' => 'Gagal mendapatkan QR Code.'];
        }
    }

    /**
     * Disconnect WhatsApp session.
     */
    public function logout(): array
    {
        try {
            $response = Http::timeout(10)->post("{$this->baseUrl}/logout");
            return $response->json();
        } catch (\Exception $e) {
            Log::error("WhatsAppService logout error: {$e->getMessage()}");
            return ['success' => false, 'error' => 'Gagal memutuskan koneksi WhatsApp.'];
        }
    }

    /**
     * Send a raw message to a phone number.
     */
    public function sendMessage(string $phone, string $message): array
    {
        try {
            $response = Http::timeout(15)->post("{$this->baseUrl}/send-message", [
                'phone' => $phone,
                'message' => $message,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'success' => false,
                'error' => $response->json('error') ?? 'Gagal mengirim pesan WhatsApp.'
            ];
        } catch (\Exception $e) {
            Log::error("WhatsAppService sendMessage error: {$e->getMessage()}");
            return ['success' => false, 'error' => 'Gagal terhubung ke layanan pengirim WhatsApp.'];
        }
    }

    /**
     * Format an order receipt into a beautiful text format for WhatsApp.
     */
    public function formatReceipt(Order $order): string
    {
        // Load relationships if not loaded
        $order->load(['branch', 'items.product', 'user']);

        $tenantName = auth()->user()->tenant->name ?? 'NaPOS Store';
        $branchName = $order->branch->name ?? 'Utama';
        $branchAddress = $order->branch->address ?? '';
        $branchPhone = $order->branch->phone ?? '';

        $invoiceNum = 'INV-' . str_pad($order->id, 6, '0', STR_PAD_LEFT);
        $date = $order->created_at->timezone('Asia/Jakarta')->format('d M Y H:i');
        $cashier = $order->user->name ?? 'Kasir';

        $receipt = "*=== STRUK BELANJA ===*\n";
        $receipt .= "*{$tenantName}*\n";
        $receipt .= "Cabang: {$branchName}\n";
        if ($branchAddress) {
            $receipt .= "{$branchAddress}\n";
        }
        if ($branchPhone) {
            $receipt .= "Telp: {$branchPhone}\n";
        }
        $receipt .= "--------------------------------------------------\n";
        $receipt .= "No. Transaksi : {$invoiceNum}\n";
        $receipt .= "Tanggal : {$date}\n";
        $receipt .= "Kasir : {$cashier}\n";
        $customerName = $order->customer_name ?: 'Pelanggan Umum';
        $receipt .= "Pelanggan : {$customerName}\n";
        $receipt .= "--------------------------------------------------\n\n";

        $itemCount = 0;
        foreach ($order->items as $item) {
            $productName = $item->product->name ?? 'Produk';
            $qty = (int) $item->quantity;
            $price = number_format((float) $item->price, 0, ',', '.');
            $subtotal = number_format((float) $item->subtotal, 0, ',', '.');

            $receipt .= "*{$productName}*\n";
            $receipt .= "  {$qty} x Rp {$price} = Rp {$subtotal}\n";
            $itemCount += $qty;
        }

        $receipt .= "\n--------------------------------------------------\n";
        $receipt .= "Total Item : {$itemCount} item\n";
        $receipt .= "*TOTAL : Rp " . number_format((float) $order->total_amount, 0, ',', '.') . "*\n";
        
        $paymentMethod = strtoupper(str_replace('_', ' ', $order->payment_method));
        $receipt .= "Pembayaran : {$paymentMethod}\n";
        $receipt .= "--------------------------------------------------\n";
        $receipt .= "Terima kasih atas kunjungan Anda!\n";
        $receipt .= "_Powered by NaPOS - Smart Inventory & POS_";

        return $receipt;
    }
}
