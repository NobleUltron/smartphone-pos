<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create brands table
        if (!Schema::hasTable('brands')) {
            Schema::create('brands', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->timestamps();
            });
        }

        // 2. Add brand_id to products
        if (!Schema::hasColumn('products', 'brand_id')) {
            Schema::table('products', function (Blueprint $table) {
                $table->foreignId('brand_id')->nullable()->constrained('brands');
            });
        }

        // 3. Migrate data if brand string exists
        if (Schema::hasColumn('products', 'brand')) {
            $uniqueBrands = DB::table('products')
                ->whereNotNull('brand')
                ->where('brand', '!=', '')
                ->select('brand')
                ->distinct()
                ->pluck('brand');

            foreach ($uniqueBrands as $brandName) {
                DB::table('brands')->insertOrIgnore([
                    'name' => $brandName,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Map brand_id
            DB::table('products')->orderBy('id')->chunkById(100, function ($products) {
                foreach ($products as $product) {
                    if (!empty($product->brand)) {
                        $brand = DB::table('brands')->where('name', $product->brand)->first();
                        if ($brand) {
                            DB::table('products')->where('id', $product->id)->update(['brand_id' => $brand->id]);
                        }
                    }
                }
            });

            // Drop old string column
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('brand');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'brand')) {
                $table->string('brand')->nullable();
            }
        });

        // Try restoring data from brands
        if (Schema::hasColumn('products', 'brand_id')) {
            DB::table('products')->orderBy('id')->chunkById(100, function ($products) {
                foreach ($products as $product) {
                    if ($product->brand_id) {
                        $brand = DB::table('brands')->where('id', $product->brand_id)->first();
                        if ($brand) {
                            DB::table('products')->where('id', $product->id)->update(['brand' => $brand->name]);
                        }
                    }
                }
            });

            Schema::table('products', function (Blueprint $table) {
                $table->dropForeign(['brand_id']);
                $table->dropColumn('brand_id');
            });
        }

        Schema::dropIfExists('brands');
    }
};
