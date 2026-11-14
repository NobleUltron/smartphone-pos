<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('device_imeis', function (Blueprint $table) {
            $table->decimal('initial_cost_price', 15, 2)->nullable();
            $table->decimal('refurbishment_cost', 15, 2)->default(0);
            $table->text('refurbishment_notes')->nullable();
        });

        DB::table('device_imeis')
            ->whereNull('initial_cost_price')
            ->update(['initial_cost_price' => DB::raw('cost_price')]);
    }

    public function down(): void
    {
        Schema::table('device_imeis', function (Blueprint $table) {
            $table->dropColumn(['initial_cost_price', 'refurbishment_cost', 'refurbishment_notes']);
        });
    }
};
