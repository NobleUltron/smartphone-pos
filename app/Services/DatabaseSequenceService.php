<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

class DatabaseSequenceService
{
    /**
     * List of all application tables with auto-incrementing IDs.
     */
    public static array $tables = [
        'users',
        'categories',
        'brands',
        'products',
        'device_imeis',
        'customers',
        'dealers',
        'dealer_items',
        'sales',
        'sale_items',
        'cash_drawers',
        'expenses',
        'layaway_payments',
        'purchases',
        'purchase_items',
        'suppliers',
        'supplier_payments',
        'repairs',
        'repair_parts',
        'trade_ins',
        'warranties',
        'warranty_claims',
        'settings',
    ];

    /**
     * Synchronize sequences for all tables.
     */
    public static function syncAll(): array
    {
        if (DB::getDriverName() !== 'pgsql') {
            return ['Database driver is ' . DB::getDriverName() . ' (PostgreSQL sequence sync not needed).'];
        }

        $results = [];

        foreach (self::$tables as $table) {
            try {
                $maxId = DB::table($table)->max('id');
                $nextId = ($maxId !== null && $maxId > 0) ? ($maxId + 1) : 1;
                
                DB::statement("SELECT setval(pg_get_serial_sequence('$table', 'id'), $nextId, false) FROM \"$table\"");
                $results[] = "Successfully synced sequence for table '$table' (Next ID: $nextId)";
            } catch (\Throwable $e) {
                $results[] = "Skipped '$table': " . $e->getMessage();
            }
        }

        return $results;
    }

    /**
     * Synchronize sequence for a single specific table.
     */
    public static function syncTable(string $table): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        try {
            $maxId = DB::table($table)->max('id');
            $nextId = ($maxId !== null && $maxId > 0) ? ($maxId + 1) : 1;
            
            DB::statement("SELECT setval(pg_get_serial_sequence('$table', 'id'), $nextId, false) FROM \"$table\"");
        } catch (\Throwable $e) {
            // Silently ignore if table does not use a sequence
        }
    }
}
