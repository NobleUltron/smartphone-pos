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

        // Search Filter (Receipt #, Customer Name, Phone, Cashier)
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $cleanId = preg_replace('/[^0-9]/', '', $search);

            $query->where(function ($q) use ($search, $cleanId) {
                if (!empty($cleanId)) {
                    $q->orWhere('id', $cleanId);
                }
                $q->orWhereHas('customer', function ($cq) use ($search) {
                    $cq->where('name', 'like', "%{$search}%")
                       ->orWhere('phone', 'like', "%{$search}%");
                })->orWhereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%");
                });
            });
        }

        // Payment Method Filter
        if ($request->filled('payment_method') && $request->input('payment_method') !== 'all') {
            $query->where('payment_method', $request->input('payment_method'));
        }

        // Date Filter
        if ($request->filled('date_filter')) {
            switch ($request->input('date_filter')) {
                case 'today':
                    $query->whereDate('sale_date', Carbon::today());
                    break;
                case 'yesterday':
                    $query->whereDate('sale_date', Carbon::yesterday());
                    break;
                case 'this_week':
                    $query->whereBetween('sale_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]);
                    break;
                case 'this_month':
                    $query->whereMonth('sale_date', Carbon::now()->month)->whereYear('sale_date', Carbon::now()->year);
                    break;
            }
        }

        // Clone query for calculating overall filtered summary stats
        $summaryQuery = clone $query;
        $totalReceipts = $summaryQuery->count();
        $totalRevenue = (clone $summaryQuery)->where('payment_status', '!=', 'Refunded')->sum('final_amount');
        $totalRefunded = (clone $summaryQuery)->where('payment_status', 'Refunded')->sum('final_amount');
        $refundedCount = (clone $summaryQuery)->where('payment_status', 'Refunded')->count();
        $totalDiscounts = $summaryQuery->sum('discount');
        $avgSaleValue = ($totalReceipts - $refundedCount) > 0 ? $totalRevenue / ($totalReceipts - $refundedCount) : 0;

        $sales = $query->paginate(10)->withQueryString();

        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => \App\Models\Setting::getLogoUrl(),
            'shop_address' => \App\Models\Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => \App\Models\Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => \App\Models\Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => \App\Models\Setting::get('terms_conditions', [
                'Goods sold in good condition are not returnable.',
                'Retain this receipt for any warranty claims.',
                'Warranty does not cover physical or liquid damage.',
                'Software issues are not covered under warranty.'
            ]),
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
            'filters' => $request->only(['search', 'payment_method', 'date_filter']),
        ]);
    }

    public function refund(Request $request, Sale $sale)
    {
        $validated = $request->validate([
            'restock_action' => 'required|in:restock,defective',
            'notes' => 'nullable|string',
        ]);

        // 1. Calculate actual amount to refund BEFORE updating the status
        // (if layaway, only refund what was paid)
        $refundAmount = $sale->payment_status === 'Partial' 
            ? $sale->layawayPayments()->sum('amount_paid') 
            : $sale->final_amount;

        // Strict Drawer Validation
        if ($refundAmount > 0) {
            $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                ->where('status', 'open')
                ->first();

            if (!$activeDrawer) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'drawer_validation' => "You must have an open shift (active cash drawer) to process a refund."
                ]);
            }

            // Use the centralized model method to avoid duplicated formula drift
            $expectedCash = $activeDrawer->calculateExpectedCash();
            
            if ($expectedCash < $refundAmount) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'drawer_validation' => "Strict Drawer Validation Failed: Your cash drawer does not have enough expected cash (" . number_format($expectedCash) . " UGX) to process a refund of " . number_format($refundAmount) . " UGX. Please request a 'Cash In' float addition from management first."
                ]);
            }
        }

        // 2. Mark sale status as Refunded
        $sale->update(['payment_status' => 'Refunded']);

        // 3. Log an Expense for the Refund to deduct it from the current active Cash Drawer
        if ($refundAmount > 0 && isset($activeDrawer)) {
            $isCurrentShift = $sale->cash_drawer_id === $activeDrawer->id;
            $refundCategory = $isCurrentShift ? 'Refund' : 'Refund (Past Shift)';

            \App\Models\Expense::create([
                'cash_drawer_id' => $activeDrawer->id,
                'user_id' => auth()->id(),
                'category' => $refundCategory,
                'amount' => $refundAmount,
                'expense_date' => now(),
                'description' => "Receipt Refund for Sale #{$sale->id}" . ($validated['notes'] ? " - " . $validated['notes'] : ''),
                'recorded_by' => auth()->id(),
            ]);
        }

        // 4. Update device inventory statuses for items in this sale
        $items = $sale->saleItems()->with(['deviceImei', 'product'])->get();
        $targetStatus = $validated['restock_action'] === 'restock' ? 'In Stock' : 'Defective';

        foreach ($items as $item) {
            if ($item->deviceImei) {
                $item->deviceImei->update(['status' => $targetStatus]);

                // Create a WarrantyClaim log for auditing
                \App\Models\WarrantyClaim::create([
                    'sale_item_id' => $item->id,
                    'device_imei_id' => $item->device_imei_id,
                    'customer_id' => $sale->customer_id,
                    'claim_type' => 'Refund',
                    'issue_description' => $validated['notes'] ?? 'Direct Receipt Refund processed by cashier/manager.',
                    'status' => 'Completed',
                    'resolution_notes' => "Direct Store Refund. Device IMEI marked {$targetStatus}.",
                    'resolved_at' => now(),
                ]);
            } else if ($item->product_id && $item->product->type === 'bulk') {
                if ($targetStatus === 'In Stock') {
                    $item->product->increment('quantity', $item->quantity ?? 1);
                }
            }
        }

        return redirect()->back()->with('message', "Receipt #{$sale->id} has been refunded successfully.");
    }
}
