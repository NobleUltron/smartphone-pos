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
        if (DB::getDriverName() === 'pgsql') {
            $tables = DB::select("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
            
            foreach ($tables as $table) {
                $tableName = $table->table_name;
                
                try {
                    $maxId = DB::table($tableName)->max('id') ?? 0;
                    if ($maxId > 0) {
                        $seqName = "{$tableName}_id_seq";
                        DB::statement("SELECT setval('\"$seqName\"', $maxId)");
                    }
                } catch (\Exception $e) {
                    // Ignore tables without an 'id' column or a sequence
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Cannot reliably reverse this.
    }
};
