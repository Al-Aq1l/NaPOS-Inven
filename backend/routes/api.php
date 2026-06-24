<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\InventoryOptimizationController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// OTP verification (public — email must be provided before registration)
Route::post('/otp/send',   [OtpController::class, 'send']);
Route::post('/otp/verify', [OtpController::class, 'verify']);
Route::post('/password/reset', [PasswordResetController::class, 'reset']);

// Midtrans webhook — excluded from CSRF (handled by signature verification inside controller)
Route::post('/midtrans/notification', [PaymentWebhookController::class, 'handle']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/payment/verify', [PaymentWebhookController::class, 'verify']);

    // Super Admin Routes (do not require tenant scoping)
    Route::middleware('role:superadmin')->prefix('admin')->group(function () {
        Route::get('/summary', [\App\Http\Controllers\Api\AdminController::class, 'summary']);
        Route::get('/tenants', [\App\Http\Controllers\Api\AdminController::class, 'tenants']);
        Route::put('/tenants/{tenant}/subscription', [\App\Http\Controllers\Api\AdminController::class, 'updateSubscription']);
        Route::post('/tenants/{tenant}/toggle-active', [\App\Http\Controllers\Api\AdminController::class, 'toggleActive']);
    });

    // Protected routes requiring a tenant
    Route::middleware('tenant')->group(function () {
        // Example routes that require a specific role
        Route::middleware('role:owner,manager')->group(function () {
            // Route::get('/reports', [ReportController::class, 'index']);
        });
        
        Route::middleware('role:owner')->group(function () {
            Route::put('/settings', [\App\Http\Controllers\SettingsController::class, 'update']);
        });

        Route::middleware('role:owner,manager')->group(function () {
            Route::get('/dashboard/summary', [\App\Http\Controllers\DashboardController::class, 'summary']);
            Route::get('/analytics', [\App\Http\Controllers\AnalyticsController::class, 'index']);
        });

        Route::middleware('role:owner,manager,cashier')->group(function () {
            Route::get('/branches', [\App\Http\Controllers\BranchController::class, 'index']);
            Route::post('/orders', [\App\Http\Controllers\OrderController::class, 'store']);
            Route::post('/receipts/print', [\App\Http\Controllers\ReceiptPrintController::class, 'store']);
        });

        Route::middleware('role:owner,manager')->group(function () {
            Route::get('/orders', [\App\Http\Controllers\OrderController::class, 'index']);
            Route::get('/orders/{order}', [\App\Http\Controllers\OrderController::class, 'show']);
        });

        Route::middleware('role:owner,manager,cashier')->group(function () {
            Route::get('/products', [\App\Http\Controllers\ProductController::class, 'index']);
        });

        Route::middleware('role:owner,manager')->group(function () {
            Route::middleware('plan.feature:optimization')->group(function () {
                Route::get('/inventory/optimization', [InventoryOptimizationController::class, 'index']);
                Route::post('/inventory/optimization/apply', [InventoryOptimizationController::class, 'apply']);
            });

            Route::apiResource('branches', \App\Http\Controllers\BranchController::class)->except(['index']);
            Route::apiResource('categories', \App\Http\Controllers\CategoryController::class);
            Route::post('/products/{product}', [\App\Http\Controllers\ProductController::class, 'update']);
            Route::apiResource('products', \App\Http\Controllers\ProductController::class)->except(['index']);
        });
        
        // Stock Transfers
        Route::middleware('role:owner,manager')->group(function () {
            Route::middleware('plan.feature:stock_transfer')->group(function () {
                Route::apiResource('transfers', \App\Http\Controllers\StockTransferController::class)->except(['update', 'destroy']);
                Route::put('/transfers/{transfer}/status', [\App\Http\Controllers\StockTransferController::class, 'updateStatus']);
            });
        });
        
        // Stock Opname
        Route::middleware('role:owner,manager')->group(function () {
            Route::middleware('plan.feature:opname')->group(function () {
                Route::apiResource('stock-opname', \App\Http\Controllers\StockOpnameController::class)->except(['update', 'destroy']);
            });
        });

        // Stock Receiving
        Route::middleware('role:owner,manager')->group(function () {
            Route::apiResource('stock-receipts', \App\Http\Controllers\StockReceiptController::class)->except(['update', 'destroy']);
        });
        
        Route::middleware('role:owner,manager')->group(function () {
            Route::get('/billing', [\App\Http\Controllers\BillingController::class, 'index']);
        });

        // Billing & Subscriptions
        Route::middleware('role:owner')->group(function () {
            Route::get('/users', [\App\Http\Controllers\UserController::class, 'index']);
            Route::post('/users', [\App\Http\Controllers\UserController::class, 'store']);
            Route::put('/users/{user}', [\App\Http\Controllers\UserController::class, 'update']);
            Route::post('/billing/upgrade', [\App\Http\Controllers\BillingController::class, 'upgrade']);
            
            Route::get('/whatsapp/qr', [\App\Http\Controllers\WhatsAppController::class, 'qr']);
            Route::post('/whatsapp/logout', [\App\Http\Controllers\WhatsAppController::class, 'logout']);
        });

        Route::middleware('role:owner,manager,cashier')->group(function () {
            Route::get('/whatsapp/status', [\App\Http\Controllers\WhatsAppController::class, 'status']);
            Route::post('/whatsapp/send-receipt/{orderId}', [\App\Http\Controllers\WhatsAppController::class, 'sendReceipt']);
        });
    });
});
