<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('products')) {
            return;
        }

        // Fetch all products to group them in memory for cross-database compatibility (PostgreSQL & MySQL)
        $products = DB::table('products')->orderBy('id', 'asc')->get();

        // Group by brand_id and lowercase trimmed model_name
        $grouped = $products->groupBy(function ($item) {
            $brand = $item->brand_id ?? 'null';
            $name = strtolower(trim(preg_replace('/\s+/', ' ', $item->model_name ?? '')));
            return "{$brand}___{$name}";
        });

        foreach ($grouped as $key => $group) {
            if ($group->count() <= 1) {
                continue;
            }

            // Pick the primary product:
            // Prefer the product that has existing stock, or highest quantity, or lowest id
            $sorted = $group->sortByDesc(function ($item) {
                return (int) ($item->quantity ?? 0);
            })->values();

            $primary = $sorted->first();
            $duplicates = $sorted->slice(1);

            $addedQuantity = 0;

            foreach ($duplicates as $duplicate) {
                $addedQuantity += max(0, (int) ($duplicate->quantity ?? 0));

                // Re-link dealer items
                if (Schema::hasTable('dealer_items')) {
                    DB::table('dealer_items')
                        ->where('product_id', $duplicate->id)
                        ->update(['product_id' => $primary->id]);
                }

                // Re-link device imeis
                if (Schema::hasTable('device_imeis')) {
                    DB::table('device_imeis')
                        ->where('product_id', $duplicate->id)
                        ->update(['product_id' => $primary->id]);
                }

                // Re-link sale items
                if (Schema::hasTable('sale_items')) {
                    DB::table('sale_items')
                        ->where('product_id', $duplicate->id)
                        ->update(['product_id' => $primary->id]);
                }

                // Re-link purchase items
                if (Schema::hasTable('purchase_items')) {
                    DB::table('purchase_items')
                        ->where('product_id', $duplicate->id)
                        ->update(['product_id' => $primary->id]);
                }

                // Re-link repair parts if table exists
                if (Schema::hasTable('repair_parts')) {
                    DB::table('repair_parts')
                        ->where('product_id', $duplicate->id)
                        ->update(['product_id' => $primary->id]);
                }

                // Re-link stock audit items if table exists
                if (Schema::hasTable('stock_audit_items')) {
                    DB::table('stock_audit_items')
                        ->where('product_id', $duplicate->id)
                        ->update(['product_id' => $primary->id]);
                }

                // Delete duplicate product
                DB::table('products')->where('id', $duplicate->id)->delete();
            }

            // Consolidate quantity into primary product
            if ($addedQuantity > 0) {
                DB::table('products')
                    ->where('id', $primary->id)
                    ->increment('quantity', $addedQuantity);
            }
        }

        if (class_exists(\App\Services\DatabaseSequenceService::class)) {
            \App\Services\DatabaseSequenceService::syncTable('products');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Non-reversible merge
    }
};
