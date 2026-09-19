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

    public function serveLogo()
    {
        $val = Setting::get('store_logo');
        if (!$val) {
            abort(404);
        }

        if (str_starts_with($val, 'data:image')) {
            list($type, $data) = explode(';', $val);
            list(, $data)      = explode(',', $data);
            $type = str_replace('data:', '', $type);
            $decoded = base64_decode($data);

            return response($decoded)
                ->header('Content-Type', $type)
                ->header('Cache-Control', 'public, max-age=86400');
        }

        $clean = ltrim($val, '/\\');
        if (str_starts_with($clean, 'storage/')) {
            $storagePath = storage_path('app/public/' . substr($clean, 8));
            if (file_exists($storagePath)) {
                return response()->file($storagePath);
            }
        }
        $publicPath = public_path($clean);
        if (file_exists($publicPath)) {
            return response()->file($publicPath);
        }

        abort(404);
    }

    public function index()
    {
        $this->authorizeAdmin();

        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $defaultPrintMode = $isWindows ? 'spooler' : 'browser';

        $settings = [
            'shop_name' => Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => Setting::getLogoUrl(),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => Setting::getTermsConditions(),
            'allow_cashier_discounts' => (bool) Setting::get('allow_cashier_discounts', true),
            'allow_cashier_price_overwrites' => (bool) Setting::get('allow_cashier_price_overwrites', true),
            'allow_cashier_dealer_intake' => (bool) Setting::get('allow_cashier_dealer_intake', true),
            'print_mode' => Setting::get('print_mode', $defaultPrintMode),
            'printer_paper_width' => Setting::get('printer_paper_width', '80mm'),
            'printer_network_ip' => Setting::get('printer_network_ip', '192.168.1.150'),
            'printer_network_port' => (int) Setting::get('printer_network_port', 9100),
            'qz_printer_name' => Setting::get('qz_printer_name', 'E-PoS printer driver (1)'),
            'printer_kick_drawer' => (bool) Setting::get('printer_kick_drawer', false),
            'printer_cut_paper' => (bool) Setting::get('printer_cut_paper', true),
            'printer_print_logo' => (bool) Setting::get('printer_print_logo', true),
        ];

        $windowsPrinters = (new \App\Services\ReceiptPrinterService())->getWindowsPrinters();

        return Inertia::render('Settings/StoreSettings', [
            'settings' => $settings,
            'windowsPrinters' => $windowsPrinters,
            'isWindows' => $isWindows,
            'serverOs' => PHP_OS,
        ]);
    }

    public function getSettings()
    {
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $defaultPrintMode = $isWindows ? 'spooler' : 'browser';

        return response()->json([
            'shop_name' => Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => Setting::getLogoUrl(),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => Setting::getTermsConditions(),
            'allow_cashier_discounts' => (bool) Setting::get('allow_cashier_discounts', true),
            'allow_cashier_price_overwrites' => (bool) Setting::get('allow_cashier_price_overwrites', true),
            'allow_cashier_dealer_intake' => (bool) Setting::get('allow_cashier_dealer_intake', true),
            'print_mode' => Setting::get('print_mode', $defaultPrintMode),
            'printer_paper_width' => Setting::get('printer_paper_width', '80mm'),
            'printer_network_ip' => Setting::get('printer_network_ip', '192.168.1.150'),
            'printer_network_port' => (int) Setting::get('printer_network_port', 9100),
            'qz_printer_name' => Setting::get('qz_printer_name', 'E-PoS printer driver (1)'),
            'printer_kick_drawer' => (bool) Setting::get('printer_kick_drawer', false),
            'printer_cut_paper' => (bool) Setting::get('printer_cut_paper', true),
            'printer_print_logo' => (bool) Setting::get('printer_print_logo', true),
            'windows_printers' => (new \App\Services\ReceiptPrinterService())->getWindowsPrinters(),
            'is_windows' => $isWindows,
            'server_os' => PHP_OS,
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
            'store_logo' => 'nullable',
            'allow_cashier_discounts' => 'nullable|boolean',
            'allow_cashier_price_overwrites' => 'nullable|boolean',
            'allow_cashier_dealer_intake' => 'nullable|boolean',
            'print_mode' => 'nullable|string|in:browser,spooler,network,qztray,mock',
            'printer_paper_width' => 'nullable|string|in:80mm,58mm',
            'printer_network_ip' => 'nullable|string|max:100',
            'printer_network_port' => 'nullable|integer|min:1|max:65535',
            'qz_printer_name' => 'nullable|string|max:255',
            'printer_kick_drawer' => 'nullable|boolean',
            'printer_cut_paper' => 'nullable|boolean',
            'printer_print_logo' => 'nullable|boolean',
        ]);

        if ($request->hasFile('store_logo')) {
            $request->validate([
                'store_logo' => 'image|mimes:jpeg,png,jpg,webp,svg|max:10240',
            ]);
            $file = $request->file('store_logo');
            $path = $file->store('logos', 'public');
            Setting::set('store_logo', '/storage/' . $path);
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
