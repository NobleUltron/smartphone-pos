<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class BrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $brands = [
            'Apple',
            'Samsung',
            'Google',
            'Xiaomi',
            'Huawei',
            'Oppo',
            'Vivo',
            'OnePlus',
            'Tecno',
            'Infinix',
            'Itel',
            'Motorola',
            'Nokia',
            'Realme',
            'Sony',
            'JBL',
            'Anker',
            'Oraimo',
            'Baseus',
            'Bose',
            'HP',
            'Dell',
            'Lenovo',
        ];

        foreach ($brands as $brand) {
            \App\Models\Brand::firstOrCreate(['name' => $brand]);
        }
    }
}
