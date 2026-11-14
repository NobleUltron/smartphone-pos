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
        'repairs',
        'repair_parts',
        'warranty_claims',
        'payment_accounts',
        'account_transactions',
        'account_transfers',
        'stock_audits',
        'stock_audit_items',
        'quotations',
        'quotation_items',
        'invoices',
        'invoice_items',
        'invoice_payments',
        'partner_investors',
        'partner_transactions',
        'activity_logs',
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

                DB::statement("SELECT setval(pg_get_serial_sequence('{$table}', 'id'), {$nextId}, false)");
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

            DB::statement("SELECT setval(pg_get_serial_sequence('{$table}', 'id'), {$nextId}, false)");
        } catch (\Throwable $e) {
            // Silently ignore if table does not use a sequence
        }
    }
}
