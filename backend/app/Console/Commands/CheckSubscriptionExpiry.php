<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\Tenant;
use App\Services\WhatsAppService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class CheckSubscriptionExpiry extends Command
{
    protected $signature = 'subscriptions:check-expiry';
    protected $description = 'Check for subscriptions expiring in 7, 3, or 1 days and send WhatsApp reminders to tenant owners';

    public function handle(): int
    {
        $this->info('Checking subscription expiry dates...');

        $alertDays = [7, 3, 1];
        $whatsApp = app(WhatsAppService::class);
        $totalSent = 0;

        foreach ($alertDays as $days) {
            $targetDate = now()->addDays($days)->toDateString();

            // Find subscriptions expiring on this exact target date
            $subscriptions = Subscription::where('status', 'settlement')
                ->whereNotNull('expires_at')
                ->whereDate('expires_at', $targetDate)
                ->get();

            foreach ($subscriptions as $subscription) {
                $tenant = Tenant::find($subscription->tenant_id);
                if (!$tenant || !$tenant->phone) {
                    $this->warn("Tenant #{$subscription->tenant_id}: no phone number configured, skipping.");
                    continue;
                }

                $planLabel = ucfirst($subscription->plan);
                $expiryDate = $subscription->expires_at->timezone('Asia/Jakarta')->format('d M Y');

                $message = $this->buildMessage($tenant->name, $planLabel, $days, $expiryDate);

                try {
                    $result = $whatsApp->sendMessage($tenant->phone, $message);
                    if (isset($result['success']) && $result['success'] === false) {
                        $this->error("Failed to send to {$tenant->phone}: " . ($result['error'] ?? 'Unknown error'));
                        Log::error("SubscriptionExpiry: failed to send WhatsApp to {$tenant->phone}", $result);
                    } else {
                        $this->info("✓ Sent {$days}-day reminder to {$tenant->name} ({$tenant->phone})");
                        $totalSent++;
                    }
                } catch (\Exception $e) {
                    $this->error("Exception sending to {$tenant->phone}: {$e->getMessage()}");
                    Log::error("SubscriptionExpiry: exception for tenant {$tenant->id}", ['error' => $e->getMessage()]);
                }
            }
        }

        // Send summary to admin phone if configured
        $adminPhone = config('services.whatsapp.admin_phone');
        if ($adminPhone && $totalSent > 0) {
            try {
                $summaryMsg = "📊 *Laporan Harian Langganan NaPS*\n\n"
                    . "Tanggal: " . now()->timezone('Asia/Jakarta')->format('d M Y') . "\n"
                    . "Total notifikasi terkirim: {$totalSent}\n\n"
                    . "Sistem telah mengirim pengingat perpanjangan langganan ke tenant yang masa aktifnya akan berakhir dalam 7, 3, atau 1 hari.";

                $whatsApp->sendMessage($adminPhone, $summaryMsg);
                $this->info("✓ Admin summary sent to {$adminPhone}");
            } catch (\Exception $e) {
                $this->warn("Failed to send admin summary: {$e->getMessage()}");
            }
        }

        $this->info("Done. Total notifications sent: {$totalSent}");
        return Command::SUCCESS;
    }

    private function buildMessage(string $tenantName, string $planLabel, int $days, string $expiryDate): string
    {
        $urgency = match ($days) {
            1 => '🔴 *PENTING — BESOK BERAKHIR!*',
            3 => '🟡 *Pengingat — 3 Hari Lagi*',
            7 => '🟢 *Pengingat — 7 Hari Lagi*',
            default => "📢 *Pengingat — {$days} Hari Lagi*",
        };

        return "{$urgency}\n\n"
            . "Halo, *{$tenantName}*! 👋\n\n"
            . "Langganan paket *{$planLabel}* Anda di NaPS akan berakhir dalam *{$days} hari* ({$expiryDate}).\n\n"
            . "Untuk menghindari gangguan layanan, silakan perpanjang langganan Anda sebelum tanggal tersebut melalui menu:\n"
            . "📱 _Dashboard > Pengaturan > Tagihan & Langganan_\n\n"
            . "Terima kasih telah menggunakan *NaPS*! 🙏";
    }
}
