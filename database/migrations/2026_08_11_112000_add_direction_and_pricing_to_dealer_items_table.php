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
        Schema::table('dealer_items', function (Blueprint $table) {
            if (!Schema::hasColumn('dealer_items', 'direction')) {
                $table->enum('direction', ['outward', 'inward'])->default('outward')->after('dealer_id');
            }
            if (!Schema::hasColumn('dealer_items', 'wholesale_cost')) {
                $table->decimal('wholesale_cost', 15, 2)->default(0)->after('dealer_price');
            }
            if (!Schema::hasColumn('dealer_items', 'retail_price')) {
                $table->decimal('retail_price', 15, 2)->default(0)->after('wholesale_cost');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dealer_items', function (Blueprint $table) {
            $table->dropColumn(['direction', 'wholesale_cost', 'retail_price']);
        });
    }
};
