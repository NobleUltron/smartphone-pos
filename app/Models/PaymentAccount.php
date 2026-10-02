<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'account_number',
        'provider',
        'current_balance',
        'opening_balance',
        'is_active',
        'description',
    ];

    protected $casts = [
        'current_balance' => 'float',
        'opening_balance' => 'float',
        'is_active' => 'boolean',
    ];

    public function transactions(): HasMany
    {
        return $this->hasMany(AccountTransaction::class)->orderBy('transaction_date', 'desc')->orderBy('id', 'desc');
    }

    public function transfersFrom(): HasMany
    {
        return $this->hasMany(AccountTransfer::class, 'from_account_id');
    }

    public function transfersTo(): HasMany
    {
        return $this->hasMany(AccountTransfer::class, 'to_account_id');
    }

    /**
     * Resolve default account for a given payment method string, numeric ID, or instance
     */
    public static function getForMethod($method): ?self
    {
        if (!$method) {
            return self::where('name', 'Main Cash Register')->first()
                ?? self::where('type', 'cash')->first()
                ?? self::first();
        }

        if ($method instanceof self) {
            return $method;
        }

        // If numeric ID or string ID of existing account
        if (is_numeric($method)) {
            $found = self::find((int) $method);
            if ($found) return $found;
        }

        $method = trim((string) $method);

        // Check exact name match first
        $exactName = self::whereRaw('LOWER(name) = ?', [strtolower($method)])->first();
        if ($exactName) return $exactName;

        if (stripos($method, 'Safe') !== false) {
            return self::where('provider', 'Safe')
                ->orWhere('name', 'like', '%Safe%')
                ->first()
                ?? self::firstOrCreate(['name' => 'Shop Safe (Master Cash)'], [
                    'type' => 'cash',
                    'provider' => 'Safe',
                    'current_balance' => 0,
                    'opening_balance' => 0,
                    'is_active' => true,
                    'description' => 'Secure store safe for daily cash banking drops and cashier floats'
                ]);
        }

        if (stripos($method, 'Cash') !== false || stripos($method, 'Till') !== false) {
            return self::where('name', 'Main Cash Register')->first()
                ?? self::where('provider', 'Cash')->first()
                ?? self::where('type', 'cash')->first() 
                ?? self::firstOrCreate(['name' => 'Main Cash Register'], [
                    'type' => 'cash',
                    'provider' => 'Cash',
                    'is_active' => true
                ]);
        }

        if (stripos($method, 'MTN') !== false || stripos($method, 'MoMo') !== false) {
            return self::where('provider', 'MTN')
                ->orWhere(function ($q) {
                    $q->where('name', 'like', '%MTN%')->orWhere('name', 'like', '%MoMo%');
                })->first()
                ?? self::firstOrCreate(['name' => 'MTN Mobile Money'], [
                    'type' => 'mobile_money',
                    'provider' => 'MTN',
                    'is_active' => true
                ]);
        }

        if (stripos($method, 'Airtel') !== false) {
            return self::where('provider', 'Airtel')
                ->orWhere('name', 'like', '%Airtel%')
                ->first()
                ?? self::firstOrCreate(['name' => 'Airtel Money'], [
                    'type' => 'mobile_money',
                    'provider' => 'Airtel',
                    'is_active' => true
                ]);
        }

        if (stripos($method, 'Flexi') !== false) {
            $flexi = self::where('name', 'like', '%Flexi%')->first();
            if ($flexi) return $flexi;
        }

        if (stripos($method, 'Bank') !== false || stripos($method, 'Transfer') !== false || stripos($method, 'Card') !== false || stripos($method, 'Stanbic') !== false) {
            return self::where('type', 'bank')->first()
                ?? self::firstOrCreate(['name' => 'Primary Bank Account'], [
                    'type' => 'bank',
                    'provider' => 'Stanbic',
                    'is_active' => true
                ]);
        }

        return self::where('name', 'Main Cash Register')->first()
            ?? self::where('type', 'cash')->first()
            ?? self::first();
    }
}
