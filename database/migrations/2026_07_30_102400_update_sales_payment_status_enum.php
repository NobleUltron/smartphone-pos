<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE sales MODIFY COLUMN payment_status ENUM('Paid','Partial','Unpaid','Refunded') NOT NULL DEFAULT 'Paid'");
        }
    }

    public function down(): void
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() !== 'sqlite') {
            DB::statement("ALTER TABLE sales MODIFY COLUMN payment_status ENUM('Paid','Partial','Unpaid') NOT NULL DEFAULT 'Paid'");
        }
    }
};
