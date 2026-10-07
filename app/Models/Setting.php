<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];
    protected static $runtimeCache = null;

    public static function getAllSettings(): array
    {
        if (static::$runtimeCache === null) {
            try {
                static::$runtimeCache = Cache::remember('all_store_settings', 300, function () {
                    return static::pluck('value', 'key')->toArray();
                });
            } catch (\Throwable $e) {
                static::$runtimeCache = static::pluck('value', 'key')->toArray();
            }
        }
        return static::$runtimeCache ?? [];
    }

    public static function getAllAsKeyValue(): array
    {
        $settings = static::getAllSettings();

        // Support both shop_* and store_* aliases seamlessly in PDF views
        if (isset($settings['shop_name']) && !isset($settings['store_name'])) {
            $settings['store_name'] = $settings['shop_name'];
        }
        if (isset($settings['shop_address']) && !isset($settings['store_address'])) {
            $settings['store_address'] = $settings['shop_address'];
        }
        if (isset($settings['shop_phone']) && !isset($settings['store_phone'])) {
            $settings['store_phone'] = $settings['shop_phone'];
        }
        if (isset($settings['shop_email']) && !isset($settings['store_email'])) {
            $settings['store_email'] = $settings['shop_email'];
        }

        // Dynamically auto-fill bank and payment details from active treasury accounts if not manually specified
        if (empty($settings['bank_name']) || empty($settings['bank_account_number'])) {
            try {
                $bankAccount = PaymentAccount::where('type', 'bank')->where('is_active', true)->first();
                if ($bankAccount) {
                    $settings['bank_name'] = $settings['bank_name'] ?? ($bankAccount->bank_name ?: $bankAccount->name);
                    $settings['bank_account_number'] = $settings['bank_account_number'] ?? $bankAccount->account_number;
                    $settings['bank_account_name'] = $settings['bank_account_name'] ?? ($bankAccount->account_name ?: ($settings['store_name'] ?? 'SmartPOS'));
                }
            } catch (\Throwable $e) {
                // Ignore if payment_accounts table is not queried
            }
        }

        return $settings;
    }

    public static function get(string $key, $default = null)
    {
        $all = static::getAllSettings();

        if (!array_key_exists($key, $all)) {
            return $default;
        }

        $val = $all[$key];
        // Try decoding JSON
        $decoded = json_decode($val, true);
        return is_null($decoded) && $val !== 'null' ? $val : $decoded;
    }

    public static function set(string $key, $value)
    {
        $valToStore = is_array($value) || is_object($value) ? json_encode($value) : $value;
        try {
            Cache::forget('all_store_settings');
        } catch (\Throwable $e) {
            // Ignore cache failure
        }
        static::$runtimeCache = null;

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
