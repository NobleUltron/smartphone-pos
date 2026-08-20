<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use Inertia\Inertia;

class SettingController extends Controller
{
    private function authorizeAdmin()
    {
        if (strtolower(auth()->user()->role ?? '') !== 'admin') {
            abort(403, 'Unauthorized action. Only store administrators can modify store settings.');
        }
    }

    public function index()
    {
        $this->authorizeAdmin();

        $settings = [
            'shop_name' => Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => Setting::get('store_logo', null),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => Setting::get('terms_conditions', [
                'Goods sold in good condition are not returnable.',
                'Retain this receipt for any warranty claims.',
                'Warranty does not cover physical or liquid damage.',
                'Software issues are not covered under warranty.'
            ]),
            'allow_cashier_discounts' => (bool) Setting::get('allow_cashier_discounts', true),
            'allow_cashier_price_overwrites' => (bool) Setting::get('allow_cashier_price_overwrites', true),
            'allow_cashier_dealer_intake' => (bool) Setting::get('allow_cashier_dealer_intake', true),
        ];

        return Inertia::render('Settings/StoreSettings', [
            'settings' => $settings
        ]);
    }

    public function getSettings()
    {
        return response()->json([
            'shop_name' => Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => Setting::get('store_logo', null),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => Setting::get('terms_conditions', [
                'Goods sold in good condition are not returnable.',
                'Retain this receipt for any warranty claims.',
                'Warranty does not cover physical or liquid damage.',
                'Software issues are not covered under warranty.'
            ]),
            'allow_cashier_discounts' => (bool) Setting::get('allow_cashier_discounts', true),
            'allow_cashier_price_overwrites' => (bool) Setting::get('allow_cashier_price_overwrites', true),
            'allow_cashier_dealer_intake' => (bool) Setting::get('allow_cashier_dealer_intake', true),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $this->authorizeAdmin();

        $validated = $request->validate([
            'shop_name' => 'required|string|max:255',
            'shop_address' => 'nullable|string|max:255',
            'shop_phone' => 'nullable|string|max:255',
            'currency_symbol' => 'nullable|string|max:10',
            'receipt_footer' => 'nullable|string|max:255',
            'terms_conditions' => 'nullable|array',
            'terms_conditions.*' => 'string|max:255',
            'store_logo' => 'nullable|file|mimes:jpeg,png,jpg,webp,svg|max:2048',
            'allow_cashier_discounts' => 'nullable|boolean',
            'allow_cashier_price_overwrites' => 'nullable|boolean',
            'allow_cashier_dealer_intake' => 'nullable|boolean',
        ]);

        if ($request->hasFile('store_logo')) {
            $file = $request->file('store_logo');
            $base64 = 'data:' . $file->getMimeType() . ';base64,' . base64_encode(file_get_contents($file->getPathname()));
            Setting::set('store_logo', $base64);
        }
        unset($validated['store_logo']);

        foreach ($validated as $key => $value) {
            Setting::set($key, $value);
        }

        \App\Models\ActivityLog::log(
            'security_settings_updated',
            'Security',
            'Updated shop configuration and cashier role permissions',
            $validated
        );

        return redirect()->back()->with('message', 'Store settings and permissions updated successfully.');
    }

    public function store(Request $request)
    {
        return $this->updateSettings($request);
    }
}
