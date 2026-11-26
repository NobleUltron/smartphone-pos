<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\DeviceImei;
use App\Models\PaymentAccount;
use App\Services\TreasuryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductController extends Controller
{
    private function clearInventoryCaches(): void
    {
        Cache::forget('global_low_stock_count');
        Cache::forget('global_defective_count');
    }

    public function index(Request $request)
    {
        $aging30Cutoff = now()->subDays(30);
        $aging60Cutoff = now()->subDays(60);

        $query = Product::with(['category', 'brand'])
            ->select('products.*')
            ->withCount(['deviceImeis as stock_count' => function ($q) {
                $q->where('status', 'In Stock');
            }])
            ->withCount(['deviceImeis as defective_count' => function ($q) {
                $q->where('status', 'Defective');
            }])
            ->withCount(['deviceImeis as sold_count' => function ($q) {
                $q->where('status', 'Sold');
            }])
            ->withCount(['deviceImeis as aging_30_count' => function ($q) use ($aging30Cutoff) {
                $q->where('status', 'In Stock')->where('created_at', '<=', $aging30Cutoff);
            }])
            ->withCount(['deviceImeis as aging_60_count' => function ($q) use ($aging60Cutoff) {
                $q->where('status', 'In Stock')->where('created_at', '<=', $aging60Cutoff);
            }])
            ->withMin(['deviceImeis as min_selling_price' => function ($q) {
                $q->where('status', 'In Stock');
            }], 'selling_price')
            ->withMax(['deviceImeis as max_selling_price' => function ($q) {
                $q->where('status', 'In Stock');
            }], 'selling_price')
            ->withSum(['deviceImeis as stock_cost_value' => function ($q) {
                $q->where('status', 'In Stock');
            }], 'cost_price');

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $term = '%' . strtolower($search) . '%';
            
            $query->where(function($q) use ($term) {
                $q->whereRaw('LOWER(products.model_name) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(COALESCE(products.sku, \'\')) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(COALESCE(products.storage_capacity, \'\')) LIKE ?', [$term])
                  ->orWhereHas('brand', function($bQuery) use ($term) {
                      $bQuery->whereRaw('LOWER(name) LIKE ?', [$term]);
                  })
                  ->orWhereHas('category', function($cQuery) use ($term) {
                      $cQuery->whereRaw('LOWER(name) LIKE ?', [$term]);
                  })
                  ->orWhereHas('deviceImeis', function($dQuery) use ($term) {
                      $dQuery->whereRaw('LOWER(imei) LIKE ?', [$term])
                             ->orWhereRaw('LOWER(COALESCE(storage_capacity, \'\')) LIKE ?', [$term])
                             ->orWhereRaw('LOWER(COALESCE(color, \'\')) LIKE ?', [$term]);
                  });
            });
        }

        if ($request->filled('category_id') && $request->input('category_id') !== 'all') {
            $query->where('products.category_id', $request->input('category_id'));
        }

        if ($request->filled('brand_id') && $request->input('brand_id') !== 'all') {
            $query->where('products.brand_id', $request->input('brand_id'));
        }

        if ($request->filled('product_id') && $request->input('product_id') !== 'all') {
            $query->where('products.id', $request->input('product_id'));
        }

        if ($request->filled('type') && $request->input('type') !== 'all') {
            if ($request->input('type') === 'bulk') {
                $query->where('products.type', 'bulk');
            } else {
                $query->where(function ($t) {
                    $t->whereNull('products.type')->orWhere('products.type', '!=', 'bulk');
                });
            }
        }

        if ($request->filled('stock_status') && $request->input('stock_status') !== 'all') {
            $stockStatus = $request->input('stock_status');
            if ($stockStatus === 'in_stock') {
                $query->where(function ($q) {
                    $q->where(function ($bulk) {
                        $bulk->where('products.type', 'bulk')
                             ->where('products.quantity', '>', 0);
                    })->orWhere(function ($serialized) {
                        $serialized->where(function ($t) {
                            $t->whereNull('products.type')
                              ->orWhere('products.type', '!=', 'bulk');
                        })->whereHas('deviceImeis', function ($d) {
                            $d->where('status', 'In Stock');
                        });
                    });
                });
            } elseif ($stockStatus === 'low_stock') {
                $query->where(function ($q) {
                    $q->where(function ($bulk) {
                        $bulk->where('products.type', 'bulk')
                             ->where('products.quantity', '>', 0)
                             ->where('products.quantity', '<', 5);
                    })->orWhere(function ($serialized) {
                        $serialized->where(function ($t) {
                            $t->whereNull('products.type')
                              ->orWhere('products.type', '!=', 'bulk');
                        })->whereHas('deviceImeis', function ($d) {
                            $d->where('status', 'In Stock');
                        }, '>=', 1)
                        ->whereHas('deviceImeis', function ($d) {
                            $d->where('status', 'In Stock');
                        }, '<', 5);
                    });
                });
            } elseif ($stockStatus === 'out_of_stock') {
                $query->where(function ($q) {
                    $q->where(function ($bulk) {
                        $bulk->where('products.type', 'bulk')
                             ->where('products.quantity', '<=', 0);
                    })->orWhere(function ($serialized) {
                        $serialized->where(function ($t) {
                            $t->whereNull('products.type')
                              ->orWhere('products.type', '!=', 'bulk');
                        })->whereDoesntHave('deviceImeis', function ($d) {
                            $d->where('status', 'In Stock');
                        });
                    });
                });
            } elseif ($stockStatus === 'aging_30') {
                $query->where(function ($t) {
                    $t->whereNull('products.type')->orWhere('products.type', '!=', 'bulk');
                })->whereHas('deviceImeis', function ($d) use ($aging30Cutoff) {
                    $d->where('status', 'In Stock')->where('created_at', '<=', $aging30Cutoff);
                });
            } elseif ($stockStatus === 'aging_60') {
                $query->where(function ($t) {
                    $t->whereNull('products.type')->orWhere('products.type', '!=', 'bulk');
                })->whereHas('deviceImeis', function ($d) use ($aging60Cutoff) {
                    $d->where('status', 'In Stock')->where('created_at', '<=', $aging60Cutoff);
                });
            }
        }

        $products = $query->leftJoin('brands', 'products.brand_id', '=', 'brands.id')
            ->orderByRaw('COALESCE(brands.name, products.model_name) ASC')
            ->orderBy('products.model_name', 'asc')
            ->paginate(10)
            ->withQueryString();

        $categories = Category::orderBy('name', 'asc')->get();
        $brands = Brand::orderBy('name', 'asc')->get();
        $allProducts = Product::with('brand:id,name')->select('id', 'brand_id', 'category_id', 'model_name', 'type')->orderBy('model_name')->get();
        
        $totalProducts = Product::count();
        $bulkStock = Product::where('type', 'bulk')->where('quantity', '>', 0)->sum('quantity');
        $serializedStock = \App\Models\DeviceImei::where('status', 'In Stock')->count();
        $totalStockUnits = $bulkStock + $serializedStock;
        
        $lowStockCount = Product::where(function ($q) {
            $q->where(function ($bulk) {
                $bulk->where('type', 'bulk')
                     ->where('quantity', '>', 0)
                     ->where('quantity', '<', 5);
            })->orWhere(function ($serialized) {
                $serialized->where(function ($t) {
                    $t->whereNull('type')->orWhere('type', '!=', 'bulk');
                })->whereHas('deviceImeis', fn($d) => $d->where('status', 'In Stock'), '>=', 1)
                  ->whereHas('deviceImeis', fn($d) => $d->where('status', 'In Stock'), '<', 5);
            });
        })->count();

        $inStockCount = Product::where(function ($q) {
            $q->where(function ($bulk) {
                $bulk->where('type', 'bulk')->where('quantity', '>', 0);
            })->orWhere(function ($serialized) {
                $serialized->where(function ($t) {
                    $t->whereNull('type')->orWhere('type', '!=', 'bulk');
                })->whereHas('deviceImeis', fn($d) => $d->where('status', 'In Stock'));
            });
        })->count();

        $outOfStockCount = max(0, $totalProducts - $inStockCount);
        
        $bulkValue = Product::where('type', 'bulk')->where('quantity', '>', 0)->sum(\Illuminate\Support\Facades\DB::raw('quantity * cost_price'));
        $serializedValue = \App\Models\DeviceImei::where('status', 'In Stock')->sum('cost_price');
        $totalInventoryValue = $bulkValue + $serializedValue;

        $aging30Units = \App\Models\DeviceImei::where('status', 'In Stock')->where('created_at', '<=', $aging30Cutoff)->count();
        $aging60Units = \App\Models\DeviceImei::where('status', 'In Stock')->where('created_at', '<=', $aging60Cutoff)->count();
        $aging30Value = (float) \App\Models\DeviceImei::where('status', 'In Stock')->where('created_at', '<=', $aging30Cutoff)->sum('cost_price');
        $agingProductsCount = Product::where(function ($t) {
            $t->whereNull('type')->orWhere('type', '!=', 'bulk');
        })->whereHas('deviceImeis', fn($d) => $d->where('status', 'In Stock')->where('created_at', '<=', $aging30Cutoff))->count();

        return Inertia::render('Inventory/Index', [
            'products' => $products,
            'allProducts' => $allProducts,
            'categories' => $categories,
            'brands' => $brands,
            'filters' => $request->only(['search', 'category_id', 'brand_id', 'product_id', 'stock_status', 'type']),
            'summary' => [
                'total_products' => $totalProducts,
                'total_stock_units' => $totalStockUnits,
                'in_stock_count' => $inStockCount,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'inventory_value' => $totalInventoryValue,
                'aging_30_units' => $aging30Units,
                'aging_60_units' => $aging60Units,
                'aging_30_value' => $aging30Value,
                'aging_products_count' => $agingProductsCount,
            ],
            'partners' => \App\Models\PartnerInvestor::where('is_active', true)->select('id', 'name', 'profit_share_percentage')->get(),
            'paymentAccounts' => PaymentAccount::where('is_active', true)->where('is_personal', false)->orderBy('id')->get(['id', 'name', 'type', 'current_balance']),
            'suppliers' => \App\Models\Supplier::orderBy('name')->get(['id', 'name', 'credit_balance']),
        ]);
    }

    public function create()
    {
        $categories = Category::all();
        return Inertia::render('Inventory/Create', [
            'categories' => $categories
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'brand_id' => 'required|exists:brands,id',
            'model_name' => 'required|string|max:255',
            'storage_capacity' => 'nullable|string|max:50',
            'type' => 'nullable|string|in:serialized,bulk',
            'sku' => 'nullable|string|unique:products,sku',
            'quantity' => 'nullable|integer|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
        ]);

        if (!isset($validated['type'])) {
            $validated['type'] = 'serialized';
        }

        if (array_key_exists('quantity', $validated) && is_null($validated['quantity'])) {
            $validated['quantity'] = 0;
        }

        $product = Product::create($validated);
        $this->clearInventoryCaches();
        
        return response()->json(['success' => true, 'product' => $product]);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'brand_id' => 'required|exists:brands,id',
            'model_name' => 'required|string|max:255',
            'storage_capacity' => 'nullable|string|max:50',
            'type' => 'nullable|string|in:serialized,bulk',
            'sku' => 'nullable|string|unique:products,sku,' . $product->id,
            'quantity' => 'nullable|integer|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'selling_price' => 'nullable|numeric|min:0',
        ]);

        if (array_key_exists('quantity', $validated) && is_null($validated['quantity'])) {
            $validated['quantity'] = 0;
        }

        $product->update($validated);
        $this->clearInventoryCaches();
        
        return response()->json(['success' => true, 'product' => $product]);
    }

    public function destroy(Product $product)
    {
        try {
            $product->delete();
            $this->clearInventoryCaches();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cannot delete product, it might be in use.'], 400);
        }
    }

    public function labelStudio(Request $request)
    {
        $devices = DeviceImei::with(['product.brand'])
            ->whereIn('status', ['In Stock', 'In Transit'])
            ->orderByRaw("CASE WHEN status = 'In Stock' THEN 0 ELSE 1 END")
            ->orderByDesc('id')
            ->get()
            ->map(function ($d) {
                $brand = $d->product?->brand?->name ?? '';
                $model = $d->product?->model_name ?? 'Device';
                return [
                    'id' => $d->id,
                    'imei' => $d->imei,
                    'title' => trim("{$brand} {$model}"),
                    'storage' => $d->storage_capacity ?: '',
                    'color' => $d->color ?: '',
                    'condition' => $d->condition ?: 'Brand New',
                    'status' => $d->status,
                    'price' => (float) ($d->selling_price ?? 0),
                ];
            })
            ->values();

        $preselectedIds = collect(explode(',', (string) $request->query('ids', '')))
            ->map(fn($v) => (int) trim($v))
            ->filter(fn($v) => $v > 0)
            ->values()
            ->all();

        return Inertia::render('Inventory/LabelStudio', [
            'devices' => $devices,
            'preselectedIds' => $preselectedIds,
            'settings' => [
                'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS'),
                'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
            ],
        ]);
    }

    public function printLabel(Request $request)
    {
        $type = $request->input('type');
        $id = $request->input('id');
        $qty = (int) $request->input('qty', 1);

        if ($qty < 1 || $qty > 100) $qty = 1;

        $labelData = null;

        if ($type === 'imei') {
            $device = DeviceImei::with('product.brand')->findOrFail($id);
            $labelData = [
                'barcode' => $device->imei,
                'title' => ($device->product->brand ? $device->product->brand->name . ' ' : '') . $device->product->model_name,
                'subtitle' => $device->storage_capacity . ' • ' . $device->color,
                'condition' => $device->condition,
                'price' => $device->selling_price,
            ];
        } elseif ($type === 'bulk') {
            $product = Product::with('brand')->findOrFail($id);
            $barcode = $product->sku ?: 'PROD-' . str_pad($product->id, 6, '0', STR_PAD_LEFT);
            $labelData = [
                'barcode' => $barcode,
                'title' => ($product->brand ? $product->brand->name . ' ' : '') . $product->model_name,
                'subtitle' => $product->storage_capacity ? ($product->storage_capacity . ' Storage') : 'Accessory',
                'condition' => 'Brand New',
                'price' => $product->selling_price,
            ];
        } else {
            abort(400, 'Invalid type');
        }

        return Inertia::render('Inventory/PrintLabel', [
            'labelData' => $labelData,
            'qty' => $qty,
        ]);
    }

    public function addStock(Request $request)
    {
        $request->validate(['product_id' => 'required|exists:products,id']);
        $product = Product::findOrFail($request->product_id);

        if ($product->type === 'bulk') {
            $validated = $request->validate([
                'quantity' => 'required|integer|min:1',
                'cost_price' => 'nullable|numeric|min:0',
                'selling_price' => 'nullable|numeric|min:0',
            ]);
            
            $product->increment('quantity', $validated['quantity']);
            if (isset($validated['cost_price'])) $product->cost_price = $validated['cost_price'];
            if (isset($validated['selling_price'])) $product->selling_price = $validated['selling_price'];
            $product->save();
            $this->clearInventoryCaches();

            return response()->json(['success' => true, 'product' => $product]);
        }

        $validated = $request->validate([
            'imei' => 'required|string|max:50|unique:device_imeis',
            'condition' => 'required|string',
            'cost_price' => 'required|numeric|min:0',
            'storage_capacity' => 'required|string|max:50',
            'color' => 'required|string|max:50',
            'selling_price' => 'required|numeric|min:0',
            'partner_investor_id' => 'nullable|exists:partner_investors,id',
            'refurbishment_cost' => 'nullable|numeric|min:0',
            'refurbishment_notes' => 'nullable|string|max:500',
            'refurbishment_account_id' => 'nullable|exists:payment_accounts,id',
        ]);

        $initialCost = (float) $validated['cost_price'];
        $refurbCost = (float) ($validated['refurbishment_cost'] ?? 0);
        $totalCost = $initialCost + $refurbCost;
        $noteText = trim((string) ($validated['refurbishment_notes'] ?? ''));
        $formattedNotes = null;
        if ($refurbCost > 0) {
            $label = $noteText !== '' ? $noteText : 'Initial refurbishment/repair on intake';
            $formattedNotes = '[' . now()->format('Y-m-d H:i') . '] ' . $label . ' (+' . number_format($refurbCost) . ' UGX)';
        } elseif ($noteText !== '') {
            $formattedNotes = '[' . now()->format('Y-m-d H:i') . '] ' . $noteText;
        }

        try {
            $device = DB::transaction(function () use ($product, $validated, $initialCost, $refurbCost, $totalCost, $formattedNotes, $noteText) {
                $device = DeviceImei::create([
                    'product_id' => $product->id,
                    'imei' => $validated['imei'],
                    'condition' => $validated['condition'],
                    'cost_price' => $totalCost,
                    'initial_cost_price' => $initialCost,
                    'refurbishment_cost' => $refurbCost,
                    'refurbishment_notes' => $formattedNotes,
                    'storage_capacity' => $validated['storage_capacity'],
                    'color' => $validated['color'],
                    'selling_price' => $validated['selling_price'],
                    'partner_investor_id' => $validated['partner_investor_id'] ?? null,
                    'status' => 'In Stock',
                ]);

                if ($refurbCost > 0 && !empty($validated['refurbishment_account_id'])) {
                    $desc = "Initial Refurbishment/Repair on {$product->model_name} (IMEI: {$device->imei})"
                        . ($noteText !== '' ? ": {$noteText}" : '');
                    $this->recordRefurbishmentOutflow(
                        (int) $validated['refurbishment_account_id'],
                        $refurbCost,
                        $device,
                        $desc
                    );
                }

                return $device;
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->clearInventoryCaches();

        return response()->json(['success' => true, 'device' => $device]);
    }

    public function viewStock(Product $product)
    {
        $imeis = $product->deviceImeis()->with('partnerInvestor')->orderBy('created_at', 'desc')->get();

        // Map each IMEI to its original supplier & purchase order from purchase_items
        $imeiSupplierMap = [];
        $purchaseItems = \App\Models\PurchaseItem::with('purchase.supplier')
            ->where('product_id', $product->id)
            ->whereNotNull('imeis')
            ->orderByDesc('id')
            ->get();

        foreach ($purchaseItems as $pi) {
            if (!is_array($pi->imeis) || !$pi->purchase) continue;
            foreach ($pi->imeis as $imeiStr) {
                $key = trim((string) $imeiStr);
                if ($key !== '' && !isset($imeiSupplierMap[$key])) {
                    $imeiSupplierMap[$key] = [
                        'supplier_id' => $pi->purchase->supplier_id,
                        'supplier_name' => $pi->purchase->supplier?->name,
                        'purchase_id' => $pi->purchase_id,
                    ];
                }
            }
        }

        $imeis->transform(function ($device) use ($imeiSupplierMap) {
            $match = $imeiSupplierMap[trim((string) $device->imei)] ?? null;
            $device->setAttribute('original_supplier_id', $match['supplier_id'] ?? null);
            $device->setAttribute('original_supplier_name', $match['supplier_name'] ?? null);
            $device->setAttribute('original_purchase_id', $match['purchase_id'] ?? null);
            $device->setAttribute('days_in_stock', $device->created_at ? (int) $device->created_at->diffInDays(now()) : 0);
            return $device;
        });

        return response()->json(['imeis' => $imeis]);
    }
    public function updateStock(Request $request, DeviceImei $deviceImei)
    {
        $validated = $request->validate([
            'imei' => 'required|string|max:50|unique:device_imeis,imei,' . $deviceImei->id,
            'condition' => 'required|string',
            'cost_price' => 'required|numeric|min:0',
            'storage_capacity' => 'required|string|max:50',
            'color' => 'required|string|max:50',
            'selling_price' => 'required|numeric|min:0',
            'partner_investor_id' => 'nullable|exists:partner_investors,id',
            'status' => 'required|string'
        ]);

        $newTotalCost = (float) $validated['cost_price'];
        $existingRefurb = (float) ($deviceImei->refurbishment_cost ?? 0);
        if ($newTotalCost >= $existingRefurb) {
            $validated['initial_cost_price'] = $newTotalCost - $existingRefurb;
        } else {
            $validated['initial_cost_price'] = 0;
            $validated['refurbishment_cost'] = $newTotalCost;
        }

        $deviceImei->update($validated);
        $this->clearInventoryCaches();

        return response()->json(['success' => true, 'device' => $deviceImei->load('partnerInvestor')]);
    }

    public function addRefurbishmentCost(Request $request, DeviceImei $deviceImei)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'description' => 'required|string|max:500',
            'payment_account_id' => 'nullable|exists:payment_accounts,id',
            'new_selling_price' => 'nullable|numeric|min:0',
            'new_condition' => 'nullable|string|max:100',
            'new_status' => 'nullable|in:In Stock,Defective,In Transit,Reserved,With Dealer',
        ]);

        try {
            $updated = DB::transaction(function () use ($deviceImei, $validated) {
                $device = DeviceImei::with('product')->lockForUpdate()->findOrFail($deviceImei->id);

                if ($device->status === 'Sold') {
                    throw new \InvalidArgumentException('Cannot add repair cost to a device that has already been sold.');
                }

                $addedCost = (float) $validated['amount'];
                $baseInitialCost = $device->initial_cost_price !== null
                    ? (float) $device->initial_cost_price
                    : (float) $device->cost_price;
                $newRefurbCost = (float) ($device->refurbishment_cost ?? 0) + $addedCost;
                $newTotalCost = (float) $device->cost_price + $addedCost;

                $noteEntry = '[' . now()->format('Y-m-d H:i') . '] '
                    . trim($validated['description'])
                    . ' (+' . number_format($addedCost) . ' UGX)';
                $combinedNotes = $device->refurbishment_notes
                    ? ($device->refurbishment_notes . "\n" . $noteEntry)
                    : $noteEntry;

                $device->initial_cost_price = $baseInitialCost;
                $device->refurbishment_cost = $newRefurbCost;
                $device->cost_price = $newTotalCost;
                $device->refurbishment_notes = $combinedNotes;

                if (array_key_exists('new_selling_price', $validated) && $validated['new_selling_price'] !== null) {
                    $device->selling_price = $validated['new_selling_price'];
                }
                if (!empty($validated['new_condition'])) {
                    $device->condition = $validated['new_condition'];
                }
                if (!empty($validated['new_status'])) {
                    $device->status = $validated['new_status'];
                }

                $device->save();

                if (!empty($validated['payment_account_id'])) {
                    $productName = $device->product ? $device->product->model_name : 'Device';
                    $desc = "Repair/Refurb on {$productName} (IMEI: {$device->imei}): " . trim($validated['description']);
                    $this->recordRefurbishmentOutflow(
                        (int) $validated['payment_account_id'],
                        $addedCost,
                        $device,
                        $desc
                    );
                }

                return $device;
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->clearInventoryCaches();

        return response()->json([
            'success' => true,
            'message' => 'Refurbishment cost capitalized into device cost basis.',
            'device' => $updated->load('partnerInvestor'),
        ]);
    }

    private function recordRefurbishmentOutflow(int $paymentAccountId, float $amount, DeviceImei $device, string $description): void
    {
        $account = PaymentAccount::lockForUpdate()->findOrFail($paymentAccountId);
        if ((float) $account->current_balance < $amount) {
            throw new \InvalidArgumentException(
                "Insufficient balance in {$account->name} (Available: UGX " . number_format((float) $account->current_balance) . ")."
            );
        }

        TreasuryService::recordOutflow(
            $account,
            $amount,
            'Inventory Refurbishment',
            $device,
            $description,
            null,
            auth()->id()
        );
    }

    public function returnToSupplier(Request $request, DeviceImei $deviceImei)
    {
        if (!in_array($deviceImei->status, ['In Stock', 'Defective'])) {
            return response()->json([
                'message' => "Only 'In Stock' or 'Defective' devices can be returned to a supplier (current status: {$deviceImei->status}).",
            ], 422);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'resolution' => 'required|in:refund,supplier_credit,replacement,supplier_repair',
            'amount' => 'required_if:resolution,refund,supplier_credit|nullable|numeric|min:0',
            'payment_account_id' => 'required_if:resolution,refund|nullable|exists:payment_accounts,id',
            'replacement_imei' => 'required_if:resolution,replacement|nullable|string|max:50|unique:device_imeis,imei',
            'replacement_product_id' => 'nullable|exists:products,id',
            'replacement_storage' => 'nullable|string|max:50',
            'replacement_color' => 'nullable|string|max:50',
            'replacement_condition' => 'nullable|string|max:50',
            'replacement_cost_price' => 'nullable|numeric|min:0',
            'replacement_selling_price' => 'nullable|numeric|min:0',
            'return_credit_value' => 'nullable|numeric|min:0',
            'difference_settlement' => 'nullable|in:wallet,supplier_credit',
            'reason' => 'required|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ], [
            'supplier_id.required' => 'Please select the supplier receiving this return.',
            'payment_account_id.required_if' => 'Please select the business wallet receiving the supplier refund.',
            'replacement_imei.required_if' => 'Please enter the replacement device IMEI.',
            'replacement_imei.unique' => 'That replacement IMEI already exists in inventory.',
        ]);

        try {
            $result = DB::transaction(function () use ($deviceImei, $validated) {
                $device = DeviceImei::with('product.brand')->lockForUpdate()->findOrFail($deviceImei->id);

                if (!in_array($device->status, ['In Stock', 'Defective'])) {
                    throw new \InvalidArgumentException("Device is no longer eligible for supplier return (status: {$device->status}).");
                }

                $supplier = \App\Models\Supplier::lockForUpdate()->findOrFail($validated['supplier_id']);
                $resolution = $validated['resolution'];
                $amount = in_array($resolution, ['refund', 'supplier_credit'])
                    ? (float) ($validated['amount'] ?? $device->cost_price ?? 0)
                    : 0.0;

                $brandName = $device->product?->brand?->name ? ($device->product->brand->name . ' ') : '';
                $productName = $brandName . ($device->product?->model_name ?? 'Device');

                $replacementDevice = null;
                $paymentAccountId = null;
                $returnStatus = 'Completed';
                $settlementNote = '';

                if ($resolution === 'refund') {
                    $device->status = 'Returned to Supplier';
                    $device->save();

                    $account = PaymentAccount::where('is_active', true)
                        ->where('is_personal', false)
                        ->lockForUpdate()
                        ->findOrFail($validated['payment_account_id']);
                    $paymentAccountId = $account->id;

                    if ($amount > 0) {
                        TreasuryService::recordInflow(
                            $account,
                            $amount,
                            'Supplier Refund',
                            $device,
                            "Supplier refund for returned {$productName} (IMEI: {$device->imei}) from {$supplier->name}: {$validated['reason']}",
                            null,
                            auth()->id()
                        );
                    }
                } elseif ($resolution === 'supplier_credit') {
                    $device->status = 'Returned to Supplier';
                    $device->save();

                    if ($amount > 0) {
                        $supplier->increment('credit_balance', $amount);
                    }
                } elseif ($resolution === 'replacement') {
                    $device->status = 'Returned to Supplier';
                    $device->save();

                    $newProductId = !empty($validated['replacement_product_id'])
                        ? (int) $validated['replacement_product_id']
                        : $device->product_id;
                    $newProduct = Product::with('brand')->findOrFail($newProductId);
                    $newBrandName = $newProduct->brand?->name ? ($newProduct->brand->name . ' ') : '';
                    $newProductName = $newBrandName . $newProduct->model_name;

                    $returnValue = array_key_exists('return_credit_value', $validated) && $validated['return_credit_value'] !== null
                        ? (float) $validated['return_credit_value']
                        : (float) $device->cost_price;
                    $newCost = array_key_exists('replacement_cost_price', $validated) && $validated['replacement_cost_price'] !== null
                        ? (float) $validated['replacement_cost_price']
                        : (float) $device->cost_price;
                    $newSellingPrice = array_key_exists('replacement_selling_price', $validated) && $validated['replacement_selling_price'] !== null
                        ? (float) $validated['replacement_selling_price']
                        : (float) ($newProductId === $device->product_id ? $device->selling_price : ($newProduct->selling_price ?? $newCost));

                    $replacementDevice = DeviceImei::create([
                        'product_id' => $newProductId,
                        'imei' => trim($validated['replacement_imei']),
                        'condition' => !empty($validated['replacement_condition']) ? $validated['replacement_condition'] : $device->condition,
                        'status' => 'In Stock',
                        'cost_price' => $newCost,
                        'initial_cost_price' => $newCost,
                        'refurbishment_cost' => 0,
                        'selling_price' => $newSellingPrice,
                        'storage_capacity' => !empty($validated['replacement_storage']) ? trim($validated['replacement_storage']) : $device->storage_capacity,
                        'color' => !empty($validated['replacement_color']) ? trim($validated['replacement_color']) : $device->color,
                        'partner_investor_id' => $device->partner_investor_id,
                    ]);

                    $diff = round($newCost - $returnValue, 2);
                    $amount = abs($diff);

                    if ($diff > 0) {
                        // New device costs MORE -> Shop pays top-up to supplier
                        $settlement = $validated['difference_settlement'] ?? 'wallet';
                        if ($settlement === 'supplier_credit') {
                            if ((float) $supplier->credit_balance < $diff) {
                                throw new \InvalidArgumentException(
                                    "Insufficient supplier credit with {$supplier->name} (Available: UGX " . number_format((float) $supplier->credit_balance) . ", Needed: UGX " . number_format($diff) . ")."
                                );
                            }
                            $supplier->decrement('credit_balance', $diff);
                            $settlementNote = " [Top-Up UGX " . number_format($diff) . " deducted from Supplier Credit]";
                        } else {
                            if (empty($validated['payment_account_id'])) {
                                throw new \InvalidArgumentException('Please select the business wallet used to pay the top-up.');
                            }
                            $account = PaymentAccount::where('is_active', true)
                                ->where('is_personal', false)
                                ->lockForUpdate()
                                ->findOrFail($validated['payment_account_id']);
                            if ((float) $account->current_balance < $diff) {
                                throw new \InvalidArgumentException(
                                    "Insufficient balance in {$account->name} (Available: UGX " . number_format((float) $account->current_balance) . ")."
                                );
                            }
                            $paymentAccountId = $account->id;
                            TreasuryService::recordOutflow(
                                $account,
                                $diff,
                                'Supplier Exchange Top-Up',
                                $replacementDevice,
                                "Top-up paid to {$supplier->name} swapping {$productName} ({$device->imei}) for {$newProductName} ({$replacementDevice->imei}): {$validated['reason']}",
                                null,
                                auth()->id()
                            );
                            $settlementNote = " [Top-Up UGX " . number_format($diff) . " paid via {$account->name}]";
                        }
                    } elseif ($diff < 0) {
                        // New device costs LESS -> Supplier owes balance back to shop
                        $balanceBack = abs($diff);
                        $settlement = $validated['difference_settlement'] ?? 'supplier_credit';
                        if ($settlement === 'wallet') {
                            if (empty($validated['payment_account_id'])) {
                                throw new \InvalidArgumentException('Please select the business wallet that received the balance refund.');
                            }
                            $account = PaymentAccount::where('is_active', true)
                                ->where('is_personal', false)
                                ->lockForUpdate()
                                ->findOrFail($validated['payment_account_id']);
                            $paymentAccountId = $account->id;
                            TreasuryService::recordInflow(
                                $account,
                                $balanceBack,
                                'Supplier Exchange Refund',
                                $device,
                                "Balance refund from {$supplier->name} swapping {$productName} ({$device->imei}) for {$newProductName} ({$replacementDevice->imei}): {$validated['reason']}",
                                null,
                                auth()->id()
                            );
                            $settlementNote = " [Balance UGX " . number_format($balanceBack) . " refunded to {$account->name}]";
                        } else {
                            $supplier->increment('credit_balance', $balanceBack);
                            $settlementNote = " [Balance UGX " . number_format($balanceBack) . " added to Supplier Credit]";
                        }
                    }
                } elseif ($resolution === 'supplier_repair') {
                    $device->status = 'At Supplier (Repair)';
                    $device->save();
                    $returnStatus = 'Pending Return';
                }

                $fullReason = trim($validated['reason'])
                    . (!empty($validated['notes']) ? ' — ' . trim($validated['notes']) : '')
                    . $settlementNote;

                \App\Models\SupplierReturn::create([
                    'supplier_id' => $supplier->id,
                    'device_imei_id' => $device->id,
                    'replacement_imei_id' => $replacementDevice?->id,
                    'return_type' => 'device_return',
                    'resolution' => $resolution,
                    'status' => $returnStatus,
                    'amount' => $amount,
                    'payment_account_id' => $paymentAccountId,
                    'reason' => $fullReason,
                    'returned_at' => now(),
                    'user_id' => auth()->id(),
                ]);

                \App\Models\ActivityLog::log(
                    'device_returned_to_supplier',
                    'Inventory',
                    "Returned {$productName} (IMEI: {$device->imei}) to {$supplier->name} via {$resolution}" . ($amount > 0 ? " (UGX " . number_format($amount) . ")" : '') . ($replacementDevice ? " → Replacement IMEI: {$replacementDevice->imei}" : '') . ": {$validated['reason']}{$settlementNote}",
                    ['device_imei_id' => $device->id, 'supplier_id' => $supplier->id, 'resolution' => $resolution, 'amount' => $amount]
                );

                return [
                    'device' => $device->fresh('partnerInvestor'),
                    'replacement_device' => $replacementDevice?->load('partnerInvestor'),
                    'replacement_same_product' => $replacementDevice ? ($replacementDevice->product_id === $device->product_id) : false,
                ];
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->clearInventoryCaches();

        $msg = match ($validated['resolution']) {
            'refund' => 'Device returned to supplier and refund credited to wallet.',
            'supplier_credit' => 'Device returned to supplier and credit added to supplier account.',
            'replacement' => 'Device exchanged with supplier for IMEI ' . trim($validated['replacement_imei']) . ' (In Stock).',
            'supplier_repair' => 'Device sent to supplier for repair (status: At Supplier (Repair)).',
        };

        return response()->json([
            'success' => true,
            'message' => $msg,
            'device' => $result['device'],
            'replacement_device' => $result['replacement_device'],
            'replacement_same_product' => $result['replacement_same_product'],
        ]);
    }

    public function receiveFromSupplier(Request $request, DeviceImei $deviceImei)
    {
        if ($deviceImei->status !== 'At Supplier (Repair)') {
            return response()->json([
                'message' => 'Only devices currently marked as At Supplier (Repair) can be received back.',
            ], 422);
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:1000',
        ]);

        $updated = DB::transaction(function () use ($deviceImei, $validated) {
            $device = DeviceImei::with('product.brand')->lockForUpdate()->findOrFail($deviceImei->id);
            $device->status = 'In Stock';
            $device->save();

            $openReturn = \App\Models\SupplierReturn::where('device_imei_id', $device->id)
                ->where('resolution', 'supplier_repair')
                ->where('status', 'Pending Return')
                ->latest()
                ->first();

            if ($openReturn) {
                $openReturn->status = 'Received Back';
                $openReturn->received_back_at = now();
                if (!empty($validated['notes'])) {
                    $openReturn->reason = trim(($openReturn->reason ? $openReturn->reason . ' | ' : '') . 'Received back: ' . trim($validated['notes']));
                }
                $openReturn->save();
            }

            $brandName = $device->product?->brand?->name ? ($device->product->brand->name . ' ') : '';
            $productName = $brandName . ($device->product?->model_name ?? 'Device');

            \App\Models\ActivityLog::log(
                'device_received_from_supplier',
                'Inventory',
                "Received repaired {$productName} (IMEI: {$device->imei}) back from supplier into In Stock.",
                ['device_imei_id' => $device->id]
            );

            return $device->fresh('partnerInvestor');
        });

        $this->clearInventoryCaches();

        return response()->json([
            'success' => true,
            'message' => 'Device received back from supplier and returned to In Stock.',
            'device' => $updated,
        ]);
    }

    public function returnBulkToSupplier(Request $request, Product $product)
    {
        if ($product->type !== 'bulk') {
            return response()->json(['message' => 'This endpoint is only for bulk (accessory/part) products.'], 422);
        }
        if ((int) $product->quantity <= 0) {
            return response()->json(['message' => 'No bulk stock available to return.'], 422);
        }

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'quantity' => 'required|integer|min:1|max:' . (int) $product->quantity,
            'resolution' => 'required|in:refund,supplier_credit,replacement',
            'amount' => 'required_if:resolution,refund,supplier_credit|nullable|numeric|min:0',
            'payment_account_id' => 'required_if:resolution,refund|nullable|exists:payment_accounts,id',
            'reason' => 'required|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ], [
            'supplier_id.required' => 'Please select the supplier receiving this return.',
            'payment_account_id.required_if' => 'Please select the business wallet receiving the supplier refund.',
        ]);

        try {
            $updatedProduct = DB::transaction(function () use ($product, $validated) {
                $lockedProduct = Product::with('brand')->lockForUpdate()->findOrFail($product->id);
                $qty = (int) $validated['quantity'];

                if ($qty > (int) $lockedProduct->quantity) {
                    throw new \InvalidArgumentException("Requested return quantity ({$qty}) exceeds available stock ({$lockedProduct->quantity}).");
                }

                $supplier = \App\Models\Supplier::lockForUpdate()->findOrFail($validated['supplier_id']);
                $resolution = $validated['resolution'];
                $amount = in_array($resolution, ['refund', 'supplier_credit'])
                    ? (float) ($validated['amount'] ?? ($qty * (float) ($lockedProduct->cost_price ?? 0)))
                    : 0.0;

                $productName = trim(($lockedProduct->brand?->name ?? '') . ' ' . $lockedProduct->model_name);
                $paymentAccountId = null;

                if ($resolution === 'refund') {
                    $lockedProduct->decrement('quantity', $qty);

                    $account = PaymentAccount::where('is_active', true)
                        ->where('is_personal', false)
                        ->lockForUpdate()
                        ->findOrFail($validated['payment_account_id']);
                    $paymentAccountId = $account->id;

                    if ($amount > 0) {
                        TreasuryService::recordInflow(
                            $account,
                            $amount,
                            'Supplier Refund',
                            $lockedProduct,
                            "Supplier refund for returned {$qty}x {$productName} from {$supplier->name}: {$validated['reason']}",
                            null,
                            auth()->id()
                        );
                    }
                } elseif ($resolution === 'supplier_credit') {
                    $lockedProduct->decrement('quantity', $qty);

                    if ($amount > 0) {
                        $supplier->increment('credit_balance', $amount);
                    }
                }
                // For 'replacement', supplier swaps defective bulk units 1-for-1 so net quantity stays unchanged.

                $fullReason = "{$productName} (Qty: {$qty}) — " . trim($validated['reason'])
                    . (!empty($validated['notes']) ? ' — ' . trim($validated['notes']) : '');

                \App\Models\SupplierReturn::create([
                    'supplier_id' => $supplier->id,
                    'return_type' => 'bulk_return',
                    'resolution' => $resolution,
                    'status' => 'Completed',
                    'amount' => $amount,
                    'payment_account_id' => $paymentAccountId,
                    'reason' => $fullReason,
                    'returned_at' => now(),
                    'user_id' => auth()->id(),
                ]);

                \App\Models\ActivityLog::log(
                    'bulk_returned_to_supplier',
                    'Inventory',
                    "Returned {$qty}x {$productName} to {$supplier->name} via {$resolution}" . ($amount > 0 ? " (UGX " . number_format($amount) . ")" : '') . ": {$validated['reason']}",
                    ['product_id' => $lockedProduct->id, 'supplier_id' => $supplier->id, 'quantity' => $qty, 'resolution' => $resolution, 'amount' => $amount]
                );

                return $lockedProduct->fresh(['brand', 'category']);
            });
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->clearInventoryCaches();

        $msg = match ($validated['resolution']) {
            'refund' => "Returned {$validated['quantity']} unit(s) and credited refund to wallet.",
            'supplier_credit' => "Returned {$validated['quantity']} unit(s) and added credit to supplier account.",
            'replacement' => "Logged 1-for-1 replacement swap for {$validated['quantity']} unit(s).",
        };

        return response()->json([
            'success' => true,
            'message' => $msg,
            'product' => $updatedProduct,
        ]);
    }

    public function destroyStock(DeviceImei $deviceImei)
    {
        // For simplicity, we just delete. If there are relationships preventing it (like SaleItems),
        // we might want to check that first or rely on foreign key constraints.
        try {
            $deviceImei->delete();
            $this->clearInventoryCaches();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cannot delete stock item. It may be linked to a past sale.'], 400);
        }
    }
}
