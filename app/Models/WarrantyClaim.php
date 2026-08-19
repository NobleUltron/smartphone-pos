<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WarrantyClaim extends Model
{
    protected $fillable = [
        'sale_item_id',
        'device_imei_id',
        'customer_id',
        'claim_type',
        'issue_description',
        'status',
        'resolution_notes',
        'resolved_at'
    ];

    public function saleItem(): BelongsTo
    {
        return $this->belongsTo(SaleItem::class);
    }

    public function deviceImei(): BelongsTo
    {
        return $this->belongsTo(DeviceImei::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }
}
