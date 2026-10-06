<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add corporate/B2B fields to customers table
        Schema::table('customers', function (Blueprint $table) {
            $table->string('company_name')->nullable()->after('name');
            $table->string('tin_number', 50)->nullable()->after('company_name');
            $table->decimal('credit_limit', 15, 2)->default(0)->after('address');
            $table->integer('payment_terms_days')->default(30)->after('credit_limit');
        });

        // 2. Create quotations table
        Schema::create('quotations', function (Blueprint $table) {
            $table->id();
            $table->string('quotation_number', 50)->unique();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->date('issue_date');
            $table->date('valid_until');
            $table->string('status', 30)->default('Draft'); // Draft, Sent, Approved, Rejected, Converted, Expired
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->text('terms_conditions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 3. Create quotation items table
        Schema::create('quotation_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quotation_id')->constrained('quotations')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('type', 20)->default('product'); // product, service
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2)->default(0);
            $table->timestamps();
        });

        // 4. Create invoices table
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number', 50)->unique();
            $table->foreignId('quotation_id')->nullable()->constrained('quotations')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->string('po_number', 100)->nullable(); // Client's Purchase Order Ref
            $table->date('issue_date');
            $table->date('due_date');
            $table->string('payment_terms', 50)->default('Net 30'); // Immediate, Net 15, Net 30, Net 60
            $table->string('status', 30)->default('Confirmed'); // Draft, Confirmed, Dispatched, Cancelled
            $table->string('payment_status', 30)->default('Unpaid'); // Unpaid, Partial, Paid, Overdue
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->text('terms_conditions')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 5. Create invoice items table
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('type', 20)->default('product'); // product, service
            $table->string('item_name');
            $table->text('description')->nullable();
            $table->integer('quantity')->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('total_price', 15, 2)->default(0);
            $table->json('imeis')->nullable(); // Assigned serialized devices
            $table->timestamps();
        });

        // 6. Create invoice payments table
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('payment_account_id')->nullable()->constrained('payment_accounts')->nullOnDelete();
            $table->foreignId('user_id')->constrained('users');
            $table->string('receipt_number', 50)->nullable()->unique();
            $table->decimal('amount', 15, 2);
            $table->string('payment_method', 50)->default('Bank Transfer');
            $table->string('transaction_reference', 100)->nullable();
            $table->date('payment_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('quotation_items');
        Schema::dropIfExists('quotations');

        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['company_name', 'tin_number', 'credit_limit', 'payment_terms_days']);
        });
    }
};
