<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'contact_name',
        'phone',
        'email',
        'address',
        'balance',
        'credit_balance',
    ];

    protected $casts = [
        'balance' => 'float',
        'credit_balance' => 'float',
    ];

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function supplierReturns()
    {
        return $this->hasMany(SupplierReturn::class);
    }

    public function recalculateBalance()
    {
        $remaining = $this->purchases()
            ->where('status', '!=', 'Cancelled')
            ->selectRaw('SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END) as remaining')
            ->value('remaining') ?? 0;

        $this->balance = max(0, (float)$remaining);
        $this->save();
        return $this->balance;
    }
}
