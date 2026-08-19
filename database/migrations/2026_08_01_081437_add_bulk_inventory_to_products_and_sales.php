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
        Schema::table('products', function (Blueprint $table) {
            $table->string('type')->default('serialized')->after('model_name'); // 'serialized' or 'bulk'
            $table->string('sku')->nullable()->unique()->after('type');
            $table->integer('quantity')->default(0)->after('sku');
            $table->decimal('cost_price', 10, 2)->nullable()->after('quantity');
            $table->decimal('selling_price', 10, 2)->nullable()->after('cost_price');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            // Note: SQLite doesn't natively support modifying foreign keys or columns easily without recreating tables. 
            // We'll try to just add product_id and quantity, and we can just leave device_imei_id as is (it might already be nullable or we can just bypass it). 
            // Actually, we must make device_imei_id nullable. Laravel 11 handles this fine on SQLite if doctrine/dbal is installed, or with native sqlite driver modifications.
            // Let's assume it's MySQL or we can just alter it.
            $table->foreignId('device_imei_id')->nullable()->change();
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('cascade')->after('device_imei_id');
            $table->integer('quantity')->default(1)->after('product_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropColumn(['product_id', 'quantity']);
            $table->foreignId('device_imei_id')->nullable(false)->change();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['type', 'sku', 'quantity', 'cost_price', 'selling_price']);
        });
    }
};
