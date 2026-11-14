<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('expenses', 'payment_account_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->foreignId('payment_account_id')->nullable()->constrained('payment_accounts')->nullOnDelete();
            });
        }

        if (!Schema::hasColumn('sales', 'trade_in_imei_id')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->foreignId('trade_in_imei_id')->nullable()->constrained('device_imeis')->nullOnDelete();
            });
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE device_imeis DROP CONSTRAINT IF EXISTS device_imeis_status_check');
            DB::statement("ALTER TABLE device_imeis ADD CONSTRAINT device_imeis_status_check CHECK (status::text = ANY (ARRAY['In Stock'::character varying, 'Sold'::character varying, 'Reserved'::character varying, 'Defective'::character varying, 'In Transit'::character varying, 'With Dealer'::character varying, 'Returned'::character varying]::text[]))");
        } elseif (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE device_imeis MODIFY COLUMN status ENUM('In Stock', 'Sold', 'Reserved', 'Defective', 'In Transit', 'With Dealer', 'Returned') NOT NULL DEFAULT 'In Stock'");
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('sales', 'trade_in_imei_id')) {
            Schema::table('sales', function (Blueprint $table) {
                $table->dropConstrainedForeignId('trade_in_imei_id');
            });
        }

        if (Schema::hasColumn('expenses', 'payment_account_id')) {
            Schema::table('expenses', function (Blueprint $table) {
                $table->dropConstrainedForeignId('payment_account_id');
            });
        }
    }
};
