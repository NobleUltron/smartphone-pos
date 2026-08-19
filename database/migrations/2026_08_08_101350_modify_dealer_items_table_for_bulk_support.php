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
            $table->string('type')->default('serialized')->after('device_imei_id'); // 'serialized' or 'bulk'
            $table->foreignId('product_id')->nullable()->after('type')->constrained('products');
            $table->integer('quantity')->default(1)->after('product_id');
            $table->integer('quantity_sold')->default(0)->after('quantity');
            $table->integer('quantity_returned')->default(0)->after('quantity_sold');
            
            // Note: Making foreign key nullable in SQLite is difficult, so assuming MySQL or doctrine/dbal is handling it, 
            // or we just bypass altering device_imei_id for sqlite. We will just attempt to change it.
            $table->foreignId('device_imei_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('dealer_items', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropColumn(['type', 'product_id', 'quantity', 'quantity_sold', 'quantity_returned']);
            $table->foreignId('device_imei_id')->nullable(false)->change();
        });
    }
};
