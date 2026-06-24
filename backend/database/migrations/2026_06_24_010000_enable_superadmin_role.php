<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::disableForeignKeyConstraints();

        // 1. Make tenant_id nullable
        DB::statement('ALTER TABLE users MODIFY tenant_id BIGINT UNSIGNED NULL');

        // 2. Modify enum values for role
        DB::statement("ALTER TABLE users MODIFY role ENUM('owner', 'manager', 'cashier', 'superadmin') NOT NULL DEFAULT 'cashier'");

        Schema::enableForeignKeyConstraints();

        // 3. Seed default superadmin
        // Check if already exists to prevent duplicate key error during re-runs
        $exists = DB::table('users')->where('email', 'admin@napos.id')->exists();
        if (!$exists) {
            DB::table('users')->insert([
                'tenant_id' => null,
                'name'      => 'Super Admin',
                'email'     => 'admin@napos.id',
                'password'  => Hash::make('passwordadmin'),
                'role'      => 'superadmin',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::disableForeignKeyConstraints();

        // Delete seeded superadmin users first
        DB::table('users')->where('role', 'superadmin')->delete();

        // Revert tenant_id to NOT NULL
        DB::statement('ALTER TABLE users MODIFY tenant_id BIGINT UNSIGNED NOT NULL');

        // Revert enum values for role
        DB::statement("ALTER TABLE users MODIFY role ENUM('owner', 'manager', 'cashier') NOT NULL DEFAULT 'cashier'");

        Schema::enableForeignKeyConstraints();
    }
};
