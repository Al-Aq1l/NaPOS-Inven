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
     * Resolve the WhatsApp session ID based on the current context.
     * - Super Admin uses 'superadmin' session (system-wide notifications).
     * - Tenant users use 'tenant_{id}' session (per-store receipts).
     */
    public function resolveSessionId(?string $override = null): string
    {
        if ($override) {
            return $override;
        }

        $user = auth()->user();

        if (!$user || !$user->tenant_id) {
            return 'superadmin';
        }

        return 'tenant_' . $user->tenant_id;
    }

    /**
     * Get the connection status from the microservice.
     */
    public function getStatus(?string $sessionId = null): array
    {
        $sessionId = $this->resolveSessionId($sessionId);

        try {
            $response = Http::timeout(5)->get("{$this->baseUrl}/status", [
                'sessionId' => $sessionId,
            ]);
            if ($response->successful()) {
                return $response->json();
            }
            return ['connected' => false, 'error' => 'Gagal mengambil status dari microservice.'];
        } catch (\Exception $e) {
            Log::error("WhatsAppService getStatus error [{$sessionId}]: {$e->getMessage()}");
            return ['connected' => false, 'error' => 'Layanan WhatsApp tidak merespon.'];
        }
    }

    /**
     * Get the QR code base64 from the microservice.
     */
    public function getQr(?string $sessionId = null): array
    {
        $sessionId = $this->resolveSessionId($sessionId);

        try {
            $response = Http::timeout(10)->get("{$this->baseUrl}/qr", [
                'sessionId' => $sessionId,
            ]);
            return $response->json();
        } catch (\Exception $e) {
            Log::error("WhatsAppService getQr error [{$sessionId}]: {$e->getMessage()}");
            return ['error' => 'Gagal mendapatkan QR Code.'];
        }
    }

    /**
     * Disconnect WhatsApp session.
     */
    public function logout(?string $sessionId = null): array
    {
        $sessionId = $this->resolveSessionId($sessionId);

        try {
            $response = Http::timeout(10)->post("{$this->baseUrl}/logout", [
                'sessionId' => $sessionId,
            ]);
            return $response->json();
        } catch (\Exception $e) {
            Log::error("WhatsAppService logout error [{$sessionId}]: {$e->getMessage()}");
            return ['success' => false, 'error' => 'Gagal memutuskan koneksi WhatsApp.'];
        }
    }

    /**
     * Send a raw message to a phone number.
     */
    public function sendMessage(string $phone, string $message, ?string $sessionId = null): array
    {
        $sessionId = $this->resolveSessionId($sessionId);

        try {
            $response = Http::timeout(15)->post("{$this->baseUrl}/send-message", [
                'phone' => $phone,
                'message' => $message,
                'sessionId' => $sessionId,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            return [
                'success' => false,
                'error' => $response->json('error') ?? 'Gagal mengirim pesan WhatsApp.'
            ];
        } catch (\Exception $e) {
            Log::error("WhatsAppService sendMessage error [{$sessionId}]: {$e->getMessage()}");
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

        $width = 32;
        $lines = [];

        $tenantName = auth()->user()->tenant->name ?? 'NAPS';
        $lines[] = $this->centerText($tenantName, $width);
        $lines[] = $this->centerText("Smart Inventory & POS", $width);
        
        $branchName = $order->branch->name ?? '-';
        $lines[] = $this->centerText("Cabang: {$branchName}", $width);
        
        $lines[] = str_repeat('-', $width);

        $invoiceNum = 'INV-' . str_pad($order->id, 6, '0', STR_PAD_LEFT);
        $date = $order->created_at->timezone('Asia/Jakarta')->format('d M Y H:i');
        $cashier = $order->user->name ?? '-';
        $customerName = $order->customer_name ?: 'Pelanggan Umum';
        
        $pm = $order->payment_method;
        if ($pm === 'cash') $paymentMethodLabel = 'Tunai';
        elseif ($pm === 'qris') $paymentMethodLabel = 'QRIS';
        elseif ($pm === 'transfer') $paymentMethodLabel = 'Transfer';
        else $paymentMethodLabel = strtoupper($pm);

        $lines = array_merge($lines, $this->columns("No", $invoiceNum, $width));
        $lines = array_merge($lines, $this->columns("Waktu", $date, $width));
        $lines = array_merge($lines, $this->columns("Kasir", $cashier, $width));
        $lines = array_merge($lines, $this->columns("Pelanggan", $customerName, $width));
        $lines = array_merge($lines, $this->columns("Bayar", $paymentMethodLabel, $width));
        
        $lines[] = str_repeat('-', $width);

        $subtotalOrder = 0;
        foreach ($order->items as $item) {
            $productName = $item->product->name ?? '-';
            $lines = array_merge($lines, $this->wrapText($productName, $width));
            
            $qty = (int) $item->quantity;
            $price = (float) $item->price;
            $subtotal = (float) $item->subtotal;
            $grossSubtotal = $qty * $price;
            $discountAmount = max(0, $grossSubtotal - $subtotal);
            $subtotalOrder += $subtotal;
            
            $lines = array_merge($lines, $this->columns("{$qty} x " . $this->rupiah($price), $this->rupiah($grossSubtotal), $width));

            if ($discountAmount > 0) {
                $lines = array_merge($lines, $this->columns("Diskon", "-" . $this->rupiah($discountAmount), $width));
                $lines = array_merge($lines, $this->columns("Subtotal item", $this->rupiah($subtotal), $width));
            }
        }

        $lines[] = str_repeat('-', $width);
        
        $lines = array_merge($lines, $this->columns("Subtotal", $this->rupiah($subtotalOrder), $width));
        
        $tenant = \App\Models\Tenant::find($order->tenant_id);
        $taxRate = $tenant ? $tenant->tax_rate : 11;
        $tax = (float) $order->total_amount - $subtotalOrder;
        if ($tax > 0) {
            $lines = array_merge($lines, $this->columns("PPN {$taxRate}%", $this->rupiah($tax), $width));
        }
        
        $lines = array_merge($lines, $this->columns("Total", $this->rupiah((float) $order->total_amount), $width));
        
        $lines[] = str_repeat('-', $width);
        $lines[] = $this->centerText("Terima kasih", $width);
        $lines[] = $this->centerText("Transaksi tersimpan", $width);

        // Menggunakan triple backticks agar teks menjadi monospace di WhatsApp
        return "```\n" . implode("\n", $lines) . "\n```";
    }

    private function centerText(string $text, int $width): string
    {
        $len = strlen($text);
        if ($len >= $width) {
            return substr($text, 0, $width);
        }
        $leftPadding = (int) floor(($width - $len) / 2);
        $rightPadding = $width - $len - $leftPadding;
        return str_repeat(' ', $leftPadding) . $text . str_repeat(' ', $rightPadding);
    }

    private function columns(string $left, string $right, int $width): array
    {
        $rightWidth = min(14, max(8, strlen($right)));
        $leftWidth = $width - $rightWidth - 1;

        $wrappedLeft = explode("\n", wordwrap($left, $leftWidth, "\n", true));
        $lines = [];

        foreach ($wrappedLeft as $index => $line) {
            if ($index === 0) {
                $lines[] = str_pad($line, $leftWidth) . ' ' . str_pad($right, $rightWidth, ' ', STR_PAD_LEFT);
            } else {
                $lines[] = str_pad($line, $width);
            }
        }

        return $lines;
    }

    private function wrapText(string $text, int $width): array
    {
        $wrapped = wordwrap($text, $width, "\n", true);
        return explode("\n", $wrapped === '' ? '-' : $wrapped);
    }

    private function rupiah(float $value): string
    {
        return 'Rp ' . number_format($value, 0, ',', '.');
    }
}
