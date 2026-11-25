<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_status_check');
            DB::statement('ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_payment_status_check');
            DB::statement('ALTER TABLE device_imeis DROP CONSTRAINT IF EXISTS device_imeis_status_check');
            DB::statement("ALTER TABLE purchases ALTER COLUMN status TYPE VARCHAR(40)");
            DB::statement("ALTER TABLE purchases ALTER COLUMN payment_status TYPE VARCHAR(40)");
            DB::statement("ALTER TABLE device_imeis ALTER COLUMN status TYPE VARCHAR(50)");
        } else {
            Schema::table('purchases', function (Blueprint $table) {
                $table->string('status', 40)->default('Received')->change();
                $table->string('payment_status', 40)->default('Unpaid')->change();
            });
        }
    }

    public function down(): void
    {
        // Non-destructive: keep string columns to avoid failing on Cancelled/Refunded/Credited/Forfeited rows
    }
};
