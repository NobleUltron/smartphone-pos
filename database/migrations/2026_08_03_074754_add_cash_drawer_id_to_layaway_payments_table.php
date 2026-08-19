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
        Schema::table('layaway_payments', function (Blueprint $table) {
            $table->foreignId('cash_drawer_id')->nullable()->constrained()->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('layaway_payments', function (Blueprint $table) {
            $table->dropForeign(['cash_drawer_id']);
            $table->dropColumn('cash_drawer_id');
        });
    }
};
