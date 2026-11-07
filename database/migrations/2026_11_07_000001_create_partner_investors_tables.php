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
        Schema::create('partner_investors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->decimal('profit_share_percentage', 5, 2)->default(100.00); // 100% means all profit to investor, 50% means 50/50 split
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('partner_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('partner_investor_id')->constrained('partner_investors')->cascadeOnDelete();
            $table->foreignId('payment_account_id')->nullable()->constrained('payment_accounts')->nullOnDelete();
            $table->string('type')->default('deposit'); // 'deposit' (capital in), 'payout' (capital return), 'profit_payout' (profit taken)
            $table->decimal('amount', 15, 2)->default(0);
            $table->date('transaction_date');
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('device_imeis', function (Blueprint $table) {
            $table->foreignId('partner_investor_id')->nullable()->constrained('partner_investors')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('device_imeis', function (Blueprint $table) {
            $table->dropForeign(['partner_investor_id']);
            $table->dropColumn('partner_investor_id');
        });

        Schema::dropIfExists('partner_transactions');
        Schema::dropIfExists('partner_investors');
    }
};
