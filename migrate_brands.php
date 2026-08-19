<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;

// 1. Create brands table
if (!Schema::hasTable('brands')) {
    Schema::create('brands', function (Blueprint $table) {
        $table->id();
        $table->string('name')->unique();
        $table->timestamps();
    });
    echo "Created brands table.\n";
}

// 2. Extract unique brands from products and insert into brands table
$uniqueBrands = DB::table('products')->select('brand')->distinct()->pluck('brand');
foreach ($uniqueBrands as $brandName) {
    DB::table('brands')->insertOrIgnore([
        'name' => $brandName,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}
echo "Inserted brands.\n";

// 3. Add brand_id to products
if (!Schema::hasColumn('products', 'brand_id')) {
    Schema::table('products', function (Blueprint $table) {
        $table->foreignId('brand_id')->nullable()->after('category_id')->constrained();
    });
    echo "Added brand_id to products.\n";
}

// 4. Update brand_id in products based on string brand
$products = DB::table('products')->get();
foreach ($products as $product) {
    if (isset($product->brand)) {
        $brand = DB::table('brands')->where('name', $product->brand)->first();
        if ($brand) {
            DB::table('products')->where('id', $product->id)->update(['brand_id' => $brand->id]);
        }
    }
}
echo "Mapped brand_ids.\n";

// 5. Drop brand column from products
if (Schema::hasColumn('products', 'brand')) {
    Schema::table('products', function (Blueprint $table) {
        $table->dropColumn('brand');
    });
    echo "Dropped brand column from products.\n";
}

echo "Done.\n";
