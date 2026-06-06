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
            ['name' => 'Antapani Point', 'address' => 'Jl. Antapani Tengah No. 19, Bandung', 'phone' => '022-3000333'],
            ['name' => 'Dago Creative', 'address' => 'Jl. Ir. H. Juanda No. 121, Bandung', 'phone' => '022-3000444'],
            ['name' => 'Cimahi Hub', 'address' => 'Jl. Gandawijaya No. 42, Cimahi', 'phone' => '022-3000555'],
        ];

        $branches = collect($branchSeeds)->map(fn ($branch) => Branch::updateOrCreate(
            ['tenant_id' => $tenant->id, 'name' => $branch['name']],
            ['address' => $branch['address'], 'phone' => $branch['phone']]
        ))->values();

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
            'Frozen Food',
            'Bakery',
            'Dairy',
            'Produce',
        ];

        $categories = collect($categoryNames)->mapWithKeys(fn ($name) => [
            $name => Category::updateOrCreate(
                ['tenant_id' => $tenant->id, 'slug' => Str::slug($name)],
                ['name' => $name]
            ),
        ]);

        $products = [
            ['BEV-101', 'Cold Brew 1L', '899880010101', 'Beverages', 21000, 32000, 18, 'bottle', [58, 42, 33, 27, 19]],
            ['BEV-102', 'Lemon Syrup 600ml', '899880010102', 'Beverages', 14500, 24500, 12, 'bottle', [24, 16, 10, 8, 7]],
            ['BEV-103', 'Mineral Water 600ml', '899880010103', 'Beverages', 2300, 4500, 50, 'bottle', [180, 130, 115, 90, 72]],
            ['BEV-104', 'Iced Tea Peach 350ml', '899880010104', 'Beverages', 5500, 9500, 32, 'can', [95, 70, 52, 44, 38]],
            ['BEV-105', 'Coconut Water 330ml', '899880010105', 'Beverages', 7200, 12500, 25, 'can', [75, 45, 30, 28, 21]],
            ['BEV-106', 'Sparkling Apple 250ml', '899880010106', 'Beverages', 8400, 14500, 20, 'can', [64, 42, 23, 20, 16]],
            ['SNK-201', 'Cassava Chips 150g', '899880010201', 'Snacks', 6500, 12000, 25, 'pack', [90, 68, 45, 40, 28]],
            ['SNK-202', 'Banana Chips 120g', '899880010202', 'Snacks', 7000, 13500, 22, 'pack', [70, 44, 35, 24, 20]],
            ['SNK-203', 'Roasted Peanuts 200g', '899880010203', 'Snacks', 10500, 18000, 18, 'pack', [55, 38, 26, 20, 14]],
            ['SNK-204', 'Chocolate Wafer Box', '899880010204', 'Snacks', 18500, 28500, 16, 'box', [50, 33, 22, 18, 12]],
            ['SNK-205', 'Popcorn Caramel 90g', '899880010205', 'Snacks', 6400, 11500, 20, 'pack', [68, 48, 36, 25, 16]],
            ['STP-301', 'Pandan Rice 5kg', '899880010301', 'Staples', 59000, 74000, 20, 'bag', [36, 28, 20, 12, 8]],
            ['STP-302', 'Cooking Oil 2L', '899880010302', 'Staples', 27500, 36500, 24, 'pouch', [72, 48, 35, 24, 18]],
            ['STP-303', 'Granulated Sugar 1kg', '899880010303', 'Staples', 12500, 17000, 35, 'pack', [110, 80, 65, 46, 32]],
            ['STP-304', 'Sea Salt 500g', '899880010304', 'Staples', 4200, 7500, 40, 'pack', [120, 88, 70, 52, 41]],
            ['STP-305', 'Instant Noodles Kari', '899880010305', 'Staples', 2300, 3800, 80, 'pcs', [260, 210, 160, 120, 90]],
            ['HOM-401', 'Dish Soap 800ml', '899880010401', 'Household', 9800, 16000, 30, 'bottle', [95, 68, 44, 36, 30]],
            ['HOM-402', 'Laundry Detergent 1kg', '899880010402', 'Household', 18500, 28500, 24, 'pack', [70, 46, 30, 24, 17]],
            ['HOM-403', 'Receipt Paper 58mm', '899880010403', 'Household', 3200, 6500, 40, 'roll', [60, 36, 18, 14, 10]],
            ['HOM-404', 'Trash Bag Medium', '899880010404', 'Household', 7600, 13500, 28, 'pack', [82, 60, 44, 30, 20]],
            ['HOM-405', 'Floor Cleaner 780ml', '899880010405', 'Household', 11800, 19500, 25, 'bottle', [72, 55, 31, 25, 18]],
            ['PER-501', 'Hand Sanitizer 250ml', '899880010501', 'Personal Care', 10800, 18500, 20, 'bottle', [58, 36, 20, 16, 10]],
            ['PER-502', 'Toothpaste Mint 160g', '899880010502', 'Personal Care', 10500, 17500, 26, 'tube', [82, 64, 46, 34, 20]],
            ['PER-503', 'Shampoo Fresh 340ml', '899880010503', 'Personal Care', 18000, 29500, 18, 'bottle', [54, 38, 25, 20, 12]],
            ['PER-504', 'Body Wash Sakura 450ml', '899880010504', 'Personal Care', 19500, 32500, 18, 'bottle', [48, 32, 22, 18, 11]],
            ['FRZ-601', 'Chicken Nugget 500g', '899880010601', 'Frozen Food', 28500, 42500, 16, 'pack', [44, 30, 20, 18, 8]],
            ['FRZ-602', 'Frozen French Fries 1kg', '899880010602', 'Frozen Food', 25000, 39000, 14, 'pack', [36, 25, 18, 14, 6]],
            ['FRZ-603', 'Beef Meatball 500g', '899880010603', 'Frozen Food', 32000, 48000, 12, 'pack', [34, 24, 18, 12, 5]],
            ['BAK-701', 'Butter Croissant', '899880010701', 'Bakery', 6500, 12500, 18, 'pcs', [52, 38, 24, 18, 12]],
            ['BAK-702', 'Chocolate Muffin', '899880010702', 'Bakery', 7200, 14000, 16, 'pcs', [45, 32, 21, 16, 9]],
            ['BAK-703', 'Sourdough Loaf', '899880010703', 'Bakery', 18500, 32000, 10, 'loaf', [24, 17, 10, 8, 4]],
            ['DRY-801', 'Fresh Milk 1L', '899880010801', 'Dairy', 15000, 23500, 22, 'carton', [65, 42, 30, 24, 14]],
            ['DRY-802', 'Greek Yogurt 200g', '899880010802', 'Dairy', 11500, 19500, 18, 'cup', [52, 36, 22, 18, 9]],
            ['DRY-803', 'Cheddar Cheese 165g', '899880010803', 'Dairy', 18000, 29500, 14, 'pack', [42, 26, 18, 12, 7]],
            ['PRD-901', 'Fuji Apple 1kg', '899880010901', 'Produce', 26000, 39000, 12, 'bag', [38, 24, 16, 12, 8]],
            ['PRD-902', 'Organic Banana 1kg', '899880010902', 'Produce', 15000, 24000, 16, 'bunch', [54, 36, 25, 18, 10]],
            ['PRD-903', 'Hydroponic Lettuce', '899880010903', 'Produce', 9000, 16500, 14, 'pack', [34, 22, 15, 10, 6]],
            ['PRD-904', 'Cherry Tomato 250g', '899880010904', 'Produce', 10500, 19000, 14, 'pack', [36, 24, 17, 12, 7]],
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
            'image_path' => $this->demoImageUrl($item[3], $item[0]),
        ])->all();

        foreach ($normalizedProducts as $item) {
            $product = Product::updateOrCreate(
                ['tenant_id' => $tenant->id, 'sku' => $item['sku']],
                [
                    'category_id' => $categories[$item['category']]->id,
                    'barcode' => $item['barcode'],
                    'name' => $item['name'],
                    'description' => "Demo product for {$item['category']} category.",
                    'image_path' => $item['image_path'],
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

        Order::where('tenant_id', $tenant->id)->delete();

        $productMap = Product::whereIn('sku', array_column($normalizedProducts, 'sku'))->get()->keyBy('sku');
        $branchMap = $branches->keyBy('name');
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
            $dailyOrderCount = 5 + ($date->day % 6);

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

    private function demoImageUrl(string $category, string $sku): string
    {
        $photos = [
            'Beverages' => [
                '1544145945-f90425340c7e',
                '1523362628745-0c100150b504',
                '1497534446932-c925b458314e',
            ],
            'Snacks' => [
                '1621939514649-280e2ee25f60',
                '1606787366850-de6330128bfc',
                '1589723955941-7d1e597e1396',
            ],
            'Staples' => [
                '1586201375761-83865001e31c',
                '1509440159596-0249088772ff',
                '1516684669134-de6f7c473a2a',
            ],
            'Household' => [
                '1585421514284-efb74c2b69ba',
                '1622483767028-3f66f32aef97',
                '1527515637462-cff94eecc1ac',
            ],
            'Personal Care' => [
                '1556228720-195a672e8a03',
                '1608248597279-f99d160bfcbc',
                '1596462502278-27bfdc403348',
            ],
            'Frozen Food' => [
                '1604908176997-125f25cc6f3d',
                '1603046891744-76179c4cc520',
                '1598515214211-89d3c73ae83b',
            ],
            'Bakery' => [
                '1509440159596-0249088772ff',
                '1567932046448-0edc4c7e4a7b',
                '1549931319-a545dcf3bc73',
            ],
            'Dairy' => [
                '1550583724-b2692b85b150',
                '1628088062854-d1870b4553da',
                '1488477181946-6428a0291777',
            ],
            'Produce' => [
                '1542838132-92c53300491e',
                '1610832958506-aa56368176cf',
                '1518843875459-f738682238a6',
            ],
        ];

        $categoryPhotos = $photos[$category] ?? $photos['Produce'];
        $photoId = $categoryPhotos[abs(crc32($sku)) % count($categoryPhotos)];

        return "https://images.unsplash.com/photo-{$photoId}?auto=format&fit=crop&w=600&q=80";
    }
}
