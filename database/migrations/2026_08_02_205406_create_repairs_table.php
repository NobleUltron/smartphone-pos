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
        Schema::create('repairs', function (Blueprint $table) {
            $table->id();
            $table->string('repair_code')->unique();
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->string('device_model');
            $table->string('imei_serial')->nullable();
            $table->string('device_passcode')->nullable();
            $table->text('issue_description');
            $table->decimal('estimated_cost', 10, 2);
            $table->decimal('deposit', 10, 2)->default(0);
            $table->enum('status', ['Pending', 'In Progress', 'Completed', 'Delivered', 'Cancelled'])->default('Pending');
            $table->text('technician_notes')->nullable();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('repairs');
    }
};
