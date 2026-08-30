<?php

use Illuminate\Database\Migrations\Migration;
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
                    $seqRow = DB::selectOne("SELECT pg_get_serial_sequence(?, 'id') as seq", [$tableName]);
                    $seqName = $seqRow ? $seqRow->seq : null;
                    
                    if ($seqName) {
                        $maxId = DB::table($tableName)->max('id');
                        if ($maxId === null || $maxId == 0) {
                            DB::statement("SELECT setval('$seqName', 1, false)");
                        } else {
                            DB::statement("SELECT setval('$seqName', $maxId, true)");
                        }
                    }
                } catch (\Throwable $e) {
                    // Skip tables without an id sequence
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
