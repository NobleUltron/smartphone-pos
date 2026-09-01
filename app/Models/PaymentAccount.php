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
     * Resolve default account for a given payment method string
     */
    public static function getForMethod(?string $method): ?self
    {
        if (!$method) {
            return self::where('type', 'cash')->first() ?? self::first();
        }

        $method = trim($method);

        if (stripos($method, 'Cash') !== false) {
            return self::where('type', 'cash')->first() 
                ?? self::firstOrCreate(['name' => 'Main Cash Register'], [
                    'type' => 'cash',
                    'provider' => 'Cash',
                    'is_active' => true
                ]);
        }

        if (stripos($method, 'MTN') !== false || stripos($method, 'MoMo') !== false) {
            return self::where('provider', 'MTN')->orWhere('name', 'like', '%MTN%')->first()
                ?? self::firstOrCreate(['name' => 'MTN Mobile Money'], [
                    'type' => 'mobile_money',
                    'provider' => 'MTN',
                    'is_active' => true
                ]);
        }

        if (stripos($method, 'Airtel') !== false) {
            return self::where('provider', 'Airtel')->orWhere('name', 'like', '%Airtel%')->first()
                ?? self::firstOrCreate(['name' => 'Airtel Money'], [
                    'type' => 'mobile_money',
                    'provider' => 'Airtel',
                    'is_active' => true
                ]);
        }

        if (stripos($method, 'Bank') !== false || stripos($method, 'Transfer') !== false || stripos($method, 'Card') !== false) {
            return self::where('type', 'bank')->first()
                ?? self::firstOrCreate(['name' => 'Primary Bank Account'], [
                    'type' => 'bank',
                    'provider' => 'Bank',
                    'is_active' => true
                ]);
        }

        return self::where('type', 'cash')->first() ?? self::first();
    }
}
