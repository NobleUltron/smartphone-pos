<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Setting;
use Inertia\Inertia;

class SettingController extends Controller
{
    private function authorizeAdminOrManager()
    {
        $role = strtolower(auth()->user()->role ?? '');
        if (!in_array($role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized action. Only store administrators and managers can access store settings.');
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
        $this->authorizeAdminOrManager();

        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $defaultPrintMode = $isWindows ? 'spooler' : 'browser';

        $settings = [
            'shop_name' => Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => Setting::getLogoUrl(),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => Setting::get('shop_phone', '+256 700 000 000'),
            'shop_email' => Setting::get('shop_email', ''),
            'tin_number' => Setting::get('tin_number', ''),
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

        $lastBackupLog = \App\Models\ActivityLog::where('action', 'database_backup_downloaded')
            ->latest('created_at')
            ->first();

        return Inertia::render('Settings/StoreSettings', [
            'settings' => $settings,
            'windowsPrinters' => $windowsPrinters,
            'isWindows' => $isWindows,
            'serverOs' => PHP_OS,
            'backupMeta' => [
                'driver' => \Illuminate\Support\Facades\DB::getDriverName(),
                'last_backup_at' => $lastBackupLog?->created_at?->toIso8601String(),
                'last_backup_by' => $lastBackupLog?->user?->name,
            ],
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
            'shop_email' => Setting::get('shop_email', ''),
            'tin_number' => Setting::get('tin_number', ''),
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
        $this->authorizeAdminOrManager();

        $validated = $request->validate([
            'shop_name' => 'required|string|max:255',
            'shop_address' => 'nullable|string|max:255',
            'shop_phone' => 'nullable|string|max:255',
            'shop_email' => 'nullable|email|max:255',
            'tin_number' => 'nullable|string|max:50',
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
                'store_logo' => 'image|mimes:jpeg,png,jpg,webp|max:2048',
            ]);
            $file = $request->file('store_logo');
            $mime = $file->getMimeType() ?: 'image/png';
            $base64 = base64_encode(file_get_contents($file->getRealPath()));
            Setting::set('store_logo', "data:{$mime};base64,{$base64}");
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

        return redirect()->back()->with('success', 'Store settings and permissions updated successfully.');
    }

    public function store(Request $request)
    {
        return $this->updateSettings($request);
    }

    /**
     * One-Click Full Database Backup Download (Admin-only).
     * Works identically on SQLite, PostgreSQL (Supabase/Render), and MySQL.
     */
    public function downloadBackup()
    {
        if (strtolower(auth()->user()->role ?? '') !== 'admin') {
            abort(403, 'Unauthorized action. Only administrators can download full database backups.');
        }

        $driver = \Illuminate\Support\Facades\DB::getDriverName();
        $tableNames = [];

        if ($driver === 'pgsql') {
            $rows = \Illuminate\Support\Facades\DB::select("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
            $tableNames = array_map(fn($r) => $r->tablename, $rows);
        } elseif ($driver === 'sqlite') {
            $rows = \Illuminate\Support\Facades\DB::select("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
            $tableNames = array_map(fn($r) => $r->name, $rows);
        } else {
            $rows = \Illuminate\Support\Facades\DB::select('SHOW TABLES');
            $tableNames = array_map(fn($r) => array_values((array) $r)[0], $rows);
        }

        $skip = ['cache', 'cache_locks', 'sessions', 'jobs', 'job_batches', 'failed_jobs', 'password_reset_tokens'];
        $tables = [];
        $counts = [];

        foreach ($tableNames as $name) {
            if (in_array($name, $skip, true)) {
                continue;
            }
            $data = \Illuminate\Support\Facades\DB::table($name)->get()->toArray();
            $tables[$name] = $data;
            $counts[$name] = count($data);
        }

        $shopName = Setting::get('shop_name', 'SmartPOS');
        $slug = \Illuminate\Support\Str::slug($shopName) ?: 'smartpos';
        $filename = "{$slug}_backup_" . now()->format('Y-m-d_Hi') . '.json';

        \App\Models\ActivityLog::log(
            'database_backup_downloaded',
            'Security',
            "Downloaded full database backup ({$filename}, " . count($tables) . " tables, " . array_sum($counts) . " rows)",
            ['filename' => $filename, 'driver' => $driver, 'tables_count' => count($tables), 'total_rows' => array_sum($counts)]
        );

        $payload = [
            'meta' => [
                'app' => 'SmartPOS',
                'shop_name' => $shopName,
                'driver' => $driver,
                'exported_at' => now()->toIso8601String(),
                'exported_by' => auth()->user()->name,
                'tables_count' => count($tables),
                'total_rows' => array_sum($counts),
                'table_counts' => $counts,
            ],
            'tables' => $tables,
        ];

        $json = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return response($json, 200, [
            'Content-Type' => 'application/json',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            'Cache-Control' => 'no-store, no-cache',
        ]);
    }
}
