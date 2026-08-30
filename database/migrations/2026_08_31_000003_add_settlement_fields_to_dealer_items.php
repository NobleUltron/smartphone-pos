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
            if (!Schema::hasColumn('dealer_items', 'settlement_status')) {
                $table->string('settlement_status')->default('Unsettled');
            }
            if (!Schema::hasColumn('dealer_items', 'settled_at')) {
                $table->timestamp('settled_at')->nullable();
            }
            if (!Schema::hasColumn('dealer_items', 'settlement_method')) {
                $table->string('settlement_method')->nullable();
            }
            if (!Schema::hasColumn('dealer_items', 'settlement_amount')) {
                $table->decimal('settlement_amount', 12, 2)->nullable();
            }
            if (!Schema::hasColumn('dealer_items', 'settlement_notes')) {
                $table->text('settlement_notes')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dealer_items', function (Blueprint $table) {
            $table->dropColumn([
                'settlement_status',
                'settled_at',
                'settlement_method',
                'settlement_amount',
                'settlement_notes',
            ]);
        });
    }
};
