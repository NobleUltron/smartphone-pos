<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Customer extends Model
{
    protected $fillable = [
        'name',
        'company_name',
        'tin_number',
        'phone',
        'email',
        'address',
        'credit_limit',
        'payment_terms_days',
    ];

    protected $casts = [
        'credit_limit' => 'decimal:2',
        'payment_terms_days' => 'integer',
    ];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }

    public function quotations(): HasMany
    {
        return $this->hasMany(Quotation::class);
    }

    public function invoices(): HasMany
    {
        return $this->hasMany(Invoice::class);
    }

    public function getOutstandingBalanceAttribute(): float
    {
        return floatval($this->invoices()->where('payment_status', '!=', 'Paid')->sum('total_amount'))
            - floatval($this->invoices()->where('payment_status', '!=', 'Paid')->sum('paid_amount'));
    }
}
