<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('device_imeis', 'trade_in_inspection')) {
            Schema::table('device_imeis', function (Blueprint $table) {
                $table->json('trade_in_inspection')->nullable();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('device_imeis', 'trade_in_inspection')) {
            Schema::table('device_imeis', function (Blueprint $table) {
                $table->dropColumn('trade_in_inspection');
            });
        }
    }
};
