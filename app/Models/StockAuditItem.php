<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockAuditItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_audit_id',
        'device_imei_id',
        'product_id',
        'imei_scanned',
        'status',
        'scanned_at',
        'notes',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
    ];

    public function audit()
    {
        return $this->belongsTo(StockAudit::class, 'stock_audit_id');
    }

    public function deviceImei()
    {
        return $this->belongsTo(DeviceImei::class, 'device_imei_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}
