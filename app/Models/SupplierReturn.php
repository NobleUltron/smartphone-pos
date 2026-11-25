<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierReturn extends Model
{
    protected $fillable = [
        'supplier_id',
        'purchase_id',
        'device_imei_id',
        'replacement_imei_id',
        'payment_account_id',
        'user_id',
        'return_type',
        'resolution',
        'amount',
        'status',
        'reason',
        'returned_at',
        'received_back_at',
    ];

    protected $casts = [
        'amount' => 'float',
        'returned_at' => 'datetime',
        'received_back_at' => 'datetime',
    ];

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function deviceImei(): BelongsTo
    {
        return $this->belongsTo(DeviceImei::class, 'device_imei_id');
    }

    public function replacementImei(): BelongsTo
    {
        return $this->belongsTo(DeviceImei::class, 'replacement_imei_id');
    }

    public function paymentAccount(): BelongsTo
    {
        return $this->belongsTo(PaymentAccount::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

