<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'Smartphones', 'description' => 'Mobile phones including iPhones, Androids, and feature phones'],
            ['name' => 'Tablets & iPads', 'description' => 'Apple iPads, Android tablets, and e-readers'],
            ['name' => 'Audio & Sound', 'description' => 'AirPods, headphones, portable speakers, and earphones'],
            ['name' => 'Wearables', 'description' => 'Smartwatches and fitness trackers'],
            ['name' => 'Charging & Power', 'description' => 'Power banks, wall adapters, wireless chargers, and cables'],
            ['name' => 'Cases & Protection', 'description' => 'Phone cases, covers, and screen protectors'],
            ['name' => 'Storage Devices', 'description' => 'MicroSD cards, USB flash drives, and external hard drives'],
            ['name' => 'Laptops & Computers', 'description' => 'MacBooks, Chromebooks, and computer accessories'],
            ['name' => 'Networking', 'description' => 'Portable MiFi devices and wireless routers'],
            ['name' => 'Repair Parts & Services', 'description' => 'Replacement batteries, screens, charging ports, and labor'],
            ['name' => 'Pre-Owned / Refurbished', 'description' => 'Used and refurbished mobile devices'],
            ['name' => 'SIM Cards & Airtime', 'description' => 'Network starter packs, data bundles, and airtime'],
            ['name' => 'Photography & Vlogging', 'description' => 'Ring lights, tripods, and phone gimbals'],
            ['name' => 'Gaming Accessories', 'description' => 'Mobile gaming triggers, cooling fans, and controllers'],
            ['name' => 'Smart Home Devices', 'description' => 'Smart bulbs, security cameras, and smart plugs'],
            ['name' => 'Software & Services', 'description' => 'Phone unlocking, software flashing, and data transfer'],
        ];

        foreach ($categories as $category) {
            \App\Models\Category::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
