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

        $password = Hash::make('password');

        $owner = User::updateOrCreate(
            ['email' => 'owner@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Reza Pratama',
                'password' => $password,
                'role' => 'owner',
            ]
        );

        User::updateOrCreate(
            ['email' => 'manager@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Nadia Lestari',
                'password' => $password,
                'role' => 'manager',
            ]
        );

        User::updateOrCreate(
            ['email' => 'cashier@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Fikri Maulana',
                'password' => $password,
                'role' => 'cashier',
            ]
        );

        User::updateOrCreate(
            ['email' => 'viewer@napos.id'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Mira Anggraini',
                'password' => $password,
                'role' => 'viewer',
            ]
        );

        $branches = [
            Branch::updateOrCreate(['name' => 'Pusat Bandung'], ['address' => 'Jl. Asia Afrika No. 88, Bandung', 'phone' => '022-3000111']),
            Branch::updateOrCreate(['name' => 'Kopo Square'], ['address' => 'Jl. Kopo Permai Blok B2, Bandung', 'phone' => '022-3000222']),
            Branch::updateOrCreate(['name' => 'Antapani Point'], ['address' => 'Jl. Antapani Tengah No. 19, Bandung', 'phone' => '022-3000333']),
        ];

        $categories = [
            'Beverages' => Category::updateOrCreate(['slug' => Str::slug('Beverages')], ['name' => 'Beverages']),
            'Snacks' => Category::updateOrCreate(['slug' => Str::slug('Snacks')], ['name' => 'Snacks']),
            'Staples' => Category::updateOrCreate(['slug' => Str::slug('Staples')], ['name' => 'Staples']),
            'Household' => Category::updateOrCreate(['slug' => Str::slug('Household')], ['name' => 'Household']),
        ];

        $products = [
            ['sku' => 'BEV-101', 'name' => 'Cold Brew 1L', 'barcode' => '899880010101', 'category' => 'Beverages', 'cost_price' => 21000, 'sell_price' => 32000, 'rop' => 18, 'unit' => 'bottle', 'stocks' => [45, 25, 16]],
            ['sku' => 'BEV-102', 'name' => 'Lemon Syrup 600ml', 'barcode' => '899880010102', 'category' => 'Beverages', 'cost_price' => 14500, 'sell_price' => 24500, 'rop' => 12, 'unit' => 'bottle', 'stocks' => [12, 8, 4]],
            ['sku' => 'SNK-205', 'name' => 'Cassava Chips 150g', 'barcode' => '899880010205', 'category' => 'Snacks', 'cost_price' => 6500, 'sell_price' => 12000, 'rop' => 25, 'unit' => 'pack', 'stocks' => [60, 34, 22]],
            ['sku' => 'STP-301', 'name' => 'Pandan Rice 5kg', 'barcode' => '899880010301', 'category' => 'Staples', 'cost_price' => 59000, 'sell_price' => 74000, 'rop' => 20, 'unit' => 'bag', 'stocks' => [22, 14, 7]],
            ['sku' => 'HOM-411', 'name' => 'Dish Soap 800ml', 'barcode' => '899880010411', 'category' => 'Household', 'cost_price' => 9800, 'sell_price' => 16000, 'rop' => 30, 'unit' => 'bottle', 'stocks' => [80, 48, 35]],
            ['sku' => 'HOM-412', 'name' => 'Receipt Paper 58mm', 'barcode' => '899880010412', 'category' => 'Household', 'cost_price' => 3200, 'sell_price' => 6500, 'rop' => 40, 'unit' => 'roll', 'stocks' => [36, 22, 6]],
        ];

        foreach ($products as $item) {
            $product = Product::updateOrCreate(
                ['sku' => $item['sku']],
                [
                    'category_id' => $categories[$item['category']]->id,
                    'barcode' => $item['barcode'],
                    'name' => $item['name'],
                    'cost_price' => $item['cost_price'],
                    'sell_price' => $item['sell_price'],
                    'rop' => $item['rop'],
                    'unit' => $item['unit'],
                ]
            );

            $product->branches()->sync([
                $branches[0]->id => ['stock' => $item['stocks'][0]],
                $branches[1]->id => ['stock' => $item['stocks'][1]],
                $branches[2]->id => ['stock' => $item['stocks'][2]],
            ]);
        }

        // Recreate demo orders so dashboard API always has rich data.
        Order::where('tenant_id', $tenant->id)->delete();

        $productMap = Product::whereIn('sku', array_column($products, 'sku'))->get()->keyBy('sku');
        $branchMap = collect($branches)->keyBy('name');
        $baseStocks = collect($products)->mapWithKeys(function ($p) {
            return [
                $p['sku'] => [
                    'Pusat Bandung' => $p['stocks'][0],
                    'Kopo Square' => $p['stocks'][1],
                    'Antapani Point' => $p['stocks'][2],
                ],
            ];
        });
        $stockBook = $baseStocks->toArray();

        $paymentMethods = ['cash', 'qris', 'transfer'];
        $customerNames = ['Pelanggan Umum', 'Toko Rafi', 'Ibu Nisa', 'Pak Aldi', 'Online Order', 'Reseller Mitra'];
        $productSkus = array_column($products, 'sku');

        $start = Carbon::now()->startOfMonth();
        $endDay = min(Carbon::now()->day, 30);
        $orderNo = 1;

        for ($day = 1; $day <= $endDay; $day++) {
            $date = $start->copy()->day($day)->setTime(9, 0);
            $dailyOrderCount = 3 + ($day % 4); // 3-6 orders/day

            for ($n = 0; $n < $dailyOrderCount; $n++) {
                $branchName = $day % 3 === 0 ? 'Antapani Point' : ($n % 2 === 0 ? 'Pusat Bandung' : 'Kopo Square');
                $branchId = $branchMap[$branchName]->id;

                $itemCount = 1 + (($day + $n) % 3); // 1-3 items/order
                $selectedSkus = array_slice(array_merge($productSkus, $productSkus), ($day + $n) % count($productSkus), $itemCount);

                $orderItems = [];
                $total = 0;

                foreach ($selectedSkus as $sku) {
                    $prod = $productMap[$sku];
                    $qty = 1 + (($orderNo + strlen($sku)) % 3); // qty 1-3
                    $price = (float) $prod->sell_price;
                    $subtotal = $price * $qty;
                    $total += $subtotal;

                    $orderItems[] = [
                        'product_id' => $prod->id,
                        'quantity' => $qty,
                        'price' => $price,
                        'subtotal' => $subtotal,
                    ];

                    $currentStock = $stockBook[$sku][$branchName];
                    $stockBook[$sku][$branchName] = max(0, $currentStock - $qty);
                }

                $order = Order::create([
                    'tenant_id' => $tenant->id,
                    'branch_id' => $branchId,
                    'user_id' => $owner->id,
                    'customer_name' => $customerNames[($orderNo + $day) % count($customerNames)],
                    'total_amount' => $total,
                    'status' => 'completed',
                    'payment_method' => $paymentMethods[($orderNo + $n) % count($paymentMethods)],
                    'created_at' => $date->copy()->addMinutes($n * 25),
                    'updated_at' => $date->copy()->addMinutes($n * 25),
                ]);

                $order->items()->createMany($orderItems);
                $orderNo++;
            }
        }

        // Persist adjusted stocks after simulated sales.
        foreach ($productMap as $sku => $prod) {
            $prod->branches()->syncWithoutDetaching([
                $branchMap['Pusat Bandung']->id => ['stock' => $stockBook[$sku]['Pusat Bandung']],
                $branchMap['Kopo Square']->id => ['stock' => $stockBook[$sku]['Kopo Square']],
                $branchMap['Antapani Point']->id => ['stock' => $stockBook[$sku]['Antapani Point']],
            ]);
        }
    }
}
