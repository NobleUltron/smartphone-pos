<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    protected $fillable = ['category_id', 'brand_id', 'model_name', 'type', 'sku', 'quantity', 'cost_price', 'selling_price'];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function deviceImeis(): HasMany
    {
        return $this->hasMany(DeviceImei::class);
    }

    public function purchaseItems(): HasMany
    {
        return $this->hasMany(PurchaseItem::class);
    }

    public function repairs()
    {
        return $this->belongsToMany(Repair::class, 'repair_parts')
                    ->withPivot('id', 'quantity', 'price', 'cost')
                    ->withTimestamps();
    }
}
