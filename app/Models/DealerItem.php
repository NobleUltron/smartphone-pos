<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DealerItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'dealer_id',
        'direction',
        'device_imei_id',
        'type',
        'product_id',
        'quantity',
        'quantity_sold',
        'quantity_returned',
        'retail_price',
        'wholesale_cost',
        'dealer_price',
        'user_id',
        'issued_at',
        'expected_return_date',
        'status',
        'returned_at',
        'sold_at',
        'sale_id',
        'notes',
        'settlement_status',
        'settled_at',
        'settlement_method',
        'settlement_amount',
        'settlement_notes',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    protected $casts = [
        'issued_at' => 'datetime',
        'expected_return_date' => 'date',
        'returned_at' => 'datetime',
        'sold_at' => 'datetime',
        'settled_at' => 'datetime',
    ];

    public function dealer()
    {
        return $this->belongsTo(Dealer::class);
    }

    public function deviceImei()
    {
        return $this->belongsTo(DeviceImei::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function sale()
    {
        return $this->belongsTo(Sale::class);
    }
}
