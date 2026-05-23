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

        // Other tenant-aware routes
        Route::get('/inventory/optimization', [InventoryOptimizationController::class, 'index']);
        Route::post('/inventory/optimization/apply', [InventoryOptimizationController::class, 'apply']);
        
        Route::apiResource('branches', \App\Http\Controllers\BranchController::class);
        Route::apiResource('categories', \App\Http\Controllers\CategoryController::class);
        Route::apiResource('products', \App\Http\Controllers\ProductController::class);
        Route::apiResource('orders', \App\Http\Controllers\OrderController::class)->except(['update', 'destroy']);
        Route::post('/receipts/print', [\App\Http\Controllers\ReceiptPrintController::class, 'store']);
        
        // Stock Transfers
        Route::apiResource('transfers', \App\Http\Controllers\StockTransferController::class)->except(['update', 'destroy']);
        Route::put('/transfers/{transfer}/status', [\App\Http\Controllers\StockTransferController::class, 'updateStatus']);
        
        // Stock Opname
        Route::apiResource('stock-opname', \App\Http\Controllers\StockOpnameController::class)->except(['update', 'destroy']);

        // Stock Receiving
        Route::apiResource('stock-receipts', \App\Http\Controllers\StockReceiptController::class)->except(['update', 'destroy']);
        
        // Billing & Subscriptions
        Route::get('/billing', [\App\Http\Controllers\BillingController::class, 'index']);
        Route::post('/billing/upgrade', [\App\Http\Controllers\BillingController::class, 'upgrade']);
    });
});
