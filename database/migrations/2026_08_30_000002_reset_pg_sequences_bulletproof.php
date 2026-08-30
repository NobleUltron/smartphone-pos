<?php

use Illuminate\Database\Migrations\Migration;
use App\Services\DatabaseSequenceService;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DatabaseSequenceService::syncAll();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
