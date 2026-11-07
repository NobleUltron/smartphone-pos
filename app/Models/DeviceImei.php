<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DeviceImei extends Model
{
    protected $fillable = ['product_id', 'imei', 'condition', 'status', 'cost_price', 'storage_capacity', 'color', 'selling_price', 'partner_investor_id'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function partnerInvestor(): BelongsTo
    {
        return $this->belongsTo(PartnerInvestor::class);
    }

    public function saleItems(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function dealerItems(): HasMany
    {
        return $this->hasMany(DealerItem::class);
    }
}
