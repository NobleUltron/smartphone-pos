<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'contact_name',
        'phone',
        'email',
        'address',
        'balance'
    ];

    public function purchases()
    {
        return $this->hasMany(Purchase::class);
    }

    public function recalculateBalance()
    {
        $remaining = $this->purchases()
            ->selectRaw('SUM(total_amount - paid_amount) as remaining')
            ->value('remaining') ?? 0;

        $this->balance = max(0, (float)$remaining);
        $this->save();
        return $this->balance;
    }
}
