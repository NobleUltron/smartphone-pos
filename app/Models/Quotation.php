<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_number',
        'customer_id',
        'user_id',
        'issue_date',
        'valid_until',
        'status',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'discount',
        'total_amount',
        'terms_conditions',
        'notes',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'valid_until' => 'date',
        'subtotal' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public static function generateNumber(): string
    {
        $year = date('Y');
        $last = self::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $num = $last ? ((int) substr($last->quotation_number, -4)) + 1 : 1;
        return sprintf('QT-%s-%04d', $year, $num);
    }
}
