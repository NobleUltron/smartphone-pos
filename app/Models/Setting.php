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

    public static function defaultTerms(): array
    {
        return [
            'Warranty claims strictly require presentation of this original tax invoice by the original purchaser.',
            'Device IMEI and serial number must match store records; damaged or removed warranty seals void coverage.',
            'Warranty strictly covers manufacturer hardware faults and component failure under normal recommended use.',
            'Physical impact, drops, cracked screens, casing pressure damage, or liquid intrusion void all warranty.',
            'Unauthorized third-party repair, unapproved casing disassembly, jailbreaking, or OS tampering voids warranty.',
            'Goods once inspected and accepted in good working condition are not refundable for cash.',
            'Batteries, power adapters, charging cables, and consumable accessories carry a limited 30-day warranty.',
            'All warranty assessment claims require a 24–72 hour diagnostic period prior to repair or replacement.',
        ];
    }

    public static function getTermsConditions(): array
    {
        $terms = static::get('terms_conditions');
        if (empty($terms) || !is_array($terms)) {
            return static::defaultTerms();
        }
        return $terms;
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
