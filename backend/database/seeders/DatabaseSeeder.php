<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $tenant = Tenant::updateOrCreate(
            ['slug' => 'nusa-mart-sentosa'],
            [
                'name' => 'Nusa Mart Sentosa',
                'plan' => 'growth',
                'is_active' => true,
            ]
        );

        Order::where('tenant_id', $tenant->id)->delete();

        $password = Hash::make('password');

        $owner = User::updateOrCreate(
            ['email' => 'owner@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Reza Pratama',
                'password' => $password,
                'role' => 'owner',
                'branch_id' => null,
            ]
        );

        User::updateOrCreate(
            ['email' => 'manager@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Nadia Lestari',
                'password' => $password,
                'role' => 'manager',
                'branch_id' => null,
            ]
        );

        $branchSeeds = [
            ['name' => 'Pusat Bandung', 'address' => 'Jl. Asia Afrika No. 88, Bandung', 'phone' => '022-3000111'],
            ['name' => 'Kopo Square', 'address' => 'Jl. Kopo Permai Blok B2, Bandung', 'phone' => '022-3000222'],
        ];

        $branches = collect($branchSeeds)->map(fn ($branch) => Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'name' => $branch['name']],
            ['address' => $branch['address'], 'phone' => $branch['phone']]
        ))->values();

        Branch::where('tenant_id', $tenant->id)
            ->whereNotIn('name', $branches->pluck('name'))
            ->delete();

        $cashier = User::updateOrCreate(
            ['email' => 'cashier@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Fikri Maulana',
                'password' => $password,
                'role' => 'cashier',
                'branch_id' => $branches[0]->id,
            ]
        );

        User::updateOrCreate(
            ['email' => 'cashier-kopo@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Syamsuddin Ula',
                'password' => $password,
                'role' => 'cashier',
                'branch_id' => $branches[1]->id,
            ]
        );

        User::where('email', 'viewer@napos.id')->delete();

        $categoryNames = [
            'Beverages',
            'Snacks',
            'Staples',
            'Household',
            'Personal Care',
        ];

        $categories = collect($categoryNames)->mapWithKeys(fn ($name) => [
            $name => Category::updateOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => Str::slug($name)],
                ['name' => $name]
            ),
        ]);

        Category::where('tenant_id', $tenant->id)
            ->whereIn('slug', ['frozen-food', 'bakery', 'dairy', 'produce'])
            ->delete();

        $products = [
            ['BEV-101', 'Cold Brew 1L', '899880010101', 'Beverages', 21000, 32000, 18, 'bottle', [58, 42]],
            ['BEV-102', 'Mineral Water 600ml', '899880010102', 'Beverages', 2300, 4500, 50, 'bottle', [180, 130]],
            ['BEV-103', 'Iced Tea Peach 350ml', '899880010103', 'Beverages', 5500, 9500, 32, 'can', [95, 70]],
            ['SNK-201', 'Cassava Chips 150g', '899880010201', 'Snacks', 6500, 12000, 25, 'pack', [90, 68]],
            ['SNK-202', 'Banana Chips 120g', '899880010202', 'Snacks', 7000, 13500, 22, 'pack', [70, 44]],
            ['SNK-203', 'Chocolate Wafer Box', '899880010203', 'Snacks', 18500, 28500, 16, 'box', [50, 33]],
            ['STP-301', 'Pandan Rice 5kg', '899880010301', 'Staples', 59000, 74000, 20, 'bag', [36, 28]],
            ['STP-302', 'Cooking Oil 2L', '899880010302', 'Staples', 27500, 36500, 24, 'pouch', [72, 48]],
            ['STP-303', 'Instant Noodles Kari', '899880010303', 'Staples', 2300, 3800, 80, 'pcs', [260, 210]],
            ['HOM-401', 'Dish Soap 800ml', '899880010401', 'Household', 9800, 16000, 30, 'bottle', [95, 68]],
            ['HOM-402', 'Receipt Paper 58mm', '899880010402', 'Household', 3200, 6500, 40, 'roll', [60, 36]],
            ['PER-501', 'Hand Sanitizer 250ml', '899880010501', 'Personal Care', 10800, 18500, 20, 'bottle', [58, 36]],
        ];

        $normalizedProducts = collect($products)->map(fn ($item) => [
            'sku' => $item[0],
            'name' => $item[1],
            'barcode' => $item[2],
            'category' => $item[3],
            'cost_price' => $item[4],
            'sell_price' => $item[5],
            'rop' => $item[6],
            'unit' => $item[7],
            'stocks' => $item[8],
        ])->all();

        $currentSeedSkus = array_column($normalizedProducts, 'sku');
        Product::where('tenant_id', $tenant->id)
            ->where(function ($query) {
                $query
                    ->where('sku', 'like', 'BEV-%')
                    ->orWhere('sku', 'like', 'SNK-%')
                    ->orWhere('sku', 'like', 'STP-%')
                    ->orWhere('sku', 'like', 'HOM-%')
                    ->orWhere('sku', 'like', 'PER-%')
                    ->orWhere('sku', 'like', 'FRZ-%')
                    ->orWhere('sku', 'like', 'BAK-%')
                    ->orWhere('sku', 'like', 'DRY-%')
                    ->orWhere('sku', 'like', 'PRD-%');
            })
            ->whereNotIn('sku', $currentSeedSkus)
            ->delete();

        foreach ($normalizedProducts as $item) {
            $product = Product::updateOrCreate(
                ['tenant_id' => $tenant->id, 'sku' => $item['sku']],
                [
                    'category_id' => $categories[$item['category']]->id,
                    'barcode' => $item['barcode'],
                    'name' => $item['name'],
                    'description' => "Demo product for {$item['category']} category.",
                    'image_path' => null,
                    'cost_price' => $item['cost_price'],
                    'sell_price' => $item['sell_price'],
                    'rop' => $item['rop'],
                    'unit' => $item['unit'],
                    'status' => 'active',
                ]
            );

            $syncStocks = [];
            foreach ($branches as $index => $branch) {
                $syncStocks[$branch->id] = ['stock' => $item['stocks'][$index] ?? 0];
            }
            $product->branches()->sync($syncStocks);
        }

        $productMap = Product::whereIn('sku', array_column($normalizedProducts, 'sku'))->get()->keyBy('sku');
        $baseStocks = collect($normalizedProducts)->mapWithKeys(fn ($product) => [
            $product['sku'] => $branches->mapWithKeys(fn ($branch, $index) => [
                $branch->name => $product['stocks'][$index] ?? 0,
            ])->all(),
        ]);
        $stockBook = $baseStocks->toArray();

        $paymentMethods = ['cash', 'qris', 'transfer'];
        $customerNames = [
            'Pelanggan Umum',
            'Toko Rafi',
            'Ibu Nisa',
            'Pak Aldi',
            'Online Order',
            'Reseller Mitra',
            'Kantin Bu Mira',
            'Komunitas Dago',
            'Grab Pickup',
            'Shopee Food',
        ];
        $productSkus = array_column($normalizedProducts, 'sku');

        $start = Carbon::now()->subMonthsNoOverflow(2)->startOfMonth();
        $end = Carbon::now();
        $orderNo = 1;

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            $dailyOrderCount = 2 + ($date->day % 3);

            for ($n = 0; $n < $dailyOrderCount; $n++) {
                $branch = $branches[($date->day + $n) % $branches->count()];
                $branchId = $branch->id;
                $branchName = $branch->name;
                $itemCount = 1 + (($date->day + $n) % 4);
                $offset = ($date->day * 3 + $n * 5) % count($productSkus);
                $selectedSkus = array_slice(array_merge($productSkus, $productSkus), $offset, $itemCount);
                $orderItems = [];
                $total = 0;

                foreach ($selectedSkus as $sku) {
                    $prod = $productMap[$sku];
                    $qty = 1 + (($orderNo + strlen($sku)) % 3);
                    $price = (float) $prod->sell_price;
                    $discount = ($orderNo % 11 === 0) ? min($price * $qty, 2000 * $qty) : 0;
                    $subtotal = ($price * $qty) - $discount;
                    $total += $subtotal;

                    $orderItems[] = [
                        'product_id' => $prod->id,
                        'quantity' => $qty,
                        'price' => $price,
                        'subtotal' => $subtotal,
                    ];

                    $stockBook[$sku][$branchName] = max(0, $stockBook[$sku][$branchName] - $qty);
                }

                $timestamp = $date->copy()->setTime(8 + ($n % 12), ($n * 11) % 60);
                $order = Order::create([
                    'tenant_id' => $tenant->id,
                    'branch_id' => $branchId,
                    'user_id' => $cashier->id,
                    'customer_name' => $customerNames[($orderNo + $date->day) % count($customerNames)],
                    'total_amount' => $total,
                    'status' => 'completed',
                    'payment_method' => $paymentMethods[($orderNo + $n) % count($paymentMethods)],
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ]);

                $order->items()->createMany($orderItems);
                $orderNo++;
            }
        }

        foreach ($productMap as $sku => $prod) {
            $syncStocks = [];
            foreach ($branches as $branch) {
                $syncStocks[$branch->id] = ['stock' => $stockBook[$sku][$branch->name]];
            }
            $prod->branches()->syncWithoutDetaching($syncStocks);
        }
    }
}
