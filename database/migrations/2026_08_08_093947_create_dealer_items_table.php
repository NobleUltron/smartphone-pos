<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dealer_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dealer_id')->constrained('dealers')->onDelete('cascade');
            $table->foreignId('device_imei_id')->constrained('device_imeis');
            $table->decimal('retail_price', 10, 2);
            $table->decimal('dealer_price', 10, 2);
            
            $table->foreignId('user_id')->constrained('users')->comment('User who issued the item');
            $table->timestamp('issued_at')->useCurrent();
            $table->date('expected_return_date')->nullable();
            
            $table->enum('status', ['Pending', 'Sold', 'Returned'])->default('Pending');
            $table->timestamp('returned_at')->nullable();
            
            $table->timestamp('sold_at')->nullable();
            $table->foreignId('sale_id')->nullable()->constrained('sales')->onDelete('set null');
            
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dealer_items');
    }
};
