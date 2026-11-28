<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use Carbon\Carbon;
use Inertia\Inertia;

class ReceiptHistoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Sale::with(['saleItems.deviceImei.product.brand', 'saleItems.product.brand', 'customer', 'user', 'layawayPayments', 'repair', 'dealerItem.dealer'])
            ->orderBy('created_at', 'desc');

        // Search Filter (Receipt #, Customer Name/Phone, Cashier, Device IMEI, Dealer Name/Phone)
        if ($request->filled('search')) {
            $rawSearch = trim($request->input('search'));
            $search = '%' . strtolower($rawSearch) . '%';
            $cleanId = preg_replace('/[^0-9]/', '', $rawSearch);

            $query->where(function ($q) use ($search, $cleanId) {
                if (!empty($cleanId)) {
                    $q->orWhere('id', (int) $cleanId);
                }
                $q->orWhereHas('customer', function ($cq) use ($search) {
                    $cq->whereRaw('LOWER(name) LIKE ?', [$search])
                       ->orWhereRaw('LOWER(phone) LIKE ?', [$search]);
                })->orWhereHas('user', function ($uq) use ($search) {
                    $uq->whereRaw('LOWER(name) LIKE ?', [$search]);
                })->orWhereHas('saleItems.deviceImei', function ($iq) use ($search) {
                    $iq->whereRaw('LOWER(imei) LIKE ?', [$search]);
                })->orWhereHas('dealerItem.dealer', function ($dq) use ($search) {
                    $dq->whereRaw('LOWER(name) LIKE ?', [$search])
                       ->orWhereRaw('LOWER(phone) LIKE ?', [$search]);
                });
            });
        }

        // Payment Method Filter
        if ($request->filled('payment_method') && $request->input('payment_method') !== 'all') {
            $query->where('payment_method', $request->input('payment_method'));
        }

        // Payment Status Filter
        if ($request->filled('payment_status') && $request->input('payment_status') !== 'all') {
            $query->where('payment_status', $request->input('payment_status'));
        }

        // Date Filter (COALESCE handles sales where sale_date is NULL)
        if ($request->filled('date_filter') && $request->input('date_filter') !== 'all') {
            switch ($request->input('date_filter')) {
                case 'today':
                    $query->whereRaw('DATE(COALESCE(sale_date, created_at)) = ?', [Carbon::today()->toDateString()]);
                    break;
                case 'yesterday':
                    $query->whereRaw('DATE(COALESCE(sale_date, created_at)) = ?', [Carbon::yesterday()->toDateString()]);
                    break;
                case 'this_week':
                    $query->whereRaw('COALESCE(sale_date, created_at) BETWEEN ? AND ?', [
                        Carbon::now()->startOfWeek()->toDateTimeString(),
                        Carbon::now()->endOfWeek()->toDateTimeString(),
                    ]);
                    break;
                case 'this_month':
                    $query->whereRaw('COALESCE(sale_date, created_at) BETWEEN ? AND ?', [
                        Carbon::now()->startOfMonth()->toDateTimeString(),
                        Carbon::now()->endOfMonth()->toDateTimeString(),
                    ]);
                    break;
            }
        }

        // Single aggregate query for filtered summary stats (replaces 5 separate cloned queries)
        $stats = (clone $query)
            ->reorder()
            ->selectRaw("
                COUNT(*) as total_receipts,
                COALESCE(SUM(CASE WHEN payment_status != 'Refunded' THEN final_amount ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_status = 'Refunded' THEN final_amount ELSE 0 END), 0) as total_refunded,
                SUM(CASE WHEN payment_status = 'Refunded' THEN 1 ELSE 0 END) as refunded_count,
                COALESCE(SUM(CASE WHEN payment_status != 'Refunded' THEN discount ELSE 0 END), 0) as total_discounts
            ")
            ->first();

        $totalReceipts = (int) ($stats->total_receipts ?? 0);
        $totalRevenue = (float) ($stats->total_revenue ?? 0);
        $totalRefunded = (float) ($stats->total_refunded ?? 0);
        $refundedCount = (int) ($stats->refunded_count ?? 0);
        $totalDiscounts = (float) ($stats->total_discounts ?? 0);
        $validCount = max(0, $totalReceipts - $refundedCount);
        $avgSaleValue = $validCount > 0 ? round($totalRevenue / $validCount) : 0;

        $perPage = max(10, min(100, (int) $request->input('per_page', 10)));
        $sales = $query->paginate($perPage)->withQueryString();

        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => \App\Models\Setting::getLogoUrl(),
            'shop_address' => \App\Models\Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => \App\Models\Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => \App\Models\Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => \App\Models\Setting::getTermsConditions(),
        ];

        return Inertia::render('Receipts/Index', [
            'sales' => $sales,
            'settings' => $settings,
            'inStockDevices' => fn () => \App\Models\DeviceImei::with('product:id,model_name,brand_id', 'product.brand:id,name')
                ->select('id', 'product_id', 'imei', 'storage_capacity', 'color', 'selling_price', 'condition')
                ->where('status', 'In Stock')
                ->orderByDesc('id')
                ->limit(250)
                ->get()
                ->map(function ($d) {
                    $brand = $d->product?->brand?->name ?? '';
                    $model = $d->product?->model_name ?? 'Device';
                    $spec = trim(($d->storage_capacity ?? '') . ' ' . ($d->color ?? ''));
                    return [
                        'id' => $d->id,
                        'imei' => $d->imei,
                        'label' => trim("{$brand} {$model}" . ($spec ? " ({$spec})" : '')) . " — IMEI: {$d->imei}",
                        'selling_price' => (float) ($d->selling_price ?? 0),
                        'condition' => $d->condition ?? 'Brand New',
                    ];
                })
                ->values(),
            'summary' => [
                'total_receipts' => $totalReceipts,
                'total_revenue' => $totalRevenue,
                'total_refunded' => $totalRefunded,
                'refunded_count' => $refundedCount,
                'total_discounts' => $totalDiscounts,
                'avg_sale_value' => $avgSaleValue,
            ],
            'filters' => $request->only(['search', 'payment_method', 'payment_status', 'date_filter']),
        ]);
    }

    public function refund(Request $request, Sale $sale)
    {
        if (!(auth()->user()?->hasPermission('issue_refunds'))) {
            abort(403, 'You do not have permission to process sales refunds.');
        }

        $validated = $request->validate([
            'restock_action' => 'required|in:restock,defective',
            'refund_method' => 'nullable|in:Cash,MTN MoMo,Airtel Money,Bank Transfer',
            'notes' => 'nullable|string',
        ]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($sale, $validated) {
            $lockedSale = Sale::where('id', $sale->id)->lockForUpdate()->firstOrFail();

            if ($lockedSale->payment_status === 'Refunded') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'drawer_validation' => "Receipt #{$lockedSale->id} has already been refunded."
                ]);
            }

            // 1. Calculate actual amount to refund BEFORE updating the status
            // (if layaway / partial, only refund what was actually paid)
            $refundAmount = $lockedSale->payment_status === 'Partial'
                ? (float) $lockedSale->layawayPayments()->sum('amount_paid')
                : (float) $lockedSale->final_amount;

            $defaultMethod = ($lockedSale->payment_method && $lockedSale->payment_method !== 'Layaway') ? $lockedSale->payment_method : 'Cash';
            $refundMethod = $validated['refund_method'] ?? $defaultMethod;

            // Strict Drawer Validation only when refunding physical Cash from Till
            $activeDrawer = null;
            if ($refundAmount > 0 && $refundMethod === 'Cash') {
                $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                    ->where('status', 'open')
                    ->first();

                if (!$activeDrawer) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'drawer_validation' => "You must have an open shift (active cash drawer) to process a Cash refund."
                    ]);
                }

                $expectedCash = $activeDrawer->calculateExpectedCash();
                if ($expectedCash < $refundAmount) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'drawer_validation' => "Strict Drawer Validation Failed: Your cash drawer does not have enough expected cash (" . number_format($expectedCash) . " UGX) to process a refund of " . number_format($refundAmount) . " UGX. Please request a 'Cash In' float addition from management first."
                    ]);
                }
            }

            // 2. Mark sale status as Refunded
            $lockedSale->update(['payment_status' => 'Refunded']);

            // 3. Log Expense & Treasury outflow on the chosen refund channel
            if ($refundAmount > 0) {
                $refundAccount = $refundMethod === 'Cash'
                    ? \App\Services\TreasuryService::getTillAccount()
                    : \App\Models\PaymentAccount::getForMethod($refundMethod);

                $isCurrentShift = $activeDrawer && $lockedSale->cash_drawer_id === $activeDrawer->id;
                $refundCategory = $refundMethod === 'Cash'
                    ? ($isCurrentShift ? 'Refund' : 'Refund (Past Shift)')
                    : 'Refund';

                \App\Models\Expense::create([
                    'cash_drawer_id' => $activeDrawer?->id,
                    'payment_account_id' => $refundAccount?->id,
                    'user_id' => auth()->id(),
                    'category' => $refundCategory,
                    'amount' => $refundAmount,
                    'expense_date' => now(),
                    'description' => "Receipt Refund ({$refundMethod}) for Sale #{$lockedSale->id}" . (!empty($validated['notes']) ? " - " . $validated['notes'] : ''),
                    'recorded_by' => auth()->id(),
                ]);

                \App\Services\TreasuryService::recordOutflow(
                    $refundAccount,
                    floatval($refundAmount),
                    'Refund',
                    $lockedSale,
                    "POS Refund ({$refundMethod}) for Sale #{$lockedSale->id}" . (!empty($validated['notes']) ? " - {$validated['notes']}" : ''),
                    'REF-' . $lockedSale->id,
                    auth()->id()
                );
            }

            // 4. Update device inventory statuses & revert inward dealer consignments
            $items = $lockedSale->saleItems()->with(['deviceImei', 'product'])->get();
            $targetStatus = $validated['restock_action'] === 'restock' ? 'In Stock' : 'Defective';

            foreach ($items as $item) {
                if ($item->deviceImei) {
                    $item->deviceImei->update(['status' => $targetStatus]);

                    // Revert linked inward dealer consignment item if present
                    $dealerItem = \App\Models\DealerItem::where('direction', 'inward')
                        ->where('device_imei_id', $item->device_imei_id)
                        ->where('sale_id', $lockedSale->id)
                        ->first();
                    if ($dealerItem) {
                        $newQtySold = max(0, (int) $dealerItem->quantity_sold - 1);
                        $dealerItem->update([
                            'quantity_sold' => $newQtySold,
                            'status' => $newQtySold === 0 ? 'Pending' : $dealerItem->status,
                            'sold_at' => $newQtySold === 0 ? null : $dealerItem->sold_at,
                            'sale_id' => $newQtySold === 0 ? null : $dealerItem->sale_id,
                        ]);
                    }

                    // Create a WarrantyClaim log for auditing
                    \App\Models\WarrantyClaim::create([
                        'sale_item_id' => $item->id,
                        'device_imei_id' => $item->device_imei_id,
                        'customer_id' => $lockedSale->customer_id,
                        'claim_type' => 'Refund',
                        'issue_description' => $validated['notes'] ?? 'Direct Receipt Refund processed by cashier/manager.',
                        'status' => 'Completed',
                        'resolution_notes' => "Direct Store Refund. Device IMEI marked {$targetStatus}.",
                        'resolved_at' => now(),
                    ]);
                } elseif ($item->product_id && $item->product && $item->product->type === 'bulk') {
                    $qtyToRestore = (int) ($item->quantity ?? 1);
                    if ($targetStatus === 'In Stock') {
                        $item->product->increment('quantity', $qtyToRestore);
                    }

                    // Revert inward bulk dealer consignment item linked to this sale
                    $dealerItems = \App\Models\DealerItem::where('direction', 'inward')
                        ->where('product_id', $item->product_id)
                        ->where('sale_id', $lockedSale->id)
                        ->where('quantity_sold', '>', 0)
                        ->get();
                    $remainingToRevert = $qtyToRestore;
                    foreach ($dealerItems as $dealerItem) {
                        if ($remainingToRevert <= 0) break;
                        $revert = min($remainingToRevert, (int) $dealerItem->quantity_sold);
                        $newQtySold = max(0, (int) $dealerItem->quantity_sold - $revert);
                        $dealerItem->update([
                            'quantity_sold' => $newQtySold,
                            'status' => $newQtySold < (int) $dealerItem->quantity ? 'Pending' : $dealerItem->status,
                            'sold_at' => $newQtySold === 0 ? null : $dealerItem->sold_at,
                            'sale_id' => $newQtySold === 0 ? null : $dealerItem->sale_id,
                        ]);
                        $remainingToRevert -= $revert;
                    }
                }
            }

            \App\Models\ActivityLog::log(
                'receipt_refund',
                'Receipts',
                "Refunded Receipt #{$lockedSale->id} for UGX " . number_format($refundAmount) . " via {$refundMethod} (Items: {$targetStatus})",
                [
                    'sale_id' => $lockedSale->id,
                    'refund_amount' => $refundAmount,
                    'refund_method' => $refundMethod,
                    'restock_action' => $validated['restock_action'],
                    'notes' => $validated['notes'] ?? null,
                ]
            );
        });

        \Illuminate\Support\Facades\Cache::forget('global_low_stock_count');
        \Illuminate\Support\Facades\Cache::forget('inventory_stats');

        return redirect()->back()->with('success', "Receipt #{$sale->id} has been refunded successfully.");
    }

    /**
     * One-Step Device Exchange (Swap a sold serialized phone for another In-Stock phone).
     * Automatically collects or refunds only the price difference, updates inventory statuses,
     * and keeps Partner Profit Share 100% accurate.
     */
    public function exchange(Request $request, Sale $sale)
    {
        if (!(auth()->user()?->hasPermission('issue_refunds'))) {
            abort(403, 'You do not have permission to process device exchanges.');
        }

        $validated = $request->validate([
            'sale_item_id' => 'required|integer|exists:sale_items,id',
            'replacement_imei_id' => 'required|integer|exists:device_imeis,id',
            'replacement_price' => 'required|numeric|min:0',
            'return_action' => 'required|in:restock,defective',
            'payment_method' => 'nullable|in:Cash,MTN MoMo,Airtel Money,Bank Transfer',
            'notes' => 'nullable|string|max:500',
        ]);

        $summaryMsg = '';

        \Illuminate\Support\Facades\DB::transaction(function () use ($sale, $validated, &$summaryMsg) {
            $lockedSale = Sale::where('id', $sale->id)->lockForUpdate()->firstOrFail();

            if ($lockedSale->payment_status !== 'Paid') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'exchange' => "Only fully Paid receipts can be exchanged directly. Receipt #{$lockedSale->id} is '{$lockedSale->payment_status}'.",
                ]);
            }

            $saleItem = \App\Models\SaleItem::where('id', $validated['sale_item_id'])
                ->where('sale_id', $lockedSale->id)
                ->lockForUpdate()
                ->firstOrFail();

            if (!$saleItem->device_imei_id) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'exchange' => 'Selected item is not a serialized smartphone.',
                ]);
            }

            if ((int) $saleItem->device_imei_id === (int) $validated['replacement_imei_id']) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'replacement_imei_id' => 'Replacement device must be different from the returned device.',
                ]);
            }

            $oldDevice = \App\Models\DeviceImei::with('product.brand')
                ->where('id', $saleItem->device_imei_id)
                ->lockForUpdate()
                ->firstOrFail();

            $newDevice = \App\Models\DeviceImei::with('product.brand')
                ->where('id', $validated['replacement_imei_id'])
                ->lockForUpdate()
                ->firstOrFail();

            if ($newDevice->status !== 'In Stock') {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'replacement_imei_id' => "Replacement IMEI {$newDevice->imei} is no longer In Stock (current status: {$newDevice->status}).",
                ]);
            }

            $originalPrice = (float) $saleItem->price;
            $replacementPrice = (float) $validated['replacement_price'];
            $priceDiff = $replacementPrice - $originalPrice;
            $method = $validated['payment_method'] ?: ($lockedSale->payment_method !== 'Layaway' ? $lockedSale->payment_method : 'Cash');
            $returnStatus = $validated['return_action'] === 'restock' ? 'In Stock' : 'Defective';

            // Validate & record wallet movement if there is a price difference
            $activeDrawer = null;
            if (abs($priceDiff) > 0.001) {
                $targetAccount = $method === 'Cash'
                    ? \App\Services\TreasuryService::getTillAccount()
                    : \App\Models\PaymentAccount::getForMethod($method);

                if ($priceDiff < 0 && $method === 'Cash') {
                    $refundDiff = abs($priceDiff);
                    $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                        ->where('status', 'open')
                        ->first();

                    if (!$activeDrawer) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'exchange' => 'You must have an open shift (active cash drawer) to refund a Cash price difference.',
                        ]);
                    }
                    $expectedCash = $activeDrawer->calculateExpectedCash();
                    if ($expectedCash < $refundDiff) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'exchange' => 'Insufficient cash in active drawer (' . number_format($expectedCash) . ' UGX) to refund difference of ' . number_format($refundDiff) . ' UGX.',
                        ]);
                    }
                }

                if ($priceDiff > 0) {
                    \App\Services\TreasuryService::recordInflow(
                        $targetAccount,
                        $priceDiff,
                        'Sale',
                        $lockedSale,
                        "Device Exchange Top-Up ({$method}) on Receipt #{$lockedSale->id}: {$oldDevice->imei} → {$newDevice->imei}",
                        'EXC-' . $lockedSale->id,
                        auth()->id()
                    );
                } else {
                    $refundDiff = abs($priceDiff);
                    \App\Models\Expense::create([
                        'cash_drawer_id' => $activeDrawer?->id,
                        'payment_account_id' => $targetAccount?->id,
                        'user_id' => auth()->id(),
                        'category' => 'Refund',
                        'amount' => $refundDiff,
                        'expense_date' => now(),
                        'description' => "Device Exchange Difference Refund ({$method}) on Receipt #{$lockedSale->id}: {$oldDevice->imei} → {$newDevice->imei}",
                        'recorded_by' => auth()->id(),
                    ]);

                    \App\Services\TreasuryService::recordOutflow(
                        $targetAccount,
                        $refundDiff,
                        'Refund',
                        $lockedSale,
                        "Device Exchange Refund ({$method}) on Receipt #{$lockedSale->id}: {$oldDevice->imei} → {$newDevice->imei}",
                        'EXC-REF-' . $lockedSale->id,
                        auth()->id()
                    );
                }
            }

            // Update inventory statuses
            $oldDevice->update(['status' => $returnStatus]);
            $newDevice->update(['status' => 'Sold']);

            // Update SaleItem & Sale totals so Receipt + Partner Profit recalculate cleanly
            $exchangeNote = "Exchanged from IMEI {$oldDevice->imei} (" . number_format($originalPrice) . " UGX) on " . now()->format('Y-m-d');
            if (!empty($validated['notes'])) {
                $exchangeNote .= " — " . trim($validated['notes']);
            }
            $saleItem->update([
                'device_imei_id' => $newDevice->id,
                'price' => $replacementPrice,
                'notes' => trim(($saleItem->notes ? $saleItem->notes . ' | ' : '') . $exchangeNote),
            ]);

            $lockedSale->update([
                'total_amount' => max(0, (float) $lockedSale->total_amount + $priceDiff),
                'final_amount' => max(0, (float) $lockedSale->final_amount + $priceDiff),
            ]);

            // Audit trail in WarrantyClaim & ActivityLog
            $diffLabel = $priceDiff > 0
                ? 'Customer paid extra UGX ' . number_format($priceDiff) . " via {$method}"
                : ($priceDiff < 0
                    ? 'Refunded difference UGX ' . number_format(abs($priceDiff)) . " via {$method}"
                    : 'Even swap (UGX 0 difference)');

            \App\Models\WarrantyClaim::create([
                'sale_item_id' => $saleItem->id,
                'device_imei_id' => $oldDevice->id,
                'customer_id' => $lockedSale->customer_id,
                'claim_type' => 'Replacement',
                'issue_description' => $validated['notes'] ?: 'Direct Device Exchange processed on Issued Receipts.',
                'status' => 'Completed',
                'resolution_notes' => "Swapped IMEI {$oldDevice->imei} ({$returnStatus}) for IMEI {$newDevice->imei}. {$diffLabel}.",
            ]);

            \App\Models\ActivityLog::log(
                'device_exchange',
                'Receipts',
                "Exchanged Receipt #{$lockedSale->id}: {$oldDevice->imei} ({$returnStatus}) → {$newDevice->imei}. {$diffLabel}.",
                [
                    'sale_id' => $lockedSale->id,
                    'old_imei' => $oldDevice->imei,
                    'new_imei' => $newDevice->imei,
                    'return_status' => $returnStatus,
                    'price_difference' => $priceDiff,
                    'payment_method' => $method,
                ]
            );

            $summaryMsg = "Device exchanged on Receipt #{$lockedSale->id} ({$diffLabel}).";
        });

        \Illuminate\Support\Facades\Cache::forget('global_low_stock_count');
        \Illuminate\Support\Facades\Cache::forget('inventory_stats');

        return redirect()->back()->with('success', $summaryMsg);
    }
}
