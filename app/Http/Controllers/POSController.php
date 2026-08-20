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
        $customers = Customer::orderBy('name')->get();
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
        
        // Check for serialized device first
        $device = DeviceImei::with('product.brand')->where('imei', $request->imei)->where('status', 'In Stock')->first();

        if ($device) {
            return response()->json(['type' => 'serialized', 'item' => $device]);
        }

        // Check for bulk product SKU
        $product = \App\Models\Product::with('brand')->where('sku', $request->imei)->where('type', 'bulk')->where('quantity', '>', 0)->first();

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
            $bulkProducts->where(function($q) use ($query) {
                $q->where('model_name', 'like', "%{$query}%")
                  ->orWhere('sku', 'like', "%{$query}%")
                  ->orWhereHas('brand', function($q2) use ($query) {
                      $q2->where('name', 'like', "%{$query}%");
                  });
            });

            $serializedProducts->where(function($q) use ($query) {
                $q->where('model_name', 'like', "%{$query}%")
                  ->orWhereHas('brand', function($q2) use ($query) {
                      $q2->where('name', 'like', "%{$query}%");
                  });
            });
        }

        $results = collect([
            ...$bulkProducts->get(),
            ...$serializedProducts->get()
        ]);

        return response()->json($results);
    }

    public function checkout(Request $request)
    {
        $request->validate([
            'customer_name' => 'nullable|string',
            'customer_phone' => 'nullable|string',
            'items' => 'required|array',
            'items.*.type' => 'required|in:serialized,bulk',
            'items.*.id' => 'required',
            'items.*.price' => 'required|numeric',
            'payment_method' => 'required|in:Cash,Bank Transfer,MTN MoMo,Airtel Money,Layaway',
            'amount_paid' => 'nullable|numeric|min:0',
            'tendered_amount' => 'nullable|numeric|min:0',
            'discount' => 'numeric|min:0',
            'customer_id' => 'nullable|exists:customers,id'
        ]);

        DB::beginTransaction();

        try {
            $activeDrawer = CashDrawer::where('user_id', auth()->id())
                ->where('status', 'open')
                ->first();

            if (!$activeDrawer) {
                return response()->json(['message' => 'You must open a shift (Cash Drawer) before making a sale.'], 403);
            }

            // Validate bulk item stock before proceeding
            $bulkItems = collect($request->items)->filter(fn($i) => $i['type'] === 'bulk');
            foreach ($bulkItems as $item) {
                $qty = $item['quantity'] ?? 1;
                $product = \App\Models\Product::find($item['id']);
                if (!$product) {
                    return response()->json(['message' => 'Product not found.'], 404);
                }
                if ($product->quantity < $qty) {
                    return response()->json(['message' => "Insufficient stock for {$product->brand?->name} {$product->model_name}. Only {$product->quantity} left in stock."], 422);
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

            $total = array_reduce($request->items, fn($carry, $item) => $carry + ($item['price'] * ($item['quantity'] ?? 1)), 0);
            $discount = $request->discount ?? 0;
            $tradeInValue = $request->trade_in ? ($request->trade_in['value'] ?? 0) : 0;
            $tradeInDeviceStr = $request->trade_in ? ($request->trade_in['brand'] . ' ' . $request->trade_in['model_name']) : null;
            
            $final = $total - $discount - $tradeInValue;
            
            if ($final < 0) {
                return response()->json(['message' => 'Final amount cannot be negative. Please adjust the discount or trade-in value.'], 422);
            }

            if ($request->payment_method === 'Layaway') {
                if ($request->amount_paid >= $final && $final > 0) {
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

            if ($request->payment_method === 'Layaway' && $request->amount_paid > 0) {
                \App\Models\LayawayPayment::create([
                    'sale_id' => $sale->id,
                    'cash_drawer_id' => $activeDrawer->id,
                    'amount_paid' => $request->amount_paid,
                    'payment_method' => 'Cash', // Defaulting initial deposit to Cash, or we can make it dynamic later
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

                \App\Models\DeviceImei::create([
                    'product_id' => $product->id,
                    'imei' => $imeiStr,
                    'condition' => !empty($tradeIn['condition']) ? $tradeIn['condition'] : 'Used Grade A',
                    'status' => 'In Stock',
                    'cost_price' => $tradeInValue,
                    'selling_price' => $resalePrice,
                    'storage_capacity' => !empty($tradeIn['storage_capacity']) ? $tradeIn['storage_capacity'] : 'Unknown',
                    'color' => !empty($tradeIn['color']) ? $tradeIn['color'] : 'Unknown',
                ]);
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

                    // Automatically update bulk inward dealer consignment item status & balance
                    $inwardDealerItem = \App\Models\DealerItem::where('product_id', $item['id'])
                        ->where('direction', 'inward')
                        ->where('status', 'Pending')
                        ->first();

                    if ($inwardDealerItem) {
                        $qtySold = $item['quantity'] ?? 1;
                        $inwardDealerItem->quantity_sold += $qtySold;
                        if ($inwardDealerItem->quantity_sold >= $inwardDealerItem->quantity) {
                            $inwardDealerItem->status = 'Sold';
                            $inwardDealerItem->sold_at = now();
                        }
                        $inwardDealerItem->sale_id = $sale->id;
                        $inwardDealerItem->save();
                    }
                }
            }

            $userRole = auth()->user()->role ?? 'cashier';
            if ($userRole === 'cashier') {
                if ($discount > 0 && !\App\Models\Setting::get('allow_cashier_discounts', true)) {
                    return response()->json(['message' => 'Cashiers are not authorized to grant custom discounts.'], 422);
                }
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
            'terms_conditions' => \App\Models\Setting::get('terms_conditions', [
                'Goods sold in good condition are not returnable.',
                'Retain this receipt for any warranty claims.',
                'Warranty does not cover physical or liquid damage.',
                'Software issues are not covered under warranty.'
            ]),
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
