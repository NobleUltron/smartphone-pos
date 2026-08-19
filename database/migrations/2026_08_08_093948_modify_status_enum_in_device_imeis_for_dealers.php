<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE device_imeis MODIFY COLUMN status ENUM('In Stock', 'Sold', 'Reserved', 'Defective', 'In Transit', 'With Dealer') DEFAULT 'In Stock'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE device_imeis MODIFY COLUMN status ENUM('In Stock', 'Sold', 'Reserved', 'Defective', 'In Transit') DEFAULT 'In Stock'");
    }
};
