<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('plan');                            // starter, basic, growth, business
            $table->string('order_id')->unique();             // Midtrans order ID
            $table->unsignedBigInteger('amount');             // price in IDR (0 for Starter)
            $table->string('snap_token')->nullable();         // Midtrans Snap token
            $table->string('status')->default('pending');     // pending, settlement, expired, cancel
            $table->string('payment_type')->nullable();       // credit_card, gopay, bank_transfer, etc.
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();      // subscription end date
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};

