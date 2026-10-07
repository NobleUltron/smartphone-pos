<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Invoice extends Model
{
    protected $fillable = [
        'invoice_number',
        'quotation_id',
        'customer_id',
        'user_id',
        'po_number',
        'issue_date',
        'due_date',
        'payment_terms',
        'status',
        'payment_status',
        'subtotal',
        'tax_rate',
        'tax_amount',
        'discount',
        'total_amount',
        'paid_amount',
        'terms_conditions',
        'notes',
    ];

    protected $casts = [
        'issue_date' => 'date',
        'due_date' => 'date',
        'subtotal' => 'decimal:2',
        'tax_rate' => 'decimal:2',
        'tax_amount' => 'decimal:2',
        'discount' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
    ];

    protected $appends = [
        'balance_due',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function quotation(): BelongsTo
    {
        return $this->belongsTo(Quotation::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class)->orderBy('payment_date', 'desc');
    }

    public function getBalanceDueAttribute(): float
    {
        return max(0, floatval($this->total_amount) - floatval($this->paid_amount));
    }

    public static function generateNumber(): string
    {
        $year = date('Y');
        $last = self::whereYear('created_at', $year)
            ->orderBy('id', 'desc')
            ->first();

        $num = $last ? ((int) substr($last->invoice_number, -4)) + 1 : 1;
        return sprintf('INV-%s-%04d', $year, $num);
    }

    public function recalculatePaymentStatus(): void
    {
        $totalPaid = $this->payments()->sum('amount');
        $this->paid_amount = $totalPaid;

        if ($totalPaid >= floatval($this->total_amount)) {
            $this->payment_status = 'Paid';
        } elseif ($totalPaid > 0) {
            $this->payment_status = 'Partial';
        } else {
            $this->payment_status = (now()->gt($this->due_date)) ? 'Overdue' : 'Unpaid';
        }

        $this->save();
    }
}
