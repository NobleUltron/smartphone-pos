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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('action'); // e.g. pos_checkout, discount_applied, price_override, item_returned, cash_float_adjustment, backup_downloaded
            $table->string('module'); // e.g. POS, Inventory, Repairs, Dealers, Expenses, Security
            $table->text('description');
            $table->string('ip_address')->nullable();
            $table->json('properties')->nullable(); // JSON data storing change details (e.g. old_price, new_price, discount_amount)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
