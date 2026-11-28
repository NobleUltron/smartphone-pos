<?php

namespace App\Http\Controllers;

use App\Models\DeviceImei;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Customer;
use App\Models\CashDrawer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class POSController extends Controller
{
    public function index()
    {
        $customers = Customer::select('id', 'name', 'phone', 'email')
            ->orderBy('name')
            ->limit(300)
            ->get();
        $hasActiveDrawer = CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->exists();
            
        return Inertia::render('POS/Index', [
            'customers' => $customers,
            'hasActiveDrawer' => $hasActiveDrawer
        ]);
    }

    public function validateImei(Request $request)
    {
        $request->validate(['imei' => 'required|string']);
        $code = strtolower(trim($request->imei));
        if ($code === '') {
            return response()->json(['error' => 'Please enter or scan an IMEI or SKU'], 422);
        }

        // Check for serialized device first (PostgreSQL-safe case-insensitive match)
        $device = DeviceImei::with('product.brand')
            ->whereRaw('LOWER(imei) = ?', [$code])
            ->where('status', 'In Stock')
            ->first();

        if ($device) {
            return response()->json(['type' => 'serialized', 'item' => $device]);
        }

        // Check for bulk product SKU
        $product = \App\Models\Product::with('brand')
            ->whereRaw('LOWER(sku) = ?', [$code])
            ->where('type', 'bulk')
            ->where('quantity', '>', 0)
            ->first();

        if ($product) {
            return response()->json(['type' => 'bulk', 'item' => $product]);
        }

        return response()->json(['error' => 'Item not found or out of stock'], 404);
    }

    public function inventorySearch(Request $request)
    {
        $query = $request->input('q');

        // Fetch Bulk items in stock
        $bulkProducts = \App\Models\Product::with('brand', 'category')
            ->where('type', 'bulk')
            ->where('quantity', '>', 0);
            
        // Fetch Serialized items in stock
        $serializedProducts = \App\Models\Product::with(['brand', 'category', 'deviceImeis' => function($q) {
                $q->where('status', 'In Stock');
            }])
            ->where('type', 'serialized')
            ->whereHas('deviceImeis', function($q) {
                $q->where('status', 'In Stock');
            });

        if ($query) {
            $term = '%' . strtolower($query) . '%';
            $bulkProducts->where(function($q) use ($term) {
                $q->whereRaw('LOWER(model_name) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(sku) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(storage_capacity) LIKE ?', [$term])
                  ->orWhereHas('brand', function($q2) use ($term) {
                      $q2->whereRaw('LOWER(name) LIKE ?', [$term]);
                  });
            });

            $serializedProducts->where(function($q) use ($term) {
                $q->whereRaw('LOWER(model_name) LIKE ?', [$term])
                  ->orWhereHas('brand', function($q2) use ($term) {
                      $q2->whereRaw('LOWER(name) LIKE ?', [$term]);
                  })
                  ->orWhereHas('deviceImeis', function($dQuery) use ($term) {
                      $dQuery->where('status', 'In Stock')
                             ->where(function($dq) use ($term) {
                                 $dq->whereRaw('LOWER(storage_capacity) LIKE ?', [$term])
                                    ->orWhereRaw('LOWER(imei) LIKE ?', [$term])
                                    ->orWhereRaw('LOWER(color) LIKE ?', [$term]);
                             });
                  });
            });
        }

        $results = collect([
            ...$bulkProducts->limit(30)->get(),
            ...$serializedProducts->limit(30)->get()
        ]);

        return response()->json($results);
    }

    public function checkout(Request $request)
    {
        $request->validate([
            'customer_name' => 'nullable|string',
            'customer_phone' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.type' => 'required|in:serialized,bulk',
            'items.*.id' => 'required',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.quantity' => 'nullable|integer|min:1',
            'payment_method' => 'required|in:Cash,Bank Transfer,MTN MoMo,Airtel Money,Layaway',
            'deposit_payment_method' => 'nullable|in:Cash,Bank Transfer,MTN MoMo,Airtel Money',
            'amount_paid' => 'nullable|numeric|min:0',
            'tendered_amount' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'customer_id' => 'nullable|exists:customers,id',
            'trade_in.value' => 'nullable|numeric|min:0',
            'trade_in.selling_price' => 'nullable|numeric|min:0',
        ]);

        $userRole = auth()->user()->role ?? 'cashier';
        if ($userRole === 'cashier' && floatval($request->discount ?? 0) > 0 && !\App\Models\Setting::get('allow_cashier_discounts', true)) {
            return response()->json(['message' => 'Cashiers are not authorized to grant custom discounts.'], 422);
        }
        $priceOverwriteLocked = $userRole === 'cashier' && !\App\Models\Setting::get('allow_cashier_price_overwrites', true);

        DB::beginTransaction();

        try {
            $activeDrawer = CashDrawer::where('user_id', auth()->id())
                ->where('status', 'open')
                ->first();

            if (!$activeDrawer) {
                DB::rollBack();
                return response()->json(['message' => 'You must open a shift (Cash Drawer) before making a sale.'], 403);
            }

            // Lock & validate serialized devices (prevent double-selling & enforce price lock)
            $serializedItems = collect($request->items)->filter(fn($i) => $i['type'] === 'serialized');
            $seenDeviceIds = [];
            foreach ($serializedItems as $item) {
                $deviceId = (int) $item['id'];
                if (in_array($deviceId, $seenDeviceIds, true)) {
                    DB::rollBack();
                    return response()->json(['message' => 'Duplicate serialized device detected in cart.'], 422);
                }
                $seenDeviceIds[] = $deviceId;

                $device = DeviceImei::with('product.brand')->where('id', $deviceId)->lockForUpdate()->first();
                if (!$device) {
                    DB::rollBack();
                    return response()->json(['message' => 'One of the serialized devices in your cart was not found.'], 404);
                }
                if ($device->status !== 'In Stock') {
                    DB::rollBack();
                    return response()->json(['message' => "Device {$device->imei} is no longer in stock (Status: {$device->status})."], 422);
                }
                if ($priceOverwriteLocked && abs(floatval($item['price']) - floatval($device->selling_price)) > 0.01) {
                    DB::rollBack();
                    return response()->json(['message' => 'Cashiers are not authorized to overwrite item prices.'], 422);
                }
            }

            // Lock & validate bulk item stock (aggregate requested qty per product_id)
            $bulkItems = collect($request->items)->filter(fn($i) => $i['type'] === 'bulk');
            $bulkTotals = [];
            foreach ($bulkItems as $item) {
                $pid = (int) $item['id'];
                $bulkTotals[$pid] = ($bulkTotals[$pid] ?? 0) + max(1, (int) ($item['quantity'] ?? 1));
            }
            $lockedBulkProducts = [];
            foreach ($bulkTotals as $pid => $totalQty) {
                $product = \App\Models\Product::with('brand')->where('id', $pid)->where('type', 'bulk')->lockForUpdate()->first();
                if (!$product) {
                    DB::rollBack();
                    return response()->json(['message' => 'Product not found.'], 404);
                }
                if ($product->quantity < $totalQty) {
                    DB::rollBack();
                    return response()->json(['message' => "Insufficient stock for {$product->brand?->name} {$product->model_name}. Only {$product->quantity} left in stock."], 422);
                }
                $lockedBulkProducts[$pid] = $product;
            }
            if ($priceOverwriteLocked) {
                foreach ($bulkItems as $item) {
                    $product = $lockedBulkProducts[(int) $item['id']] ?? null;
                    if ($product && abs(floatval($item['price']) - floatval($product->selling_price)) > 0.01) {
                        DB::rollBack();
                        return response()->json(['message' => 'Cashiers are not authorized to overwrite item prices.'], 422);
                    }
                }
            }

            $customer_id = $request->customer_id;
            
            if (!$customer_id && ($request->customer_name || $request->customer_phone)) {
                $phone = $request->customer_phone ?: ('WALKIN-' . time() . '-' . rand(100, 999));
                $name = $request->customer_name ?: 'Valued Customer';
                $customer = Customer::firstOrCreate(
                    ['phone' => $phone],
                    ['name' => $name]
                );
                $customer_id = $customer->id;
            }

            $total = array_reduce($request->items, fn($carry, $item) => $carry + (floatval($item['price']) * max(1, (int) ($item['quantity'] ?? 1))), 0);
            $discount = floatval($request->discount ?? 0);
            $tradeInValue = $request->trade_in ? floatval($request->trade_in['value'] ?? 0) : 0;
            $tradeInDeviceStr = $request->trade_in ? trim(($request->trade_in['brand'] ?? '') . ' ' . ($request->trade_in['model_name'] ?? '')) : null;
            
            $final = $total - $discount - $tradeInValue;
            
            if ($final < 0) {
                DB::rollBack();
                return response()->json(['message' => 'Final amount cannot be negative. Please adjust the discount or trade-in value.'], 422);
            }

            if ($request->payment_method === 'Layaway') {
                if ($final <= 0) {
                    DB::rollBack();
                    return response()->json(['message' => 'Cannot use Layaway for a zero-balance transaction. Please select Cash or another payment method.'], 422);
                }
                if (floatval($request->amount_paid ?? 0) >= $final) {
                    DB::rollBack();
                    return response()->json(['message' => 'Layaway deposit cannot be equal to or greater than the final amount. Please use a regular payment method.'], 422);
                }
            }

            $sale = Sale::create([
                'user_id' => auth()->id() ?? 1, // fallback for testing
                'cash_drawer_id' => $activeDrawer->id,
                'customer_id' => $customer_id,
                'total_amount' => $total,
                'discount' => $discount,
                'trade_in_value' => $tradeInValue,
                'trade_in_device' => $tradeInDeviceStr,
                'final_amount' => $final,
                'payment_method' => $request->payment_method,
                'payment_status' => $request->payment_method === 'Layaway' ? 'Partial' : 'Paid',
                'tendered_amount' => $request->tendered_amount,
            ]);

            $layawayPayment = null;
            $depositMethod = $request->input('deposit_payment_method') ?: 'Cash';
            if ($request->payment_method === 'Layaway' && $request->amount_paid > 0) {
                $layawayPayment = \App\Models\LayawayPayment::create([
                    'sale_id' => $sale->id,
                    'cash_drawer_id' => $depositMethod === 'Cash' ? $activeDrawer->id : null,
                    'amount_paid' => $request->amount_paid,
                    'payment_method' => $depositMethod,
                    'payment_date' => now()
                ]);
            }

            // Handle Trade-in Inventory Intake
            if ($request->trade_in && $tradeInValue > 0) {
                $tradeIn = $request->trade_in;
                $brand = \App\Models\Brand::firstOrCreate(['name' => $tradeIn['brand']]);
                $category = \App\Models\Category::firstOrCreate(['name' => 'Smartphones']);
                
                $resalePrice = !empty($tradeIn['selling_price']) && floatval($tradeIn['selling_price']) > 0
                    ? floatval($tradeIn['selling_price']) 
                    : ($tradeInValue * 1.2);

                $product = \App\Models\Product::firstOrCreate(
                    [
                        'brand_id' => $brand->id,
                        'model_name' => $tradeIn['model_name'],
                        'type' => 'serialized' // Guarantee we don't accidentally attach IMEI to a bulk accessory
                    ],
                    [
                        'category_id' => $category->id,
                        'cost_price' => $tradeInValue,
                        'selling_price' => $resalePrice,
                        'quantity' => 0, // Serialized relies on DeviceImei count
                    ]
                );

                $imeiStr = !empty($tradeIn['imei']) ? trim($tradeIn['imei']) : ('TRADEIN-' . strtoupper(uniqid()));
                if (\App\Models\DeviceImei::where('imei', $imeiStr)->exists()) {
                    $imeiStr .= '-TR' . rand(100, 999);
                }

                $inspection = null;
                if (!empty($tradeIn['inspection']) && is_array($tradeIn['inspection'])) {
                    $ins = $tradeIn['inspection'];
                    $inspection = [
                        'battery_health' => isset($ins['battery_health']) && $ins['battery_health'] !== '' ? (int) $ins['battery_health'] : null,
                        'face_id_ok' => (bool) ($ins['face_id_ok'] ?? true),
                        'true_tone_ok' => (bool) ($ins['true_tone_ok'] ?? true),
                        'icloud_removed' => (bool) ($ins['icloud_removed'] ?? false),
                        'cameras_audio_ok' => (bool) ($ins['cameras_audio_ok'] ?? true),
                        'screen_grade' => $ins['screen_grade'] ?? 'Flawless',
                        'body_grade' => $ins['body_grade'] ?? 'Clean',
                        'seller_id_type' => $ins['seller_id_type'] ?? 'National ID (NIN)',
                        'seller_id_number' => !empty($ins['seller_id_number']) ? trim($ins['seller_id_number']) : null,
                        'seller_name' => !empty($ins['seller_name']) ? trim($ins['seller_name']) : null,
                        'seller_phone' => !empty($ins['seller_phone']) ? trim($ins['seller_phone']) : null,
                        'notes' => !empty($ins['notes']) ? trim($ins['notes']) : null,
                        'inspected_by' => auth()->user()?->name,
                        'inspected_at' => now()->toIso8601String(),
                    ];
                }

                $tradeInDevice = \App\Models\DeviceImei::create([
                    'product_id' => $product->id,
                    'imei' => $imeiStr,
                    'condition' => !empty($tradeIn['condition']) ? $tradeIn['condition'] : 'Used Grade A',
                    'status' => 'In Stock',
                    'cost_price' => $tradeInValue,
                    'initial_cost_price' => $tradeInValue,
                    'selling_price' => $resalePrice,
                    'storage_capacity' => !empty($tradeIn['storage_capacity']) ? $tradeIn['storage_capacity'] : 'Unknown',
                    'color' => !empty($tradeIn['color']) ? $tradeIn['color'] : 'Unknown',
                    'trade_in_inspection' => $inspection,
                ]);
                $sale->update(['trade_in_imei_id' => $tradeInDevice->id]);

                \App\Models\ActivityLog::log(
                    'trade_in_intake',
                    'POS',
                    "Trade-in received into In Stock: {$brand->name} {$tradeIn['model_name']} (IMEI: {$imeiStr}) at UGX " . number_format($tradeInValue)
                        . ($inspection && $inspection['seller_id_number'] ? " • ID ({$inspection['seller_id_type']}): {$inspection['seller_id_number']}" : ''),
                    [
                        'sale_id' => $sale->id,
                        'device_imei_id' => $tradeInDevice->id,
                        'imei' => $imeiStr,
                        'cost_price' => $tradeInValue,
                        'selling_price' => $resalePrice,
                        'inspection' => $inspection,
                    ]
                );
            }

            foreach ($request->items as $item) {
                if ($item['type'] === 'serialized') {
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'device_imei_id' => $item['id'],
                        'price' => $item['price'],
                        'warranty_months' => 3
                    ]);
                    DeviceImei::where('id', $item['id'])->update(['status' => 'Sold']);

                    // Automatically update inward dealer consignment item status & balance
                    $inwardDealerItem = \App\Models\DealerItem::where('device_imei_id', $item['id'])
                        ->where('direction', 'inward')
                        ->where('status', 'Pending')
                        ->first();

                    if ($inwardDealerItem) {
                        $inwardDealerItem->update([
                            'status' => 'Sold',
                            'quantity_sold' => 1,
                            'sold_at' => now(),
                            'sale_id' => $sale->id
                        ]);
                    }
                } else {
                    SaleItem::create([
                        'sale_id' => $sale->id,
                        'product_id' => $item['id'],
                        'quantity' => $item['quantity'] ?? 1,
                        'price' => $item['price'],
                        'warranty_months' => 0
                    ]);
                    \App\Models\Product::where('id', $item['id'])->decrement('quantity', $item['quantity'] ?? 1);

                    // Automatically update bulk inward dealer consignment item status & balance (FIFO capped by batch availability)
                    $qtyToAllocate = (int) ($item['quantity'] ?? 1);
                    $inwardDealerItems = \App\Models\DealerItem::where('product_id', $item['id'])
                        ->where('direction', 'inward')
                        ->where('status', 'Pending')
                        ->orderBy('id')
                        ->get();

                    foreach ($inwardDealerItems as $inwardDealerItem) {
                        if ($qtyToAllocate <= 0) break;
                        $availableInBatch = max(0, (int) $inwardDealerItem->quantity - (int) $inwardDealerItem->quantity_sold - (int) $inwardDealerItem->quantity_returned);
                        if ($availableInBatch <= 0) continue;

                        $take = min($qtyToAllocate, $availableInBatch);
                        $inwardDealerItem->quantity_sold += $take;
                        if (($inwardDealerItem->quantity_sold + (int) $inwardDealerItem->quantity_returned) >= $inwardDealerItem->quantity) {
                            $inwardDealerItem->status = 'Sold';
                            $inwardDealerItem->sold_at = now();
                        }
                        $inwardDealerItem->sale_id = $sale->id;
                        $inwardDealerItem->save();
                        $qtyToAllocate -= $take;
                    }
                }
            }

            // Record Treasury Account Inflows
            if ($sale->payment_status === 'Paid' && $final > 0) {
                \App\Services\TreasuryService::recordInflow(
                    $sale->payment_method,
                    $final,
                    'Sale',
                    $sale,
                    "POS Sale #{$sale->id}",
                    null,
                    auth()->id()
                );
            } elseif ($request->payment_method === 'Layaway' && $layawayPayment) {
                \App\Services\TreasuryService::recordInflow(
                    $depositMethod,
                    floatval($request->amount_paid),
                    'Layaway Deposit',
                    $layawayPayment,
                    "Layaway Deposit for Sale #{$sale->id}",
                    null,
                    auth()->id()
                );
            }

            // Record audit log
            \App\Models\ActivityLog::log(
                $discount > 0 ? 'discount_applied' : 'pos_checkout',
                'POS',
                "Completed POS Checkout #{$sale->id} for UGX " . number_format($final) . ($discount > 0 ? " (Discount: UGX " . number_format($discount) . ")" : ""),
                [
                    'sale_id' => $sale->id,
                    'total_amount' => $total,
                    'discount' => $discount,
                    'trade_in_value' => $tradeInValue,
                    'final_amount' => $final,
                    'payment_method' => $request->payment_method,
                    'items_count' => count($request->items)
                ]
            );

            DB::commit();
            \Illuminate\Support\Facades\Cache::forget('global_low_stock_count');
            \Illuminate\Support\Facades\Cache::forget('inventory_stats');
            return response()->json(['success' => true, 'sale_id' => $sale->id]);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Checkout Error: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
            return response()->json(['error' => 'Checkout failed'], 500);
        }
    }

    public function receipt(Sale $sale, Request $request)
    {
        $sale->load(['saleItems.deviceImei.product.brand', 'saleItems.product.brand', 'customer', 'user', 'layawayPayments', 'repair', 'dealerItem.dealer']);

        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => \App\Models\Setting::getLogoUrl(),
            'shop_address' => \App\Models\Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => \App\Models\Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => \App\Models\Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => \App\Models\Setting::getTermsConditions(),
        ];

        // JSON response for in-page receipt preview (e.g. from Dealer Show page)
        if ($request->boolean('json') || $request->wantsJson()) {
            return response()->json(['sale' => $sale, 'settings' => $settings]);
        }

        return Inertia::render('POS/Receipt', [
            'sale' => $sale,
            'settings' => $settings
        ]);
    }
}
