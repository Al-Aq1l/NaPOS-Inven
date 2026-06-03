<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('branch_id')
                ->nullable()
                ->after('tenant_id')
                ->constrained('branches')
                ->nullOnDelete();
        });

        DB::table('users')
            ->where('role', 'cashier')
            ->whereNull('branch_id')
            ->eachById(function ($user) {
                $branchId = DB::table('branches')
                    ->where('tenant_id', $user->tenant_id)
                    ->orderBy('id')
                    ->value('id');

                if ($branchId) {
                    DB::table('users')
                        ->where('id', $user->id)
                        ->update(['branch_id' => $branchId]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
        });
    }
};
