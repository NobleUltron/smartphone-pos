<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

// 1. Add columns to device_imeis
if (!Schema::hasColumn('device_imeis', 'storage_capacity')) {
    Schema::table('device_imeis', function (Blueprint $table) {
        $table->string('storage_capacity', 50)->nullable()->after('cost_price');
        $table->string('color', 50)->nullable()->after('storage_capacity');
        $table->decimal('selling_price', 10, 2)->nullable()->after('color');
    });
    echo "Added storage_capacity, color, selling_price to device_imeis.\n";
}

// 2. Migrate data from products to device_imeis
$imeis = DB::table('device_imeis')->get();
foreach ($imeis as $imei) {
    $product = DB::table('products')->where('id', $imei->product_id)->first();
    if ($product && isset($product->base_price)) {
        DB::table('device_imeis')
            ->where('id', $imei->id)
            ->update([
                'storage_capacity' => $product->storage_capacity,
                'color' => $product->color,
                'selling_price' => $product->base_price
            ]);
    }
}
echo "Migrated variant data to device_imeis.\n";

// 3. Drop columns from products
if (Schema::hasColumn('products', 'base_price')) {
    Schema::table('products', function (Blueprint $table) {
        $table->dropColumn(['storage_capacity', 'color', 'base_price']);
    });
    echo "Dropped storage, color, base_price from products.\n";
}

// 4. Group duplicate products and update device_imeis product_id
// We will find all unique category_id, brand_id, model_name combinations
$uniqueProducts = DB::table('products')
    ->select('category_id', 'brand_id', 'model_name', DB::raw('MIN(id) as primary_id'))
    ->groupBy('category_id', 'brand_id', 'model_name')
    ->get();

foreach ($uniqueProducts as $up) {
    // Find all products that match this combination but are not the primary_id
    $duplicates = DB::table('products')
        ->where('category_id', $up->category_id)
        ->where('brand_id', $up->brand_id)
        ->where('model_name', $up->model_name)
        ->where('id', '!=', $up->primary_id)
        ->get();

    foreach ($duplicates as $duplicate) {
        // Re-point imeis
        DB::table('device_imeis')
            ->where('product_id', $duplicate->id)
            ->update(['product_id' => $up->primary_id]);
        
        // Delete duplicate product
        DB::table('products')->where('id', $duplicate->id)->delete();
    }
}
echo "Cleaned up duplicate products.\n";

echo "Done.\n";
