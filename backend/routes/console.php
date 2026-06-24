<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Check for expiring subscriptions every day at 08:00 AM Jakarta time
Schedule::command('subscriptions:check-expiry')->dailyAt('08:00')->timezone('Asia/Jakarta');
