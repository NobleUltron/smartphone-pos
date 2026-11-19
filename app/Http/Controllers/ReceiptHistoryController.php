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

        // Clone query for calculating overall filtered summary stats
        $summaryQuery = clone $query;
        $totalReceipts = $summaryQuery->count();
        $totalRevenue = (float) (clone $summaryQuery)->where('payment_status', '!=', 'Refunded')->sum('final_amount');
        $totalRefunded = (float) (clone $summaryQuery)->where('payment_status', 'Refunded')->sum('final_amount');
        $refundedCount = (clone $summaryQuery)->where('payment_status', 'Refunded')->count();
        $totalDiscounts = (float) (clone $summaryQuery)->where('payment_status', '!=', 'Refunded')->sum('discount');
        $validCount = max(0, $totalReceipts - $refundedCount);
        $avgSaleValue = $validCount > 0 ? round($totalRevenue / $validCount) : 0;

        $sales = $query->paginate(10)->withQueryString();

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
}
