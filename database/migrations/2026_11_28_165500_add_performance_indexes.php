<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private function addIndexSafely(string $table, array $columns, string $name): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }
        foreach ($columns as $col) {
            if (!Schema::hasColumn($table, $col)) {
                return;
            }
        }
        try {
            Schema::table($table, function (Blueprint $blueprint) use ($columns, $name) {
                $blueprint->index($columns, $name);
            });
        } catch (\Throwable $e) {
            // Index already exists — safe to ignore
        }
    }

    private function dropIndexSafely(string $table, string $name): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }
        try {
            Schema::table($table, function (Blueprint $blueprint) use ($name) {
                $blueprint->dropIndex($name);
            });
        } catch (\Throwable $e) {
            // Index doesn't exist — safe to ignore
        }
    }

    public function up(): void
    {
        $this->addIndexSafely('device_imeis', ['product_id', 'status'], 'idx_device_imeis_product_status');
        $this->addIndexSafely('device_imeis', ['status', 'created_at'], 'idx_device_imeis_status_created');
        $this->addIndexSafely('sales', ['sale_date', 'payment_status'], 'idx_sales_date_status');
        $this->addIndexSafely('sales', ['payment_status'], 'idx_sales_payment_status');
        $this->addIndexSafely('sales', ['created_at'], 'idx_sales_created_at');
        $this->addIndexSafely('expenses', ['expense_date', 'category'], 'idx_expenses_date_category');
        $this->addIndexSafely('account_transactions', ['payment_account_id', 'transaction_date'], 'idx_acc_trx_account_date');
        $this->addIndexSafely('account_transactions', ['transaction_date'], 'idx_acc_trx_date');
        $this->addIndexSafely('dealer_items', ['direction', 'status'], 'idx_dealer_items_dir_status');
        $this->addIndexSafely('dealer_items', ['status', 'expected_return_date'], 'idx_dealer_items_status_due');
        $this->addIndexSafely('layaway_payments', ['payment_date'], 'idx_layaway_payments_date');
        $this->addIndexSafely('invoice_payments', ['payment_date'], 'idx_invoice_payments_date');
        $this->addIndexSafely('products', ['type', 'quantity'], 'idx_products_type_qty');
        $this->addIndexSafely('repairs', ['status', 'updated_at'], 'idx_repairs_status_updated');
        $this->addIndexSafely('warranty_claims', ['status'], 'idx_warranty_claims_status');
    }

    public function down(): void
    {
        $this->dropIndexSafely('device_imeis', 'idx_device_imeis_product_status');
        $this->dropIndexSafely('device_imeis', 'idx_device_imeis_status_created');
        $this->dropIndexSafely('sales', 'idx_sales_date_status');
        $this->dropIndexSafely('sales', 'idx_sales_payment_status');
        $this->dropIndexSafely('sales', 'idx_sales_created_at');
        $this->dropIndexSafely('expenses', 'idx_expenses_date_category');
        $this->dropIndexSafely('account_transactions', 'idx_acc_trx_account_date');
        $this->dropIndexSafely('account_transactions', 'idx_acc_trx_date');
        $this->dropIndexSafely('dealer_items', 'idx_dealer_items_dir_status');
        $this->dropIndexSafely('dealer_items', 'idx_dealer_items_status_due');
        $this->dropIndexSafely('layaway_payments', 'idx_layaway_payments_date');
        $this->dropIndexSafely('invoice_payments', 'idx_invoice_payments_date');
        $this->dropIndexSafely('products', 'idx_products_type_qty');
        $this->dropIndexSafely('repairs', 'idx_repairs_status_updated');
        $this->dropIndexSafely('warranty_claims', 'idx_warranty_claims_status');
    }
};
