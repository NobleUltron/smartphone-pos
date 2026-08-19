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
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
            $table->string('brand');
            $table->string('model_name');
            $table->string('storage_capacity');
            $table->string('color');
            $table->decimal('base_price', 10, 2);
            $table->timestamps();
        });

        Schema::create('device_imeis', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('imei', 15)->unique();
            $table->enum('condition', ['Brand New', 'Refurbished', 'Used Grade A', 'Used Grade B']);
            $table->enum('status', ['In Stock', 'Sold', 'Reserved', 'Defective'])->default('In Stock');
            $table->decimal('cost_price', 10, 2);
            $table->timestamps();
        });

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone', 50);
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });

        Schema::create('sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users');
            $table->foreignId('customer_id')->nullable()->constrained('customers')->onDelete('set null');
            $table->decimal('total_amount', 10, 2);
            $table->decimal('discount', 10, 2)->default(0.00);
            $table->decimal('final_amount', 10, 2);
            $table->enum('payment_method', ['Cash', 'Bank Transfer', 'MTN MoMo', 'Airtel Money', 'Layaway']);
            $table->enum('payment_status', ['Paid', 'Partial', 'Unpaid']);
            $table->timestamp('sale_date')->useCurrent();
            $table->timestamps();
        });

        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            $table->foreignId('device_imei_id')->constrained('device_imeis');
            $table->decimal('price', 10, 2);
            $table->integer('warranty_months')->default(12);
            $table->timestamps();
        });

        Schema::create('layaway_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained('sales')->onDelete('cascade');
            $table->decimal('amount_paid', 10, 2);
            $table->enum('payment_method', ['Cash', 'Bank Transfer', 'MTN MoMo', 'Airtel Money']);
            $table->timestamp('payment_date')->useCurrent();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('layaway_payments');
        Schema::dropIfExists('sale_items');
        Schema::dropIfExists('sales');
        Schema::dropIfExists('customers');
        Schema::dropIfExists('device_imeis');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
    }
};
