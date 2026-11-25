<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('suppliers', 'credit_balance')) {
            Schema::table('suppliers', function (Blueprint $table) {
                $table->decimal('credit_balance', 15, 2)->default(0)->after('balance');
            });
        }

        if (!Schema::hasTable('supplier_returns')) {
            Schema::create('supplier_returns', function (Blueprint $table) {
                $table->id();
                $table->foreignId('supplier_id')->constrained()->cascadeOnDelete();
                $table->foreignId('purchase_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('device_imei_id')->nullable()->constrained('device_imeis')->nullOnDelete();
                $table->foreignId('replacement_imei_id')->nullable()->constrained('device_imeis')->nullOnDelete();
                $table->foreignId('payment_account_id')->nullable()->constrained('payment_accounts')->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('return_type', 40)->default('device_return'); // device_return | purchase_cancellation
                $table->string('resolution', 40); // refund | supplier_credit | replacement | supplier_repair | forfeited | unpaid_cancel
                $table->decimal('amount', 15, 2)->default(0);
                $table->string('status', 40)->default('Completed'); // Completed | At Supplier (Repair) | Received Back
                $table->text('reason')->nullable();
                $table->timestamp('returned_at')->nullable();
                $table->timestamp('received_back_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_returns');
        if (Schema::hasColumn('suppliers', 'credit_balance')) {
            Schema::table('suppliers', function (Blueprint $table) {
                $table->dropColumn('credit_balance');
            });
        }
    }
};

