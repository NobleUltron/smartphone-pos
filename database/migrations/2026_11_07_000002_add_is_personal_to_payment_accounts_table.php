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
        Schema::table('payment_accounts', function (Blueprint $table) {
            $table->boolean('is_personal')->default(false);
        });

        // Mark Equity Bank as personal by default
        DB::table('payment_accounts')
            ->where('name', 'like', '%Equity%')
            ->update(['is_personal' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('payment_accounts', function (Blueprint $table) {
            $table->dropColumn('is_personal');
        });
    }
};
