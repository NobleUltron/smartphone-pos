<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CashDrawer extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'starting_cash',
        'expected_cash',
        'actual_cash',
        'difference',
        'status',
        'opened_at',
        'closed_at',
    ];

    protected $casts = [
        'opened_at' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function expenses()
    {
        return $this->hasMany(Expense::class);
    }

    public function sales()
    {
        return $this->hasMany(Sale::class);
    }

    public function calculateExpectedCash()
    {
        $cashSales = Sale::where('cash_drawer_id', $this->id)
            ->where('payment_method', 'Cash')
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->sum('final_amount');
            
        $layawayCash = LayawayPayment::where('cash_drawer_id', $this->id)
            ->where('payment_method', 'Cash')
            ->sum('amount_paid');
            
        $cashIns = $this->expenses()->where('category', 'Cash In')->sum('amount');
        $operatingExpenses = $this->expenses()->whereNotIn('category', ['Refund', 'Cash In'])->sum('amount');
        $refunds = $this->expenses()->where('category', 'Refund')->sum('amount');
        
        $grossCashSales = $cashSales + $layawayCash;
        $netCashSales = $grossCashSales - $refunds;
        
        return $this->starting_cash + $netCashSales + $cashIns - $operatingExpenses;
    }
}
