<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_audits', function (Blueprint $table) {
            $table->id();
            $table->string('audit_number')->unique();
            $table->string('title');
            $table->enum('status', ['In Progress', 'Completed', 'Cancelled'])->default('In Progress');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('completed_at')->nullable();
            $table->integer('total_expected')->default(0);
            $table->integer('total_scanned')->default(0);
            $table->integer('total_missing')->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_audit_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_audit_id')->constrained('stock_audits')->onDelete('cascade');
            $table->foreignId('device_imei_id')->nullable()->constrained('device_imeis')->onDelete('set null');
            $table->foreignId('product_id')->nullable()->constrained('products')->onDelete('set null');
            $table->string('imei_scanned');
            $table->enum('status', ['Found', 'Missing', 'Unmatched'])->default('Found');
            $table->timestamp('scanned_at')->useCurrent();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_audit_items');
        Schema::dropIfExists('stock_audits');
    }
};
