<?php

namespace App\Http\Controllers;

use App\Models\StockAudit;
use App\Models\StockAuditItem;
use App\Models\DeviceImei;
use App\Models\Product;
use App\Models\Setting;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class StockAuditController extends Controller
{
    public function index()
    {
        $audits = StockAudit::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        $metrics = [
            'total_audits' => StockAudit::count(),
            'active_audits' => StockAudit::where('status', 'In Progress')->count(),
            'total_missing_logged' => StockAudit::where('status', 'Completed')->sum('total_missing'),
        ];

        return Inertia::render('Inventory/Audit/Index', [
            'audits' => $audits,
            'metrics' => $metrics,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $auditNumber = 'AUD-' . date('Ymd-His');
        $expectedCount = DeviceImei::where('status', 'In Stock')->count();

        $audit = StockAudit::create([
            'audit_number' => $auditNumber,
            'title' => $validated['title'],
            'status' => 'In Progress',
            'user_id' => auth()->id(),
            'started_at' => now(),
            'total_expected' => $expectedCount,
            'total_scanned' => 0,
            'total_missing' => 0,
            'notes' => $validated['notes'] ?? null,
        ]);

        return redirect()->route('inventory.audits.show', $audit->id)
            ->with('success', 'Stock audit session started successfully.');
    }

    public function show(StockAudit $audit)
    {
        $audit->load(['user', 'items.deviceImei.product.brand', 'items.product.brand']);

        $scannedImeiIds = $audit->items->pluck('device_imei_id')->filter()->toArray();

        // Get expected devices that have NOT been scanned yet
        $unscannedDevices = DeviceImei::with('product.brand')
            ->where('status', 'In Stock')
            ->whereNotIn('id', $scannedImeiIds)
            ->get();

        return Inertia::render('Inventory/Audit/Show', [
            'audit' => $audit,
            'unscannedDevices' => $unscannedDevices,
        ]);
    }

    public function scan(Request $request, StockAudit $audit)
    {
        if ($audit->status !== 'In Progress') {
            return response()->json(['error' => 'Audit session is already finalized or cancelled.'], 400);
        }

        $validated = $request->validate([
            'code' => 'required|string',
        ]);

        $code = trim($validated['code']);

        // Check if already scanned in this audit session
        $alreadyScanned = $audit->items()->where('imei_scanned', $code)->first();
        if ($alreadyScanned) {
            return response()->json([
                'result' => 'duplicate',
                'message' => "Item with code '{$code}' has already been scanned in this audit session.",
                'item' => $alreadyScanned->load('deviceImei.product.brand'),
            ]);
        }

        // Match against DeviceImei table
        $device = DeviceImei::with('product.brand')
            ->where('imei', $code)
            ->first();

        if ($device && $device->status === 'In Stock') {
            $auditItem = StockAuditItem::create([
                'stock_audit_id' => $audit->id,
                'device_imei_id' => $device->id,
                'imei_scanned' => $code,
                'status' => 'Found',
                'scanned_at' => now(),
                'notes' => null,
            ]);

            $audit->increment('total_scanned');

            $brandName = $device->product->brand->name ?? '';
            $modelName = $device->product->model_name ?? 'Device';

            return response()->json([
                'result' => 'found',
                'message' => "Verified In-Stock: {$brandName} {$modelName} (IMEI: {$code})",
                'item' => $auditItem->load('deviceImei.product.brand'),
                'scanned_count' => $audit->total_scanned,
            ]);
        } elseif ($device && $device->status !== 'In Stock') {
            // Scanned device exists but is NOT in stock (e.g. Sold, Defective, Transferred)
            $auditItem = StockAuditItem::create([
                'stock_audit_id' => $audit->id,
                'device_imei_id' => $device->id,
                'imei_scanned' => $code,
                'status' => 'Unmatched',
                'scanned_at' => now(),
                'notes' => "Status Mismatch: Device exists in DB but status is '{$device->status}'",
            ]);

            $brandName = $device->product->brand->name ?? '';
            $modelName = $device->product->model_name ?? 'Device';

            return response()->json([
                'result' => 'unmatched',
                'message' => "Warning: Scanned {$brandName} {$modelName} (IMEI: {$code}), but its DB status is '{$device->status}' (not In Stock).",
                'item' => $auditItem->load('deviceImei.product.brand'),
                'scanned_count' => $audit->total_scanned,
            ]);
        } else {
            // Unmatched IMEI or code scanned
            $auditItem = StockAuditItem::create([
                'stock_audit_id' => $audit->id,
                'imei_scanned' => $code,
                'status' => 'Unmatched',
                'scanned_at' => now(),
                'notes' => 'Scanned code not found in inventory database',
            ]);

            return response()->json([
                'result' => 'unmatched',
                'message' => "Warning: Scanned code '{$code}' was not found in inventory database.",
                'item' => $auditItem,
                'scanned_count' => $audit->total_scanned,
            ]);
        }
    }

    public function complete(StockAudit $audit)
    {
        if ($audit->status !== 'In Progress') {
            return redirect()->back()->with('error', 'Audit is already completed or cancelled.');
        }

        $scannedImeiIds = $audit->items()->pluck('device_imei_id')->filter()->toArray();

        // Get missing devices that were expected in stock but never scanned
        $missingDevices = DeviceImei::where('status', 'In Stock')
            ->whereNotIn('id', $scannedImeiIds)
            ->get();

        foreach ($missingDevices as $missing) {
            StockAuditItem::create([
                'stock_audit_id' => $audit->id,
                'device_imei_id' => $missing->id,
                'imei_scanned' => $missing->imei,
                'status' => 'Missing',
                'scanned_at' => now(),
                'notes' => 'Not scanned during physical audit',
            ]);
        }

        $missingCount = $missingDevices->count();

        $audit->update([
            'status' => 'Completed',
            'completed_at' => now(),
            'total_missing' => $missingCount,
        ]);

        return redirect()->route('inventory.audits.show', $audit->id)
            ->with('success', "Stock audit completed. {$missingCount} missing item(s) logged.");
    }

    public function export(StockAudit $audit)
    {
        $audit->load(['user', 'items.deviceImei.product.brand', 'items.product.brand']);

        $settings = [
            'shop_name' => Setting::get('shop_name', 'SmartPOS Kampala'),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => Setting::get('currency_symbol', 'UGX'),
        ];

        $pdf = Pdf::loadView('pdf.stock_audit_report', compact('audit', 'settings'))
            ->setPaper('a4', 'portrait');

        $filename = 'stock-audit-' . $audit->audit_number . '.pdf';

        return $pdf->download($filename);
    }

    public function destroy(StockAudit $audit)
    {
        $audit->delete();

        return redirect()->route('inventory.audits.index')
            ->with('success', 'Stock audit session deleted successfully.');
    }
}
