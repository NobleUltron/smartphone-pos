<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\DeviceImei;
use App\Models\PaymentAccount;
use App\Services\TreasuryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ProductController extends Controller
{
    public function index(Request $request)
    {
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
            }]);

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
        $bulkStock = Product::where('type', 'bulk')->sum('quantity');
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
        
        $bulkValue = Product::where('type', 'bulk')->sum(\Illuminate\Support\Facades\DB::raw('quantity * cost_price'));
        $serializedValue = \App\Models\DeviceImei::where('status', 'In Stock')->sum('cost_price');
        $totalInventoryValue = $bulkValue + $serializedValue;

        return Inertia::render('Inventory/Index', [
            'products' => $products,
            'allProducts' => $allProducts,
            'categories' => $categories,
            'brands' => $brands,
            'filters' => $request->only(['search', 'category_id', 'brand_id', 'product_id', 'stock_status']),
            'summary' => [
                'total_products' => $totalProducts,
                'total_stock_units' => $totalStockUnits,
                'in_stock_count' => $inStockCount,
                'low_stock_count' => $lowStockCount,
                'out_of_stock_count' => $outOfStockCount,
                'inventory_value' => $totalInventoryValue,
            ],
            'partners' => \App\Models\PartnerInvestor::where('is_active', true)->select('id', 'name', 'profit_share_percentage')->get(),
            'paymentAccounts' => PaymentAccount::where('is_active', true)->orderBy('id')->get(['id', 'name', 'type', 'current_balance']),
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
        
        return response()->json(['success' => true, 'product' => $product]);
    }

    public function destroy(Product $product)
    {
        try {
            $product->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cannot delete product, it might be in use.'], 400);
        }
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

        return response()->json(['success' => true, 'device' => $device]);
    }

    public function viewStock(Product $product)
    {
        $imeis = $product->deviceImeis()->with('partnerInvestor')->orderBy('created_at', 'desc')->get();
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

    public function destroyStock(DeviceImei $deviceImei)
    {
        // For simplicity, we just delete. If there are relationships preventing it (like SaleItems),
        // we might want to check that first or rely on foreign key constraints.
        try {
            $deviceImei->delete();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Cannot delete stock item. It may be linked to a past sale.'], 400);
        }
    }
}
