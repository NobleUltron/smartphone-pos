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
        // 1. Add missing columns to device_imeis if they do not exist
        Schema::table('device_imeis', function (Blueprint $table) {
            if (!Schema::hasColumn('device_imeis', 'storage_capacity')) {
                $table->string('storage_capacity', 50)->nullable()->after('cost_price');
            }
            if (!Schema::hasColumn('device_imeis', 'color')) {
                $table->string('color', 50)->nullable()->after('storage_capacity');
            }
            if (!Schema::hasColumn('device_imeis', 'selling_price')) {
                $table->decimal('selling_price', 10, 2)->nullable()->after('color');
            }
        });

        // 2. Migrate data from products to device_imeis (if product_id exists)
        DB::table('device_imeis')->orderBy('id')->chunk(100, function ($imeis) {
            foreach ($imeis as $imei) {
                if ($imei->product_id) {
                    $product = DB::table('products')->where('id', $imei->product_id)->first();
                    if ($product) {
                        $updateData = [];
                        
                        if (isset($product->storage_capacity) && !empty($product->storage_capacity) && empty($imei->storage_capacity)) {
                            $updateData['storage_capacity'] = $product->storage_capacity;
                        }
                        
                        if (isset($product->color) && !empty($product->color) && empty($imei->color)) {
                            $updateData['color'] = $product->color;
                        }

                        // Try selling_price first, fallback to base_price
                        $price = $product->selling_price ?? $product->base_price ?? null;
                        if ($price !== null && empty($imei->selling_price)) {
                            $updateData['selling_price'] = $price;
                        }

                        if (!empty($updateData)) {
                            DB::table('device_imeis')->where('id', $imei->id)->update($updateData);
                        }
                    }
                }
            }
        });

        // 3. Drop variant columns from products
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'storage_capacity')) {
                $table->dropColumn('storage_capacity');
            }
            if (Schema::hasColumn('products', 'color')) {
                $table->dropColumn('color');
            }
            if (Schema::hasColumn('products', 'base_price')) {
                $table->dropColumn('base_price');
            }
        });

        // 4. Deduplicate products based on category_id, brand_id, and model_name
        if (Schema::hasColumn('products', 'brand_id')) {
            $uniqueProducts = DB::table('products')
                ->select('category_id', 'brand_id', 'model_name', DB::raw('MIN(id) as primary_id'))
                ->groupBy('category_id', 'brand_id', 'model_name')
                ->get();

            foreach ($uniqueProducts as $up) {
                $duplicates = DB::table('products')
                    ->where('category_id', $up->category_id)
                    ->where('brand_id', $up->brand_id)
                    ->where('model_name', $up->model_name)
                    ->where('id', '!=', $up->primary_id)
                    ->get();

                foreach ($duplicates as $duplicate) {
                    DB::table('device_imeis')
                        ->where('product_id', $duplicate->id)
                        ->update(['product_id' => $up->primary_id]);
                    
                    DB::table('products')->where('id', $duplicate->id)->delete();
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'storage_capacity')) {
                $table->string('storage_capacity', 50)->nullable();
            }
            if (!Schema::hasColumn('products', 'color')) {
                $table->string('color', 50)->nullable();
            }
            if (!Schema::hasColumn('products', 'base_price')) {
                $table->decimal('base_price', 10, 2)->nullable();
            }
        });

        Schema::table('device_imeis', function (Blueprint $table) {
            if (Schema::hasColumn('device_imeis', 'storage_capacity')) {
                $table->dropColumn('storage_capacity');
            }
            if (Schema::hasColumn('device_imeis', 'color')) {
                $table->dropColumn('color');
            }
            if (Schema::hasColumn('device_imeis', 'selling_price')) {
                $table->dropColumn('selling_price');
            }
        });
    }
};
