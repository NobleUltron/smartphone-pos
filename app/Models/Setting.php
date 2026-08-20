<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];
    protected static $runtimeCache = null;

    public static function get(string $key, $default = null)
    {
        if (static::$runtimeCache === null) {
            static::$runtimeCache = static::pluck('value', 'key')->toArray();
        }

        if (!array_key_exists($key, static::$runtimeCache)) {
            return $default;
        }

        $val = static::$runtimeCache[$key];
        // Try decoding JSON
        $decoded = json_decode($val, true);
        return is_null($decoded) && $val !== 'null' ? $val : $decoded;
    }

    public static function set(string $key, $value)
    {
        $valToStore = is_array($value) || is_object($value) ? json_encode($value) : $value;
        if (static::$runtimeCache !== null) {
            static::$runtimeCache[$key] = $valToStore;
        }
        return static::updateOrCreate(
            ['key' => $key],
            ['value' => $valToStore]
        );
    }

    public static function getLogoUrl()
    {
        $val = static::get('store_logo');
        if ($val && str_starts_with($val, 'data:image')) {
            return route('images.store_logo');
        }
        return $val;
    }
}
