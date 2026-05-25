<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\InventoryOptimizationController;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Protected routes requiring a tenant
    Route::middleware('tenant')->group(function () {
        // Example routes that require a specific role
        Route::middleware('role:owner,manager')->group(function () {
            // Route::get('/reports', [ReportController::class, 'index']);
        });
        
        Route::middleware('role:owner')->group(function () {
            // Route::put('/settings', [SettingsController::class, 'update']);
        });

        Route::middleware('role:owner,manager')->group(function () {
            Route::get('/dashboard/summary', [\App\Http\Controllers\DashboardController::class, 'summary']);
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
            Route::get('/inventory/optimization', [InventoryOptimizationController::class, 'index']);
            Route::post('/inventory/optimization/apply', [InventoryOptimizationController::class, 'apply']);

            Route::apiResource('branches', \App\Http\Controllers\BranchController::class)->except(['index']);
            Route::apiResource('categories', \App\Http\Controllers\CategoryController::class);
            Route::post('/products/{product}', [\App\Http\Controllers\ProductController::class, 'update']);
            Route::apiResource('products', \App\Http\Controllers\ProductController::class)->except(['index']);
        });
        
        // Stock Transfers
        Route::middleware('role:owner,manager')->group(function () {
            Route::apiResource('transfers', \App\Http\Controllers\StockTransferController::class)->except(['update', 'destroy']);
            Route::put('/transfers/{transfer}/status', [\App\Http\Controllers\StockTransferController::class, 'updateStatus']);
        });
        
        // Stock Opname
        Route::middleware('role:owner,manager')->group(function () {
            Route::apiResource('stock-opname', \App\Http\Controllers\StockOpnameController::class)->except(['update', 'destroy']);
        });

        // Stock Receiving
        Route::middleware('role:owner,manager')->group(function () {
            Route::apiResource('stock-receipts', \App\Http\Controllers\StockReceiptController::class)->except(['update', 'destroy']);
        });
        
        // Billing & Subscriptions
        Route::middleware('role:owner')->group(function () {
            Route::get('/billing', [\App\Http\Controllers\BillingController::class, 'index']);
            Route::post('/billing/upgrade', [\App\Http\Controllers\BillingController::class, 'upgrade']);
        });
    });
});
