<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Tenant;
use App\Models\Branch;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create the default Demo Tenant
        $tenant = Tenant::create([
            'name' => 'Toko Makmur Jaya',
            'slug' => 'toko-makmur-jaya',
            'plan' => 'growth',
            'is_active' => true,
        ]);

        $password = Hash::make('password');

        // Create the Demo Users matching the 4 roles
        $owner = User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Ahmad Rizki',
            'email' => 'owner@napos.id',
            'password' => $password,
            'role' => 'owner',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Siti Nurhaliza',
            'email' => 'manager@napos.id',
            'password' => $password,
            'role' => 'manager',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Budi Santoso',
            'email' => 'cashier@napos.id',
            'password' => $password,
            'role' => 'cashier',
        ]);

        User::create([
            'tenant_id' => $tenant->id,
            'name' => 'Dewi Lestari',
            'email' => 'viewer@napos.id',
            'password' => $password,
            'role' => 'viewer',
        ]);

        // Login as owner to satisfy the TenantScoped trait for the seeding below
        auth()->login($owner);

        // Seed Branches
        $branchMain = Branch::create([
            'name' => 'Cabang Utama',
            'address' => 'Jl. Sudirman No. 123, Jakarta',
            'phone' => '021-1234567',
        ]);

        $branchGading = Branch::create([
            'name' => 'Kelapa Gading',
            'address' => 'Jl. Boulevard Raya, Jakarta',
            'phone' => '021-7654321',
        ]);

        // Seed Categories
        $catBeverages = Category::create([
            'name' => 'Minuman',
            'slug' => Str::slug('Minuman'),
        ]);

        $catFood = Category::create([
            'name' => 'Makanan',
            'slug' => Str::slug('Makanan'),
        ]);

        // Seed Products
        $product1 = Product::create([
            'category_id' => $catBeverages->id,
            'sku' => 'BEV-001',
            'barcode' => '899123456001',
            'name' => 'Kopi Susu Gula Aren',
            'cost_price' => 8000,
            'sell_price' => 18000,
            'rop' => 20,
            'unit' => 'cup',
        ]);
        $product1->branches()->sync([
            $branchMain->id => ['stock' => 150],
            $branchGading->id => ['stock' => 75],
        ]);

        $product2 = Product::create([
            'category_id' => $catFood->id,
            'sku' => 'FOD-001',
            'barcode' => '899123456002',
            'name' => 'Roti Bakar Coklat Keju',
            'cost_price' => 12000,
            'sell_price' => 25000,
            'rop' => 10,
            'unit' => 'pcs',
        ]);
        $product2->branches()->sync([
            $branchMain->id => ['stock' => 50],
            $branchGading->id => ['stock' => 30],
        ]);
    }
}
