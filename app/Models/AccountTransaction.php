<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AccountTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'payment_account_id',
        'type',
        'amount',
        'balance_after',
        'category',
        'reference_type',
        'reference_id',
        'transaction_reference',
        'description',
        'user_id',
        'transaction_date',
    ];

    protected $casts = [
        'amount' => 'float',
        'balance_after' => 'float',
        'transaction_date' => 'datetime',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(PaymentAccount::class, 'payment_account_id');
    }

    public function reference(): MorphTo
    {
        return $this->morphTo();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
