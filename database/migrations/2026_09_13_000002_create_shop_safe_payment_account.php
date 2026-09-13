<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\PaymentAccount;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        PaymentAccount::firstOrCreate(
            ['name' => 'Shop Safe (Master Cash)'],
            [
                'type' => 'cash',
                'provider' => 'Safe',
                'current_balance' => 0,
                'opening_balance' => 0,
                'is_active' => true,
                'description' => 'Secure store safe for daily cash banking drops and cashier floats'
            ]
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        PaymentAccount::where('name', 'Shop Safe (Master Cash)')->delete();
    }
};
