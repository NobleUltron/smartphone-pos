<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'user_id', 
        'customer_id', 
        'total_amount', 
        'discount', 
        'trade_in_value', 
        'trade_in_device', 
        'final_amount', 
        'payment_method', 
        'payment_status', 
        'tendered_amount',
        'sale_date', 
        'cash_drawer_id',
        'repair_id'
    ];

    protected $casts = [
        'sale_date' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function cashDrawer(): BelongsTo
    {
        return $this->belongsTo(CashDrawer::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function layawayPayments(): HasMany
    {
        return $this->hasMany(LayawayPayment::class);
    }

    public function repair(): BelongsTo
    {
        return $this->belongsTo(Repair::class);
    }

    public function dealerItem(): HasMany
    {
        return $this->hasMany(DealerItem::class);
    }
}
