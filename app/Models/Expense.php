<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'cash_drawer_id',
        'user_id',
        'recorded_by',
        'amount',
        'category',
        'description',
        'expense_date',
    ];

    protected $casts = [
        'expense_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cashDrawer()
    {
        return $this->belongsTo(CashDrawer::class);
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
