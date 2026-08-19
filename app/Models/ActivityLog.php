<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'module',
        'description',
        'ip_address',
        'properties',
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Quick helper to record an activity log entry
     */
    public static function log(string $action, string $module, string $description, ?array $properties = null)
    {
        try {
            return static::create([
                'user_id' => auth()->id(),
                'action' => $action,
                'module' => $module,
                'description' => $description,
                'ip_address' => request()->ip(),
                'properties' => $properties,
            ]);
        } catch (\Exception $e) {
            // Silently catch to prevent failing main user operation if log fails
            \Log::error('ActivityLog recording failed: ' . $e->getMessage());
            return null;
        }
    }
}
