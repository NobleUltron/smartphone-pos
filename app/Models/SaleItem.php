<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SaleItem extends Model
{
    protected $fillable = ['sale_id', 'device_imei_id', 'product_id', 'price', 'quantity', 'warranty_months', 'notes'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }

    public function deviceImei(): BelongsTo
    {
        return $this->belongsTo(DeviceImei::class);
    }
}
