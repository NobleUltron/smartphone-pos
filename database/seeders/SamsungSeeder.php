<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class SamsungSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $samsungBrand = \App\Models\Brand::where('name', 'Samsung')->first();
        $smartphoneCategory = \App\Models\Category::where('name', 'Smartphones')->first();

        if (!$samsungBrand || !$smartphoneCategory) {
            $this->command->warn('Samsung brand or Smartphones category not found.');
            return;
        }

        $samsungs = [
            'Galaxy S9', 'Galaxy S9+',
            'Galaxy S10e', 'Galaxy S10', 'Galaxy S10+', 'Galaxy S10 5G', 'Galaxy Fold',
            'Galaxy S20', 'Galaxy S20+', 'Galaxy S20 Ultra', 'Galaxy S20 FE', 'Galaxy Z Flip', 'Galaxy Z Flip 5G', 'Galaxy Z Fold2 5G',
            'Galaxy S21', 'Galaxy S21+', 'Galaxy S21 Ultra', 'Galaxy Z Fold3 5G', 'Galaxy Z Flip3 5G', 'Galaxy Z Flip3 Bespoke Edition',
            'Galaxy S21 FE', 'Galaxy S22', 'Galaxy S22+', 'Galaxy S22 Ultra', 'Galaxy Z Fold4', 'Galaxy Z Flip4',
            'Galaxy S23', 'Galaxy S23+', 'Galaxy S23 Ultra', 'Galaxy S23 FE', 'Galaxy Z Fold5', 'Galaxy Z Flip5',
            'Galaxy S24', 'Galaxy S24+', 'Galaxy S24 Ultra', 'Galaxy S24 FE', 'Galaxy Z Fold6', 'Galaxy Z Flip6', 'Galaxy Z Fold Special Edition',
            'Galaxy S25', 'Galaxy S25+', 'Galaxy S25 Ultra', 'Galaxy Z Fold7', 'Galaxy Z Flip7', 'Galaxy Z Flip7 FE',
            'Galaxy S26', 'Galaxy S26+', 'Galaxy S26 Ultra', 'Galaxy Z Fold8', 'Galaxy Z Fold8 Ultra', 'Galaxy Z Flip8'
        ];

        foreach ($samsungs as $samsung) {
            \App\Models\Product::firstOrCreate([
                'category_id' => $smartphoneCategory->id,
                'brand_id' => $samsungBrand->id,
                'model_name' => $samsung
            ]);
        }
        
        $this->command->info('Samsung devices seeded successfully.');
    }
}
