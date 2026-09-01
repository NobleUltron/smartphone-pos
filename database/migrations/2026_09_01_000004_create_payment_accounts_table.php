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
        Schema::create('payment_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // e.g., 'Main Cash Register', 'MTN Mobile Money', 'Airtel Money', 'Stanbic Bank'
            $table->string('type')->default('cash'); // 'cash', 'mobile_money', 'bank', 'other'
            $table->string('account_number')->nullable(); // e.g. Phone number, Bank account number
            $table->string('provider')->nullable(); // e.g. 'Cash', 'MTN', 'Airtel', 'Stanbic', 'Centenary'
            $table->decimal('current_balance', 15, 2)->default(0);
            $table->decimal('opening_balance', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payment_accounts');
    }
};
