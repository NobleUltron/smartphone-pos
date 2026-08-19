<?php

namespace App\Http\Controllers;

use App\Models\Dealer;
use App\Models\DealerItem;
use App\Models\DeviceImei;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\CashDrawer;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class DealerController extends Controller
{
    public function dashboard()
    {
        $metrics = [
            'items_out' => DealerItem::where('status', 'Pending')->count(),
            'pending_value' => DealerItem::where('status', 'Pending')->sum('dealer_price'),
            'sold_value' => DealerItem::where('status', 'Sold')->sum('dealer_price'),
            'items_sold' => DealerItem::where('status', 'Sold')->count(),
            'returned_value' => DealerItem::where('status', 'Returned')->sum('dealer_price'),
            'items_returned' => DealerItem::where('status', 'Returned')->count(),
            'overdue_items' => DealerItem::where('status', 'Pending')
                                         ->whereNotNull('expected_return_date')
                                         ->where('expected_return_date', '<', Carbon::today())
                                         ->count(),
        ];

        $pendingItems = DealerItem::with(['dealer', 'deviceImei.product.brand', 'product.brand'])
            ->where('status', 'Pending')
            ->orderBy('issued_at', 'desc')
            ->get();
            
        $recentSold = DealerItem::with(['dealer', 'deviceImei.product.brand', 'product.brand'])
            ->where('status', 'Sold')
            ->orderBy('sold_at', 'desc')
            ->take(5)
            ->get();
            
        $recentReturned = DealerItem::with(['dealer', 'deviceImei.product.brand', 'product.brand'])
            ->where('status', 'Returned')
            ->orderBy('returned_at', 'desc')
            ->take(5)
            ->get();

        // Top Dealers Leaderboard by Sales Value
        $topDealers = Dealer::withSum(['dealerItems as sales_value' => function ($q) {
            $q->where('status', 'Sold');
        }], 'dealer_price')
        ->withCount(['dealerItems as items_out_count' => function ($q) {
            $q->where('status', 'Pending');
        }])
        ->orderByDesc('sales_value')
        ->take(5)
        ->get();

        // 6-Month Network Sales & Issued Trend
        $networkTrends = collect(range(5, 0))->map(function ($months) {
            $date = Carbon::today()->subMonths($months);
            $startOfMonth = $date->copy()->startOfMonth();
            $endOfMonth = $date->copy()->endOfMonth();

            $issuedValue = DealerItem::whereBetween('issued_at', [$startOfMonth, $endOfMonth])
                ->sum('dealer_price');

            $soldValue = DealerItem::where('status', 'Sold')
                ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                    $q->whereBetween('sold_at', [$startOfMonth, $endOfMonth])
                      ->orWhere(function ($q2) use ($startOfMonth, $endOfMonth) {
                          $q2->whereNull('sold_at')
                             ->whereBetween('updated_at', [$startOfMonth, $endOfMonth]);
                      });
                })->sum('dealer_price');

            return [
                'month' => $date->format('M Y'),
                'issued_value' => (float) $issuedValue,
                'sold_value' => (float) $soldValue,
            ];
        });

        $dealers = Dealer::orderBy('name')->get();
        $categories = \App\Models\Category::all();
        $brands = \App\Models\Brand::all();

        return Inertia::render('Dealers/Dashboard', [
            'metrics' => $metrics,
            'pendingItems' => $pendingItems,
            'recentSold' => $recentSold,
            'recentReturned' => $recentReturned,
            'topDealers' => $topDealers,
            'networkTrends' => $networkTrends,
            'dealers' => $dealers,
            'categories' => $categories,
            'brands' => $brands,
        ]);
    }

    public function index()
    {
        $dealers = Dealer::withCount(['dealerItems as pending_items_count' => function ($query) {
            $query->where('status', 'Pending');
        }])->withSum(['dealerItems as pending_value' => function ($query) {
            $query->where('status', 'Pending');
        }], 'dealer_price')->get();

        return Inertia::render('Dealers/Index', [
            'dealers' => $dealers
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        Dealer::create($validated);

        return redirect()->back()->with('success', 'Dealer added successfully.');
    }

    public function update(Request $request, Dealer $dealer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $dealer->update($validated);

        return redirect()->back()->with('success', 'Dealer updated successfully.');
    }

    public function destroy(Dealer $dealer)
    {
        if ($dealer->dealerItems()->count() > 0) {
            return redirect()->back()->with('error', 'Cannot delete a dealer who has items history. Please use the edit feature instead.');
        }

        $dealer->delete();

        return redirect()->back()->with('success', 'Dealer deleted successfully.');
    }

    public function show(Dealer $dealer)
    {
        $dealer->load(['dealerItems.deviceImei.product.brand', 'dealerItems.product.brand', 'dealerItems.user', 'dealerItems.sale']);
        
        $outwardItems = $dealer->dealerItems()->where('direction', 'outward');
        $inwardItems = $dealer->dealerItems()->where('direction', 'inward');

        $dealerOwesUs = (float)$outwardItems->clone()->where('status', 'Pending')->sum(DB::raw('dealer_price * (quantity - quantity_sold - quantity_returned)'));
        $weOweDealer = (float)$inwardItems->clone()->where('status', 'Sold')->sum(DB::raw('wholesale_cost * quantity_sold'));

        $metrics = [
            // Outward Consignment (Issued to dealer)
            'items_taken' => (int)$outwardItems->clone()->sum('quantity'),
            'items_sold' => (int)$outwardItems->clone()->sum('quantity_sold'),
            'items_returned' => (int)$outwardItems->clone()->sum('quantity_returned'),
            'still_out' => (int)$outwardItems->clone()->where('status', 'Pending')->sum(DB::raw('quantity - quantity_sold - quantity_returned')),
            'sales_value' => (float)$outwardItems->clone()->sum(DB::raw('dealer_price * quantity_sold')),
            'dealer_owes_us' => $dealerOwesUs,

            // Inward Consignment (Sourced from dealer)
            'inward_total' => (int)$inwardItems->clone()->sum('quantity'),
            'inward_sold' => (int)$inwardItems->clone()->where('status', 'Sold')->sum('quantity_sold'),
            'inward_pending' => (int)$inwardItems->clone()->where('status', 'Pending')->sum(DB::raw('quantity - quantity_sold - quantity_returned')),
            'we_owe_dealer' => $weOweDealer,

            'net_balance' => $dealerOwesUs - $weOweDealer,
        ];

        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => \App\Models\Setting::get('store_logo', null),
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

        // 6-Month Trend for this Dealer
        $monthlyTrends = collect(range(5, 0))->map(function ($months) use ($dealer) {
            $date = Carbon::today()->subMonths($months);
            $startOfMonth = $date->copy()->startOfMonth();
            $endOfMonth = $date->copy()->endOfMonth();

            $issuedValue = $dealer->dealerItems()
                ->whereBetween('issued_at', [$startOfMonth, $endOfMonth])
                ->sum('dealer_price');

            $soldValue = $dealer->dealerItems()
                ->where('status', 'Sold')
                ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                    $q->whereBetween('sold_at', [$startOfMonth, $endOfMonth])
                      ->orWhere(function ($q2) use ($startOfMonth, $endOfMonth) {
                          $q2->whereNull('sold_at')
                             ->whereBetween('updated_at', [$startOfMonth, $endOfMonth]);
                      });
                })->sum('dealer_price');

            $returnedValue = $dealer->dealerItems()
                ->where('status', 'Returned')
                ->where(function ($q) use ($startOfMonth, $endOfMonth) {
                    $q->whereBetween('returned_at', [$startOfMonth, $endOfMonth])
                      ->orWhere(function ($q2) use ($startOfMonth, $endOfMonth) {
                          $q2->whereNull('returned_at')
                             ->whereBetween('updated_at', [$startOfMonth, $endOfMonth]);
                      });
                })->sum('dealer_price');

            return [
                'month' => $date->format('M Y'),
                'issued_value' => (float) $issuedValue,
                'sold_value' => (float) $soldValue,
                'returned_value' => (float) $returnedValue,
            ];
        });

        // Efficiency metrics
        $totalTaken = $metrics['items_taken'];
        $totalSold = $metrics['items_sold'];
        $totalReturned = $metrics['items_returned'];

        $sellThroughRate = $totalTaken > 0 ? round(($totalSold / $totalTaken) * 100, 1) : 0;
        $returnRate = $totalTaken > 0 ? round(($totalReturned / $totalTaken) * 100, 1) : 0;

        // Average settlement speed in days
        $settledItems = $dealer->dealerItems()
            ->whereIn('status', ['Sold', 'Returned'])
            ->get();

        $totalDays = 0;
        $settledCount = 0;
        foreach ($settledItems as $item) {
            $endDate = $item->sold_at ?? $item->returned_at ?? $item->updated_at;
            if ($item->issued_at && $endDate) {
                $days = max(1, Carbon::parse($item->issued_at)->diffInDays(Carbon::parse($endDate)));
                $totalDays += $days;
                $settledCount++;
            }
        }
        $avgDaysToSettle = $settledCount > 0 ? round($totalDays / $settledCount, 1) : 0;

        // On-time rate (% not overdue)
        $overdueCount = $dealer->dealerItems()
            ->where('status', 'Pending')
            ->whereNotNull('expected_return_date')
            ->where('expected_return_date', '<', Carbon::today())
            ->count();
        $totalItems = $dealer->dealerItems()->count();
        $onTimeRate = $totalItems > 0 ? round((($totalItems - $overdueCount) / $totalItems) * 100, 1) : 100;

        $analytics = [
            'sell_through_rate' => $sellThroughRate,
            'return_rate' => $returnRate,
            'avg_days_to_settle' => $avgDaysToSettle,
            'on_time_rate' => $onTimeRate,
            'overdue_count' => $overdueCount,
        ];

        // Top moving product models for this dealer
        $topProducts = $dealer->dealerItems
            ->groupBy(function ($item) {
                if ($item->type === 'serialized' && $item->deviceImei && $item->deviceImei->product) {
                    $brand = $item->deviceImei->product->brand->name ?? '';
                    return trim($brand . ' ' . $item->deviceImei->product->model_name);
                } elseif ($item->product) {
                    $brand = $item->product->brand->name ?? '';
                    return trim($brand . ' ' . $item->product->model_name);
                }
                return 'Other Device / Accessory';
            })
            ->map(function ($items, $modelName) {
                return [
                    'model' => $modelName,
                    'issued' => $items->sum('quantity'),
                    'sold' => $items->sum('quantity_sold'),
                    'returned' => $items->sum('quantity_returned'),
                    'revenue' => $items->where('status', 'Sold')->sum('dealer_price'),
                ];
            })
            ->sortByDesc('sold')
            ->values()
            ->take(5);

        $categories = \App\Models\Category::all();
        $brands = \App\Models\Brand::all();
        $products = \App\Models\Product::with('brand')->get();

        return Inertia::render('Dealers/Show', [
            'dealer' => $dealer,
            'metrics' => $metrics,
            'settings' => $settings,
            'monthlyTrends' => $monthlyTrends,
            'analytics' => $analytics,
            'topProducts' => $topProducts,
            'categories' => $categories,
            'brands' => $brands,
            'products' => $products,
        ]);
    }

    public function issue()
    {
        // For the issue item wizard
        $dealers = Dealer::all();
        return Inertia::render('Dealers/Issue', [
            'dealers' => $dealers
        ]);
    }

    public function searchDevice(Request $request)
    {
        $query = $request->input('query');
        
        if (empty($query)) {
            return response()->json([]);
        }

        $serialized = DeviceImei::with(['product.brand'])
            ->where('status', 'In Stock')
            ->where(function($q) use ($query) {
                $q->where('imei', 'LIKE', "%{$query}%")
                  ->orWhereHas('product', function($q2) use ($query) {
                      $q2->where('model_name', 'LIKE', "%{$query}%");
                  });
            })
            ->take(10)
            ->get()
            ->map(function($item) {
                $item->type = 'serialized';
                return $item;
            });

        $bulk = \App\Models\Product::with(['category', 'brand'])
            ->where('type', 'bulk')
            ->where('quantity', '>', 0)
            ->where(function($q) use ($query) {
                $q->where('model_name', 'LIKE', "%{$query}%")
                  ->orWhere('sku', 'LIKE', "%{$query}%");
            })
            ->take(10)
            ->get()
            ->map(function($item) {
                $item->type = 'bulk';
                return $item;
            });
            
        return response()->json(collect([...$serialized, ...$bulk])->take(15));
    }

    public function storeIssue(Request $request)
    {
        $validated = $request->validate([
            'dealer_id' => 'required|exists:dealers,id',
            'type' => 'required|in:serialized,bulk',
            'device_imei_id' => 'nullable|exists:device_imeis,id',
            'product_id' => 'nullable|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'dealer_price' => 'required|numeric|min:0',
            'expected_return_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        try {
            DB::beginTransaction();

            $retailPrice = 0;

            if ($validated['type'] === 'serialized') {
                $device = DeviceImei::findOrFail($validated['device_imei_id']);
                if ($device->status !== 'In Stock') {
                    return redirect()->back()->with('error', 'Device is not currently in stock.');
                }
                $device->update(['status' => 'With Dealer']);
                $retailPrice = $device->selling_price ?? $device->cost_price;
                $validated['quantity'] = 1;
            } else {
                $product = \App\Models\Product::findOrFail($validated['product_id']);
                if ($product->quantity < $validated['quantity']) {
                    return redirect()->back()->with('error', "Only {$product->quantity} left in stock.");
                }
                $product->decrement('quantity', $validated['quantity']);
                $retailPrice = $product->selling_price ?? $product->cost_price;
            }

            DealerItem::create([
                'dealer_id' => $validated['dealer_id'],
                'type' => $validated['type'],
                'device_imei_id' => $validated['type'] === 'serialized' ? $validated['device_imei_id'] : null,
                'product_id' => $validated['type'] === 'bulk' ? $validated['product_id'] : null,
                'quantity' => $validated['quantity'],
                'retail_price' => $retailPrice,
                'dealer_price' => $validated['dealer_price'],
                'user_id' => auth()->id(),
                'issued_at' => now(),
                'expected_return_date' => $validated['expected_return_date'],
                'status' => 'Pending',
                'notes' => $validated['notes']
            ]);

            DB::commit();

            return redirect()->route('dealers.dashboard')->with('success', 'Item(s) issued to dealer successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error issuing item: ' . $e->getMessage());
        }
    }

    public function storeInward(Request $request)
    {
        $validated = $request->validate([
            'dealer_id' => 'required|exists:dealers,id',
            'type' => 'required|in:serialized,bulk',
            'product_id' => 'nullable|exists:products,id',
            'category_id' => 'required_without:product_id|nullable|exists:categories,id',
            'brand_id' => 'required_without:product_id|nullable|exists:brands,id',
            'model_name' => 'required_without:product_id|nullable|string|max:255',
            'imei_number' => 'nullable|string|max:255',
            'wholesale_cost' => 'required|numeric|min:0',
            'retail_price' => 'required|numeric|min:0',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $product = null;
            if (!empty($validated['product_id'])) {
                $product = \App\Models\Product::findOrFail($validated['product_id']);
            } else {
                $product = \App\Models\Product::create([
                    'category_id' => $validated['category_id'],
                    'brand_id' => $validated['brand_id'],
                    'model_name' => $validated['model_name'],
                    'type' => $validated['type'],
                    'cost_price' => $validated['wholesale_cost'],
                    'selling_price' => $validated['retail_price'],
                    'quantity' => 0,
                ]);
            }

            $deviceImei = null;
            if ($validated['type'] === 'serialized') {
                if (empty($validated['imei_number'])) {
                    return redirect()->back()->with('error', 'IMEI/Serial number is required for serialized devices.');
                }

                $existing = DeviceImei::where('imei', $validated['imei_number'])->first();
                if ($existing) {
                    return redirect()->back()->with('error', 'Device IMEI ' . $validated['imei_number'] . ' already exists in system.');
                }

                $deviceImei = DeviceImei::create([
                    'product_id' => $product->id,
                    'imei' => $validated['imei_number'],
                    'cost_price' => $validated['wholesale_cost'],
                    'selling_price' => $validated['retail_price'],
                    'status' => 'In Stock',
                    'condition' => 'Brand New',
                ]);
            } else {
                $product->increment('quantity', $validated['quantity']);
            }

            DealerItem::create([
                'dealer_id' => $validated['dealer_id'],
                'direction' => 'inward',
                'type' => $validated['type'],
                'device_imei_id' => $deviceImei ? $deviceImei->id : null,
                'product_id' => $product->id,
                'quantity' => $validated['type'] === 'serialized' ? 1 : $validated['quantity'],
                'wholesale_cost' => $validated['wholesale_cost'],
                'retail_price' => $validated['retail_price'],
                'dealer_price' => $validated['wholesale_cost'],
                'user_id' => auth()->id(),
                'issued_at' => now(),
                'status' => 'Pending',
                'notes' => $validated['notes'],
            ]);

            DB::commit();
            return redirect()->back()->with('success', 'Device/stock received from dealer and added to active shop inventory.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error receiving item from dealer: ' . $e->getMessage());
        }
    }

    public function markSold(Request $request, DealerItem $item)
    {
        if ($item->status !== 'Pending') {
            return redirect()->back()->with('error', 'Item is not pending.');
        }

        $validated = $request->validate([
            'payment_method' => 'required|string',
            'customer_name' => 'nullable|string',
            'customer_phone' => 'nullable|string',
            'quantity' => 'required|integer|min:1',
        ]);

        $available = $item->quantity - $item->quantity_sold - $item->quantity_returned;
        if ($validated['quantity'] > $available) {
            return redirect()->back()->with('error', "Cannot sell more than available pending quantity ($available).");
        }

        $activeDrawer = CashDrawer::where('user_id', auth()->id())->where('status', 'open')->first();
        if (!$activeDrawer) {
            return redirect()->back()->with('error', 'You must have an open cash drawer to record a sale.');
        }

        try {
            DB::beginTransaction();

            $customer_id = null;
            if (!empty($validated['customer_name']) || !empty($validated['customer_phone'])) {
                $phone = !empty($validated['customer_phone']) ? $validated['customer_phone'] : ('WALKIN-' . time() . '-' . rand(100, 999));
                $name = !empty($validated['customer_name']) ? $validated['customer_name'] : 'Valued Customer';
                $customer = \App\Models\Customer::firstOrCreate(
                    ['phone' => $phone],
                    ['name' => $name]
                );
                $customer_id = $customer->id;
            }

            $totalPrice = $item->dealer_price * $validated['quantity'];

            $sale = Sale::create([
                'user_id' => auth()->id(),
                'customer_id' => $customer_id,
                'total_amount' => $totalPrice,
                'discount' => 0,
                'final_amount' => $totalPrice,
                'tendered_amount' => $totalPrice,
                'payment_method' => $validated['payment_method'],
                'payment_status' => 'Paid',
                'sale_date' => now(),
                'cash_drawer_id' => $activeDrawer->id,
            ]);

            SaleItem::create([
                'sale_id' => $sale->id,
                'device_imei_id' => $item->type === 'serialized' ? $item->device_imei_id : null,
                'product_id' => $item->type === 'bulk' ? $item->product_id : null,
                'quantity' => $item->type === 'serialized' ? 1 : $validated['quantity'],
                'price' => $item->dealer_price,
                'warranty_months' => $item->type === 'serialized' ? 3 : 0,
            ]);

            if ($item->type === 'serialized' && $item->deviceImei) {
                $item->deviceImei->update(['status' => 'Sold']);
            }
            
            $item->quantity_sold += $validated['quantity'];
            
            if ($item->quantity_sold + $item->quantity_returned >= $item->quantity) {
                $item->status = 'Sold';
                $item->sold_at = now();
            }
            $item->sale_id = $sale->id;
            $item->save();

            DB::commit();
            return redirect()->back()->with('success', 'Items marked as sold successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error recording sale: ' . $e->getMessage());
        }
    }

    public function markReturned(Request $request, DealerItem $item)
    {
        if ($item->status !== 'Pending') {
            return redirect()->back()->with('error', 'Item is not pending.');
        }

        $validated = $request->validate([
            'notes' => 'nullable|string',
            'quantity' => 'required|integer|min:1'
        ]);

        $available = $item->quantity - $item->quantity_sold - $item->quantity_returned;
        if ($validated['quantity'] > $available) {
            return redirect()->back()->with('error', "Cannot return more than available pending quantity ($available).");
        }

        try {
            DB::beginTransaction();

            if ($item->direction === 'inward') {
                // Returning back to sourcing dealer: remove from active shop stock
                if ($item->type === 'serialized' && $item->deviceImei) {
                    $item->deviceImei->update(['status' => 'Returned']);
                } elseif ($item->type === 'bulk' && $item->product) {
                    $item->product->decrement('quantity', min($item->product->quantity, $validated['quantity']));
                }
            } else {
                // Restocking outward item back to shop active inventory
                if ($item->type === 'serialized' && $item->deviceImei) {
                    $item->deviceImei->update(['status' => 'In Stock']);
                } elseif ($item->type === 'bulk' && $item->product) {
                    $item->product->increment('quantity', $validated['quantity']);
                }
            }
            
            $item->quantity_returned += $validated['quantity'];
            
            if ($item->quantity_sold + $item->quantity_returned >= $item->quantity) {
                $item->status = $item->quantity_sold > 0 ? 'Sold' : 'Returned';
                $item->returned_at = now();
            }

            $noteStr = ($item->direction === 'inward' ? "Returned to sourcing dealer: " : "Restocked into shop: ") . "{$validated['quantity']} items. ";
            if ($validated['notes']) {
                $noteStr .= "Notes: " . $validated['notes'];
            }
            $item->notes = $item->notes ? $item->notes . "\n" . $noteStr : $noteStr;
            $item->save();

            DB::commit();
            $msg = $item->direction === 'inward' 
                ? 'Item(s) returned to sourcing dealer and removed from active shop stock.' 
                : 'Item(s) restocked into shop active inventory successfully.';
            return redirect()->back()->with('success', $msg);
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Error returning item: ' . $e->getMessage());
        }
    }

    public function updateItem(Request $request, DealerItem $item)
    {
        $validated = $request->validate([
            'dealer_price' => 'required|numeric|min:0',
            'expected_return_date' => 'nullable|date',
            'notes' => 'nullable|string'
        ]);

        try {
            $item->update([
                'dealer_price' => $validated['dealer_price'],
                'expected_return_date' => $validated['expected_return_date'],
                'notes' => $validated['notes']
            ]);

            return redirect()->back()->with('success', 'Deal updated successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Error updating deal: ' . $e->getMessage());
        }
    }

    public function generateStatement(Dealer $dealer, Request $request)
    {
        $status = $request->query('status', 'all'); // 'all', 'pending', 'sold', 'returned'
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $outputMode = $request->query('mode', 'download'); // 'download' or 'stream'

        $query = $dealer->dealerItems()
            ->with(['deviceImei.product.brand', 'product.brand', 'user', 'sale']);

        if ($status !== 'all') {
            if ($status === 'pending') {
                $query->where('status', 'Pending');
            } elseif ($status === 'sold') {
                $query->where('status', 'Sold');
            } elseif ($status === 'returned') {
                $query->where('status', 'Returned');
            }
        }

        if ($startDate) {
            $query->whereDate('issued_at', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('issued_at', '<=', $endDate);
        }

        $items = $query->orderBy('issued_at', 'desc')->get();

        // Calculate summary for statement
        $totalItemsTaken = $dealer->dealerItems()->sum('quantity');
        $totalItemsSold = $dealer->dealerItems()->sum('quantity_sold');
        $totalItemsReturned = $dealer->dealerItems()->sum('quantity_returned');
        
        $pendingItemsQuery = $dealer->dealerItems()->where('status', 'Pending');
        $currentlyOutCount = $pendingItemsQuery->sum(DB::raw('quantity - quantity_sold - quantity_returned'));
        $outstandingBalance = $pendingItemsQuery->sum(DB::raw('dealer_price * (quantity - quantity_sold - quantity_returned)'));
        
        $settledSalesValue = $dealer->dealerItems()->where('status', 'Sold')->sum(DB::raw('dealer_price * quantity_sold'));

        $overdueCount = $dealer->dealerItems()
            ->where('status', 'Pending')
            ->whereNotNull('expected_return_date')
            ->where('expected_return_date', '<', Carbon::today())
            ->count();
            
        $overdueValue = $dealer->dealerItems()
            ->where('status', 'Pending')
            ->whereNotNull('expected_return_date')
            ->where('expected_return_date', '<', Carbon::today())
            ->sum(DB::raw('dealer_price * (quantity - quantity_sold - quantity_returned)'));

        $summary = [
            'total_items_taken' => $totalItemsTaken,
            'total_items_sold' => $totalItemsSold,
            'total_items_returned' => $totalItemsReturned,
            'currently_out_count' => $currentlyOutCount,
            'outstanding_balance' => $outstandingBalance,
            'settled_sales_value' => $settledSalesValue,
            'overdue_count' => $overdueCount,
            'overdue_value' => $overdueValue,
        ];

        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => \App\Models\Setting::get('store_logo', null),
            'shop_address' => \App\Models\Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => \App\Models\Setting::get('shop_phone', '+256 700 000 000'),
            'shop_email' => \App\Models\Setting::get('shop_email', 'info@smartpos.com'),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
        ];

        $pdf = Pdf::loadView('pdf.dealer_statement', compact(
            'dealer', 'items', 'summary', 'settings', 'status', 'startDate', 'endDate'
        ))->setPaper('a4', 'portrait');

        $filename = 'dealer-statement-' . \Str::slug($dealer->name) . '-' . now()->format('Ymd') . '.pdf';

        if ($outputMode === 'stream') {
            return $pdf->stream($filename);
        }

        return $pdf->download($filename);
    }
}
