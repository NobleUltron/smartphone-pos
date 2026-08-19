<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $appleBrand = \App\Models\Brand::where('name', 'Apple')->first();
        $smartphoneCategory = \App\Models\Category::where('name', 'Smartphones')->first();

        if (!$appleBrand || !$smartphoneCategory) {
            $this->command->warn('Apple brand or Smartphones category not found. Make sure BrandSeeder and CategorySeeder have run.');
            return;
        }

        $iphones = [
            'iPhone 6', 'iPhone 6 Plus',
            'iPhone 6s', 'iPhone 6s Plus',
            'iPhone SE (1st generation)', 'iPhone 7', 'iPhone 7 Plus',
            'iPhone 8', 'iPhone 8 Plus', 'iPhone X',
            'iPhone XR', 'iPhone XS', 'iPhone XS Max',
            'iPhone 11', 'iPhone 11 Pro', 'iPhone 11 Pro Max',
            'iPhone SE (2nd generation)', 'iPhone 12 mini', 'iPhone 12', 'iPhone 12 Pro', 'iPhone 12 Pro Max',
            'iPhone 13 mini', 'iPhone 13', 'iPhone 13 Pro', 'iPhone 13 Pro Max',
            'iPhone SE (3rd generation)', 'iPhone 14', 'iPhone 14 Plus', 'iPhone 14 Pro', 'iPhone 14 Pro Max',
            'iPhone 15', 'iPhone 15 Plus', 'iPhone 15 Pro', 'iPhone 15 Pro Max',
        ];

        foreach ($iphones as $iphone) {
            \App\Models\Product::firstOrCreate([
                'category_id' => $smartphoneCategory->id,
                'brand_id' => $appleBrand->id,
                'model_name' => $iphone
            ]);
        }
    }
}
