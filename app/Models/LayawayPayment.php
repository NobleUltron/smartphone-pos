<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LayawayPayment extends Model
{
    protected $fillable = ['sale_id', 'cash_drawer_id', 'amount_paid', 'payment_method', 'payment_date'];

    protected $casts = [
        'payment_date' => 'datetime',
    ];

    public function sale(): BelongsTo
    {
        return $this->belongsTo(Sale::class);
    }
}
