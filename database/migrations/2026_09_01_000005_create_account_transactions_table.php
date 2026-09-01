<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('account_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_account_id')->constrained('payment_accounts')->onDelete('cascade');
            $table->string('type'); // 'inflow', 'outflow', 'transfer_in', 'transfer_out', 'adjustment'
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_after', 15, 2)->default(0);
            $table->string('category'); // 'Sale', 'Layaway Payment', 'Repair Payment', 'Dealer Settlement', 'Supplier Purchase', 'Expense', 'Transfer In', 'Transfer Out', 'Adjustment', 'Refund'
            $table->nullableMorphs('reference'); // reference_type and reference_id (e.g. Sale, DealerItem, Expense, Purchase, Repair)
            $table->string('transaction_reference')->nullable(); // e.g. MoMo TID, Cheque #, Bank Ref
            $table->text('description')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('transaction_date')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_transactions');
    }
};
