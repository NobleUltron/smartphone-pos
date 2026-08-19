<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Repair extends Model
{
    use HasFactory;

    protected $fillable = [
        'repair_code',
        'customer_id',
        'customer_name',
        'customer_phone',
        'device_model',
        'imei_serial',
        'device_passcode',
        'issue_description',
        'estimated_cost',
        'deposit',
        'status',
        'technician_notes',
        'user_id',
        'technician_id',
        'pre_repair_checklist',
        'expected_completion_date',
    ];

    protected $casts = [
        'estimated_cost' => 'decimal:2',
        'deposit' => 'decimal:2',
        'pre_repair_checklist' => 'array',
        'expected_completion_date' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function technician()
    {
        return $this->belongsTo(User::class, 'technician_id');
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function parts()
    {
        return $this->belongsToMany(Product::class, 'repair_parts')
                    ->withPivot('id', 'quantity', 'price', 'cost')
                    ->withTimestamps();
    }

    public function sale()
    {
        return $this->hasOne(Sale::class);
    }
}
