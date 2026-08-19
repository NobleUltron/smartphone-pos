<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('store_settings', 'allow_cashier_discounts')) {
                $table->boolean('allow_cashier_discounts')->default(true);
            }
            if (!Schema::hasColumn('store_settings', 'allow_cashier_price_overwrites')) {
                $table->boolean('allow_cashier_price_overwrites')->default(true);
            }
            if (!Schema::hasColumn('store_settings', 'allow_cashier_dealer_intake')) {
                $table->boolean('allow_cashier_dealer_intake')->default(true);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_settings', function (Blueprint $table) {
            $table->dropColumn([
                'allow_cashier_discounts',
                'allow_cashier_price_overwrites',
                'allow_cashier_dealer_intake'
            ]);
        });
    }
};
