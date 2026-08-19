<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;

class ProductModelSeeder extends Seeder
{
    public function run()
    {
        $products = [
            // Apple
            ['category_id' => 1, 'brand_id' => 1, 'model_name' => 'iPhone 15 Pro Max', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 1, 'model_name' => 'iPhone 15 Pro', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 1, 'model_name' => 'iPhone 15', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 1, 'model_name' => 'iPhone 14 Pro Max', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 1, 'model_name' => 'iPhone 13', 'type' => 'serialized'],
            ['category_id' => 4, 'brand_id' => 1, 'model_name' => 'iPad Pro 12.9 (M2)', 'type' => 'serialized'],
            ['category_id' => 4, 'brand_id' => 1, 'model_name' => 'iPad Air (M1)', 'type' => 'serialized'],
            ['category_id' => 6, 'brand_id' => 1, 'model_name' => 'AirPods Pro (2nd Gen)', 'type' => 'bulk'],
            ['category_id' => 8, 'brand_id' => 1, 'model_name' => '20W USB-C Power Adapter', 'type' => 'bulk'],
            ['category_id' => 7, 'brand_id' => 1, 'model_name' => 'Watch Series 9', 'type' => 'serialized'],

            // Samsung
            ['category_id' => 1, 'brand_id' => 2, 'model_name' => 'Galaxy S24 Ultra', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 2, 'model_name' => 'Galaxy S24+', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 2, 'model_name' => 'Galaxy S24', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 2, 'model_name' => 'Galaxy Z Fold 5', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 2, 'model_name' => 'Galaxy Z Flip 5', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 2, 'model_name' => 'Galaxy A54', 'type' => 'serialized'],
            ['category_id' => 2, 'brand_id' => 2, 'model_name' => 'Galaxy Tab S9 Ultra', 'type' => 'serialized'],
            ['category_id' => 6, 'brand_id' => 2, 'model_name' => 'Galaxy Buds 2 Pro', 'type' => 'bulk'],
            ['category_id' => 7, 'brand_id' => 2, 'model_name' => 'Galaxy Watch 6 Classic', 'type' => 'serialized'],

            // Tecno
            ['category_id' => 1, 'brand_id' => 3, 'model_name' => 'Phantom V Fold', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 3, 'model_name' => 'Camon 20 Pro', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 3, 'model_name' => 'Spark 20', 'type' => 'serialized'],

            // Infinix
            ['category_id' => 1, 'brand_id' => 10, 'model_name' => 'Note 30 VIP', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 10, 'model_name' => 'Hot 40 Pro', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 10, 'model_name' => 'Zero 30 5G', 'type' => 'serialized'],

            // Itel
            ['category_id' => 1, 'brand_id' => 11, 'model_name' => 'S23+', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 11, 'model_name' => 'P40', 'type' => 'serialized'],

            // Google
            ['category_id' => 1, 'brand_id' => 4, 'model_name' => 'Pixel 8 Pro', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 4, 'model_name' => 'Pixel 8', 'type' => 'serialized'],

            // Xiaomi
            ['category_id' => 1, 'brand_id' => 5, 'model_name' => '14 Pro', 'type' => 'serialized'],
            ['category_id' => 1, 'brand_id' => 5, 'model_name' => 'Redmi Note 13 Pro', 'type' => 'serialized'],

            // Oraimo (Accessories)
            ['category_id' => 6, 'brand_id' => 18, 'model_name' => 'FreePods 4', 'type' => 'bulk'],
            ['category_id' => 8, 'brand_id' => 18, 'model_name' => '20000mAh Power Bank', 'type' => 'bulk'],
            ['category_id' => 7, 'brand_id' => 18, 'model_name' => 'Watch 2 Pro', 'type' => 'serialized'],

            // JBL
            ['category_id' => 6, 'brand_id' => 16, 'model_name' => 'Flip 6', 'type' => 'bulk'],
            ['category_id' => 6, 'brand_id' => 16, 'model_name' => 'Charge 5', 'type' => 'bulk'],
            ['category_id' => 6, 'brand_id' => 16, 'model_name' => 'Wave Buds', 'type' => 'bulk'],

            // Anker
            ['category_id' => 8, 'brand_id' => 17, 'model_name' => 'PowerCore 10000', 'type' => 'bulk'],
            ['category_id' => 8, 'brand_id' => 17, 'model_name' => 'Nano Pro 20W', 'type' => 'bulk'],

            // Sony
            ['category_id' => 20, 'brand_id' => 15, 'model_name' => 'PlayStation 5', 'type' => 'serialized'],
            ['category_id' => 6, 'brand_id' => 15, 'model_name' => 'WH-1000XM5', 'type' => 'bulk'],

            // Microsoft
            ['category_id' => 20, 'brand_id' => 24, 'model_name' => 'Xbox Series X', 'type' => 'serialized'],
            ['category_id' => 20, 'brand_id' => 24, 'model_name' => 'Xbox Series S', 'type' => 'serialized'],
            
            // Oppo
            ['category_id' => 1, 'brand_id' => 7, 'model_name' => 'Reno 11 Pro', 'type' => 'serialized'],
            
            // Vivo
            ['category_id' => 1, 'brand_id' => 8, 'model_name' => 'V30 Pro', 'type' => 'serialized'],
            
            // Huawei
            ['category_id' => 1, 'brand_id' => 6, 'model_name' => 'Mate 60 Pro', 'type' => 'serialized'],
            
            // OnePlus
            ['category_id' => 1, 'brand_id' => 9, 'model_name' => 'OnePlus 12', 'type' => 'serialized'],
            
            // HP
            ['category_id' => 11, 'brand_id' => 21, 'model_name' => 'Spectre x360', 'type' => 'serialized'],
            
            // Dell
            ['category_id' => 11, 'brand_id' => 22, 'model_name' => 'XPS 13', 'type' => 'serialized'],
        ];

        foreach ($products as $p) {
            Product::firstOrCreate(
                ['model_name' => $p['model_name'], 'brand_id' => $p['brand_id']],
                $p
            );
        }
    }
}
