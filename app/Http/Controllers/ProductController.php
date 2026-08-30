<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\DeviceImei;
use Illuminate\Http\Request;
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
        
        $lowStockCount = Product::withCount(['deviceImeis' => function ($q) {
            $q->where('status', 'In Stock');
        }])->get()->filter(function ($product) {
            return ($product->type === 'serialized' && $product->device_imeis_count < 5) || 
                   ($product->type === 'bulk' && $product->quantity < 5);
        })->count();
        
        $bulkValue = Product::where('type', 'bulk')->sum(\Illuminate\Support\Facades\DB::raw('quantity * cost_price'));
        $serializedValue = \App\Models\DeviceImei::where('status', 'In Stock')->sum('cost_price');
        $totalInventoryValue = $bulkValue + $serializedValue;

        return Inertia::render('Inventory/Index', [
            'products' => $products,
            'allProducts' => $allProducts,
            'categories' => $categories,
            'brands' => $brands,
            'filters' => $request->only(['search', 'category_id']),
            'summary' => [
                'total_products' => $totalProducts,
                'total_stock_units' => $totalStockUnits,
                'low_stock_count' => $lowStockCount,
                'inventory_value' => $totalInventoryValue,
            ]
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
                'subtitle' => 'Accessory',
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
        ]);

        $device = DeviceImei::create([
            'product_id' => $product->id,
            'imei' => $validated['imei'],
            'condition' => $validated['condition'],
            'cost_price' => $validated['cost_price'],
            'storage_capacity' => $validated['storage_capacity'],
            'color' => $validated['color'],
            'selling_price' => $validated['selling_price'],
            'status' => 'In Stock',
        ]);

        return response()->json(['success' => true, 'device' => $device]);
    }

    public function viewStock(Product $product)
    {
        $imeis = $product->deviceImeis()->orderBy('created_at', 'desc')->get();
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
            'status' => 'required|string'
        ]);

        $deviceImei->update($validated);

        return response()->json(['success' => true, 'device' => $deviceImei]);
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
