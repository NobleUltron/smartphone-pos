<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WarrantyClaim;
use App\Models\DeviceImei;
use App\Models\SaleItem;
use App\Models\Sale;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class WarrantyController extends Controller
{
    public function index(Request $request)
    {
        $statusFilter = $request->input('status', 'all');
        $query = WarrantyClaim::with(['deviceImei.product.brand', 'saleItem.sale', 'customer']);

        if ($request->filled('search')) {
            $searchTerm = '%' . strtolower(trim($request->search)) . '%';
            $query->where(function ($q) use ($searchTerm) {
                $q->whereRaw('LOWER(claim_type) LIKE ?', [$searchTerm])
                  ->orWhereRaw('LOWER(status) LIKE ?', [$searchTerm])
                  ->orWhereHas('customer', function ($cq) use ($searchTerm) {
                      $cq->whereRaw('LOWER(name) LIKE ?', [$searchTerm])
                         ->orWhereRaw('LOWER(phone) LIKE ?', [$searchTerm]);
                  })
                  ->orWhereHas('deviceImei', function ($dq) use ($searchTerm) {
                      $dq->whereRaw('LOWER(imei) LIKE ?', [$searchTerm]);
                  });
            });
        }

        if ($statusFilter === 'active') {
            $query->whereIn('status', ['Pending', 'Approved', 'In Repair']);
        } elseif ($statusFilter === 'resolved') {
            $query->whereIn('status', ['Completed', 'Resolved', 'Rejected']);
        } elseif ($statusFilter && $statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        $perPage = max(10, min(100, (int) $request->input('per_page', 10)));
        $claims = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();

        $inStockDevices = DeviceImei::with('product.brand')
            ->where('status', 'In Stock')
            ->get();

        $activeClaims = WarrantyClaim::whereIn('status', ['Pending', 'Approved', 'In Repair'])->count();
        $resolvedClaims = WarrantyClaim::whereIn('status', ['Completed', 'Resolved', 'Rejected'])->count();
        $totalClaims = WarrantyClaim::count();

        return Inertia::render('Warranties/Index', [
            'claims' => $claims,
            'inStockDevices' => $inStockDevices,
            'filters' => [
                'search' => $request->input('search', ''),
                'status' => $statusFilter,
            ],
            'summary' => [
                'active_claims' => $activeClaims,
                'resolved_claims' => $resolvedClaims,
                'total_claims' => $totalClaims,
            ]
        ]);
    }

    public function lookup(Request $request)
    {
        $request->validate(['query' => 'required|string']);
        $query = trim($request->input('query'));

        // Clean barcode/receipt query (e.g. SALE-102, sale-102, #102 -> 102)
        $saleId = null;
        if (preg_match('/(?:SALE|INV|RECEIPT)?[-#\s]*(\d+)/i', $query, $matches)) {
            $saleId = $matches[1];
        } elseif (is_numeric($query)) {
            $saleId = $query;
        }

        $saleItems = collect();

        // 1. Search by IMEI (PostgreSQL-safe case-insensitive)
        $deviceByImei = DeviceImei::with(['product.brand'])
            ->whereRaw('LOWER(imei) = ?', [strtolower($query)])
            ->first();
        if ($deviceByImei) {
            $saleItems = SaleItem::with(['sale.customer', 'deviceImei.product.brand', 'product.brand'])
                ->where('device_imei_id', $deviceByImei->id)
                ->get();
        }

        // 2. Search by Sale ID if no direct IMEI match or if query is barcode/receipt ID
        if ($saleItems->isEmpty() && $saleId) {
            $saleItems = SaleItem::with(['sale.customer', 'deviceImei.product.brand', 'product.brand'])
                ->where('sale_id', $saleId)
                ->get();
        }

        if ($saleItems->isEmpty()) {
            return response()->json(['error' => 'No active sale record found for this IMEI or Receipt Barcode.'], 404);
        }

        // Format items with warranty calculation
        $results = $saleItems->map(function ($item) {
            $purchaseDate = Carbon::parse($item->sale->sale_date ?? $item->sale->created_at);
            $warrantyMonths = $item->warranty_months ?? 12;
            $expiryDate = $purchaseDate->copy()->addMonths($warrantyMonths);
            $now = Carbon::now();
            $daysRemaining = (int) $now->diffInDays($expiryDate, false);
            $isWarrantyActive = $daysRemaining > 0;

            $deviceImei = $item->deviceImei;
            $product = $item->product ?? $deviceImei?->product;
            $brandName = $product?->brand?->name ?? 'Device';
            $modelName = $product?->model_name ?? ($product?->name ?? 'Accessory');
            $imeiStr = $deviceImei?->imei ?? 'N/A (Bulk Item)';

            // Existing claims for this device/item
            $pastClaims = $deviceImei ? WarrantyClaim::where('device_imei_id', $deviceImei->id)->get() : collect();

            return [
                'sale_item_id' => $item->id,
                'sale_id' => $item->sale->id,
                'purchase_date' => $purchaseDate->toFormattedDateString(),
                'warranty_months' => $warrantyMonths,
                'expiry_date' => $expiryDate->toFormattedDateString(),
                'days_remaining' => $daysRemaining,
                'is_active' => $isWarrantyActive,
                'customer' => $item->sale->customer ? [
                    'id' => $item->sale->customer->id,
                    'name' => $item->sale->customer->name,
                    'phone' => $item->sale->customer->phone,
                ] : null,
                'device' => [
                    'id' => $deviceImei?->id ?? null,
                    'brand' => $brandName,
                    'model' => $modelName,
                    'imei' => $imeiStr,
                    'status' => $deviceImei?->status ?? 'Sold',
                    'condition' => $deviceImei?->condition ?? 'New',
                    'color' => $deviceImei?->color ?? 'N/A',
                    'storage' => $deviceImei?->storage_capacity ?? 'N/A',
                    'price' => $item->price,
                    'quantity' => $item->quantity,
                ],
                'past_claims_count' => $pastClaims->count(),
            ];
        });

        return response()->json(['results' => $results]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sale_item_id' => 'required|exists:sale_items,id',
            'device_imei_id' => 'required|exists:device_imeis,id',
            'customer_id' => 'nullable|exists:customers,id',
            'claim_type' => 'required|in:Repair,Replacement,Refund',
            'issue_description' => 'required|string',
            'replacement_imei_id' => 'nullable|exists:device_imeis,id',
            'device_disposition' => 'nullable|in:defective,restock,keep_sold',
            'payment_method' => 'nullable|in:Cash,Bank Transfer,MTN MoMo,Airtel Money',
        ]);

        DB::transaction(function () use ($validated) {
            $oldDevice = DeviceImei::with('product.brand')->where('id', $validated['device_imei_id'])->lockForUpdate()->first();
            $resolutionNotes = null;
            $status = 'Pending';
            $resolvedAt = null;

            $disposition = $validated['device_disposition'] ?? 'defective';

            // 1. Update old device inventory status based on disposition
            if ($oldDevice) {
                if ($disposition === 'restock') {
                    $oldDevice->update(['status' => 'In Stock']);
                } elseif ($disposition === 'defective' || $validated['claim_type'] === 'Refund') {
                    $oldDevice->update(['status' => 'Defective']);
                }
            }

            // 2. Handling Replacement Swap (if immediate replacement phone chosen)
            if ($validated['claim_type'] === 'Replacement') {
                if (!empty($validated['replacement_imei_id'])) {
                    $newDevice = DeviceImei::with('product.brand')->where('id', $validated['replacement_imei_id'])->lockForUpdate()->first();
                    if (!$newDevice || $newDevice->status !== 'In Stock') {
                        throw ValidationException::withMessages([
                            'replacement_imei_id' => 'Selected replacement device is no longer in stock.',
                        ]);
                    }
                    if ($oldDevice) {
                        $oldDevice->update(['status' => 'Defective']);
                    }
                    $newDevice->update(['status' => 'Sold']);

                    $saleItem = SaleItem::with('deviceImei.product.brand')->where('id', $validated['sale_item_id'])->lockForUpdate()->first();
                    $priceNotes = $this->handlePriceDifference($saleItem, $newDevice, $validated['customer_id'], $validated['payment_method'] ?? 'Cash');

                    // Update SaleItem to reference the new IMEI so future warranty lookups work
                    if ($saleItem) {
                        $saleItem->update([
                            'device_imei_id' => $newDevice->id,
                            'price' => $newDevice->selling_price,
                            'notes' => "Warranty Replacement for IMEI: {$oldDevice?->imei}",
                        ]);
                    }

                    $brandName = $newDevice->product->brand->name ?? '';
                    $modelName = $newDevice->product->model_name ?? '';
                    $resolutionNotes = "Replacement Issued: Swapped defective IMEI ({$oldDevice?->imei}) for {$brandName} {$modelName} (New IMEI: {$newDevice->imei})." . $priceNotes;
                    $status = 'Completed';
                    $resolvedAt = now();
                } else {
                    $resolutionNotes = "Replacement requested. Defective IMEI ({$oldDevice?->imei}) marked {$disposition}. Awaiting replacement device assignment.";
                }
            }
            // 3. Handling Refund
            elseif ($validated['claim_type'] === 'Refund') {
                $dispositionText = $disposition === 'restock' ? 'Restocked to In-Stock' : 'Marked Defective';
                $resolutionNotes = "Store Refund Processed: IMEI ({$oldDevice?->imei}) {$dispositionText}.";
                $status = 'Completed';
                $resolvedAt = now();

                $saleItem = SaleItem::with('sale')->where('id', $validated['sale_item_id'])->lockForUpdate()->first();
                if ($saleItem && $saleItem->sale && $saleItem->sale->payment_status !== 'Refunded') {
                    $this->processWarrantyRefund($saleItem, $validated['payment_method'] ?? null, "Warranty Refund for IMEI {$oldDevice?->imei}");
                }
            }

            $claim = WarrantyClaim::create([
                'sale_item_id' => $validated['sale_item_id'],
                'device_imei_id' => $validated['device_imei_id'],
                'customer_id' => $validated['customer_id'],
                'claim_type' => $validated['claim_type'],
                'issue_description' => $validated['issue_description'],
                'status' => $status,
                'resolution_notes' => $resolutionNotes,
                'resolved_at' => $resolvedAt,
            ]);

            \App\Models\ActivityLog::log(
                'warranty_claim_created',
                'Warranties',
                "Logged Warranty {$claim->claim_type} Claim #{$claim->id} for IMEI {$oldDevice?->imei} (Status: {$claim->status})",
                ['claim_id' => $claim->id, 'claim_type' => $claim->claim_type, 'status' => $claim->status]
            );
        });

        Cache::forget('global_low_stock_count');
        Cache::forget('inventory_stats');

        return redirect()->back()->with('success', 'Warranty claim submitted successfully.');
    }

    public function update(Request $request, WarrantyClaim $claim)
    {
        $validated = $request->validate([
            'status' => 'required|in:Pending,Approved,In Repair,Completed,Rejected',
            'device_action' => 'nullable|in:none,restock,hand_to_customer,issue_replacement,mark_defective',
            'replacement_imei_id' => 'nullable|exists:device_imeis,id',
            'resolution_notes' => 'nullable|string',
            'payment_method' => 'nullable|in:Cash,Bank Transfer,MTN MoMo,Airtel Money',
        ]);

        DB::transaction(function () use ($validated, $claim) {
            $lockedClaim = WarrantyClaim::with('saleItem.sale')->where('id', $claim->id)->lockForUpdate()->firstOrFail();
            $notes = $validated['resolution_notes'] ?? '';
            $deviceAction = $validated['device_action'] ?? 'none';
            $oldDevice = DeviceImei::with('product.brand')->where('id', $lockedClaim->device_imei_id)->lockForUpdate()->first();

            if ($deviceAction === 'restock' && $oldDevice) {
                $oldDevice->update(['status' => 'In Stock']);
                $notes .= " [Device Repaired & Restocked to In-Stock Inventory]";
            } elseif ($deviceAction === 'hand_to_customer' && $oldDevice) {
                $oldDevice->update(['status' => 'Sold']);
                $notes .= " [Device Repaired & Handed Back to Customer]";
            } elseif ($deviceAction === 'mark_defective' && $oldDevice) {
                $oldDevice->update(['status' => 'Defective']);
                $notes .= " [Device Marked Defective]";

                if ($lockedClaim->saleItem && $lockedClaim->saleItem->sale && $lockedClaim->saleItem->sale->payment_status !== 'Refunded') {
                    $this->processWarrantyRefund($lockedClaim->saleItem, $validated['payment_method'] ?? null, "Warranty Claim #{$lockedClaim->id} Refund for IMEI {$oldDevice->imei}");
                }
            } elseif ($deviceAction === 'issue_replacement' && !empty($validated['replacement_imei_id'])) {
                $newDevice = DeviceImei::with('product.brand')->where('id', $validated['replacement_imei_id'])->lockForUpdate()->first();
                if (!$newDevice || $newDevice->status !== 'In Stock') {
                    throw ValidationException::withMessages([
                        'replacement_imei_id' => 'Selected replacement device is no longer in stock.',
                    ]);
                }
                if ($oldDevice) {
                    $oldDevice->update(['status' => 'Defective']);
                    $newDevice->update(['status' => 'Sold']);

                    $priceNotes = $this->handlePriceDifference($lockedClaim->saleItem, $newDevice, $lockedClaim->customer_id, $validated['payment_method'] ?? 'Cash');

                    // Update SaleItem reference
                    SaleItem::where('id', $lockedClaim->sale_item_id)->update([
                        'device_imei_id' => $newDevice->id,
                        'price' => $newDevice->selling_price,
                        'notes' => "Warranty Replacement for IMEI: {$oldDevice->imei}",
                    ]);

                    $brandName = $newDevice->product->brand->name ?? '';
                    $modelName = $newDevice->product->model_name ?? '';
                    $notes .= " [Replacement Issued: Swapped defective IMEI ({$oldDevice->imei}) for {$brandName} {$modelName} (New IMEI: {$newDevice->imei})]" . $priceNotes;
                }
            }

            $updateData = [
                'status' => $validated['status'],
                'resolution_notes' => trim($notes),
            ];

            if (in_array($validated['status'], ['Completed', 'Rejected'])) {
                $updateData['resolved_at'] = now();
            }

            $lockedClaim->update($updateData);

            \App\Models\ActivityLog::log(
                'warranty_claim_updated',
                'Warranties',
                "Updated Warranty Claim #{$lockedClaim->id} to {$validated['status']} (Action: {$deviceAction})",
                ['claim_id' => $lockedClaim->id, 'status' => $validated['status'], 'device_action' => $deviceAction]
            );
        });

        Cache::forget('global_low_stock_count');
        Cache::forget('inventory_stats');

        return redirect()->back()->with('success', 'Claim status updated successfully.');
    }

    private function processWarrantyRefund(SaleItem $saleItem, ?string $paymentMethod, string $description): void
    {
        $sale = $saleItem->sale;
        if (!$sale) return;

        $refundAmount = (float) ($saleItem->price * ($saleItem->quantity ?? 1));
        if ($sale->payment_status === 'Partial') {
            $refundAmount = min($refundAmount, (float) $sale->layawayPayments()->sum('amount_paid'));
        }

        $method = $paymentMethod ?: (($sale->payment_method && $sale->payment_method !== 'Layaway') ? $sale->payment_method : 'Cash');
        $sale->update(['payment_status' => 'Refunded']);

        // Revert inward dealer consignment if linked
        if ($saleItem->device_imei_id) {
            $dealerItem = \App\Models\DealerItem::where('direction', 'inward')
                ->where('device_imei_id', $saleItem->device_imei_id)
                ->where('sale_id', $sale->id)
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
        }

        if ($refundAmount > 0) {
            $account = $method === 'Cash'
                ? \App\Services\TreasuryService::getTillAccount()
                : \App\Models\PaymentAccount::getForMethod($method);

            $activeDrawer = $method === 'Cash'
                ? \App\Models\CashDrawer::where('user_id', auth()->id())->where('status', 'open')->first()
                : null;

            \App\Models\Expense::create([
                'cash_drawer_id' => $activeDrawer?->id,
                'payment_account_id' => $account?->id,
                'user_id' => auth()->id(),
                'category' => 'Refund',
                'amount' => $refundAmount,
                'expense_date' => now(),
                'description' => $description . " (Sale #{$sale->id} via {$method})",
                'recorded_by' => auth()->id(),
            ]);

            \App\Services\TreasuryService::recordOutflow(
                $account,
                $refundAmount,
                'Refund',
                $sale,
                $description . " (Sale #{$sale->id} via {$method})",
                'WAR-REF-' . $sale->id,
                auth()->id()
            );
        }
    }

    private function handlePriceDifference($saleItem, $newDevice, $customer_id, $paymentMethod)
    {
        if (!$saleItem || !$newDevice) return '';

        $oldPrice = $saleItem->price;
        $newPrice = $newDevice->selling_price;
        $difference = $newPrice - $oldPrice;

        if ($difference == 0) return '';

        $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        $notes = "";

        if ($difference > 0) {
            // Customer pays upgrade fee
            $sale = \App\Models\Sale::create([
                'user_id' => auth()->id(),
                'cash_drawer_id' => $activeDrawer ? $activeDrawer->id : null,
                'customer_id' => $customer_id,
                'total_amount' => $difference,
                'discount' => 0,
                'final_amount' => $difference,
                'payment_method' => $paymentMethod ?? 'Cash',
                'payment_status' => 'Paid',
            ]);

            $oldDeviceName = trim(($saleItem->deviceImei->product->brand->name ?? '') . ' ' . ($saleItem->deviceImei->product->model_name ?? ''));
            $newDeviceName = trim(($newDevice->product->brand->name ?? '') . ' ' . ($newDevice->product->model_name ?? ''));

            \App\Models\SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $newDevice->product_id,
                'device_imei_id' => $newDevice->id,
                'quantity' => 1,
                'price' => $difference,
                'warranty_months' => $saleItem->warranty_months,
                'notes' => "Warranty Replacement Upgrade\nNew Phone: {$newDeviceName} (" . number_format($newPrice, 0) . " UGX)\nSwapped Phone: {$oldDeviceName} (-" . number_format($oldPrice, 0) . " UGX)"
            ]);

            \App\Services\TreasuryService::recordInflow(
                $paymentMethod ?? 'Cash',
                floatval($difference),
                'Warranty Upgrade',
                $sale,
                "Warranty Replacement Upgrade for IMEI: " . ($saleItem->deviceImei?->imei ?? ''),
                'WAR-UPG-' . $sale->id,
                auth()->id()
            );

            $notes = " [Upgrade Fee of UGX " . number_format($difference, 2) . " charged and paid.]";
        } elseif ($difference < 0) {
            // Store refunds the customer the difference on the chosen payment channel
            $refundAmount = abs($difference);
            $method = $paymentMethod ?: 'Cash';
            $refundAccount = $method === 'Cash'
                ? \App\Services\TreasuryService::getTillAccount()
                : \App\Models\PaymentAccount::getForMethod($method);

            \App\Models\Expense::create([
                'cash_drawer_id' => ($method === 'Cash' && $activeDrawer) ? $activeDrawer->id : null,
                'payment_account_id' => $refundAccount?->id,
                'user_id' => auth()->id(),
                'recorded_by' => auth()->id(),
                'amount' => $refundAmount,
                'category' => 'Refund',
                'description' => "Warranty Price Difference Refund ({$method}) for IMEI: " . ($saleItem->deviceImei?->imei ?? ''),
                'expense_date' => now(),
            ]);

            \App\Services\TreasuryService::recordOutflow(
                $refundAccount,
                floatval($refundAmount),
                'Refund',
                $saleItem,
                "Warranty Price Difference Refund ({$method}) for IMEI: " . ($saleItem->deviceImei?->imei ?? ''),
                'WAR-REF-' . $saleItem->id,
                auth()->id()
            );
            $notes = " [Partial Refund of UGX " . number_format($refundAmount, 0) . " processed via {$method}.]";
        }

        return $notes;
    }
}
