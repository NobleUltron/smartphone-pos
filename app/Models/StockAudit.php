<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'audit_number',
        'title',
        'status',
        'user_id',
        'started_at',
        'completed_at',
        'total_expected',
        'total_scanned',
        'total_missing',
        'notes',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function items()
    {
        return $this->hasMany(StockAuditItem::class);
    }
}
