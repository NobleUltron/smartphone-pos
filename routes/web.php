<?php

use App\Http\Controllers\POSController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\SaleController;
use App\Http\Controllers\GeminiAIController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\WarrantyController;
use App\Http\Controllers\ReceiptHistoryController;
use App\Http\Controllers\CashierPortalController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\RepairController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ShiftReportController;
use App\Http\Controllers\ActivityLogController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Models\Sale;
use App\Models\DeviceImei;
use App\Models\Product;
use App\Models\Repair;
use Carbon\Carbon;

use Illuminate\Support\Facades\DB;

// Public Image Routes
Route::get('/images/store-logo', [SettingController::class, 'serveLogo'])->name('images.store_logo');
Route::get('/images/profile/{id}', [ProfileController::class, 'servePhoto'])->name('images.profile_photo');

Route::get('/fix-sequences', function () {
    $results = \App\Services\DatabaseSequenceService::syncAll();
    return response()->json([
        'status' => 'success',
        'database_driver' => DB::getDriverName(),
        'results' => $results,
    ]);
});

Route::get('/', function (\Illuminate\Http\Request $request) {
    if (auth()->check()) {
        $role = auth()->user()->role;
        if ($role === 'cashier') {
            return redirect()->route('cashier.index');
        } elseif ($role === 'technician') {
            return redirect()->route('technician.index');
        }
        return redirect()->route('dashboard');
    }
    return redirect()->route('login');
});

Route::get('/dashboard', function () {
    $todayDirectSales = Sale::whereDate('sale_date', Carbon::today())
        ->whereIn('payment_status', ['Paid', 'Refunded'])
        ->where('payment_method', '!=', 'Layaway')
        ->sum('final_amount');

    $todayLayawayPayments = \App\Models\LayawayPayment::whereDate('payment_date', Carbon::today())
        ->sum('amount_paid');

    $todayRefunds = \App\Models\Expense::whereDate('expense_date', Carbon::today())
        ->whereIn('category', ['Refund', 'Refund (Past Shift)'])
        ->sum('amount');

    $todaySales = $todayDirectSales + $todayLayawayPayments - $todayRefunds;
    $inStockCount = DeviceImei::where('status', 'In Stock')->count();
    $scrappedCount = DeviceImei::where('status', 'Defective')->count();
    $lowStockCount = Product::where(function ($query) {
        $query->where('type', 'bulk')->where('quantity', '<=', 5);
    })->orWhere(function ($query) {
        $query->where('type', 'serialized')
              ->whereRaw("(SELECT COUNT(*) FROM device_imeis WHERE device_imeis.product_id = products.id AND device_imeis.status = 'In Stock') <= 5");
    })->count();

    $activeRepairsCount = Repair::whereIn('status', ['Pending', 'In Progress'])->count();
    $completedRepairsToday = Repair::whereIn('status', ['Completed', 'Delivered'])->whereDate('updated_at', Carbon::today())->count();

    $salesData = collect(range(6, 0))->map(function ($days) {
        $date = Carbon::today()->subDays($days);
        $directSales = Sale::whereDate('sale_date', $date)
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where('payment_method', '!=', 'Layaway')
            ->sum('final_amount');
            
        $layawayPayments = \App\Models\LayawayPayment::whereDate('payment_date', $date)
            ->sum('amount_paid');
            
        $refunds = \App\Models\Expense::whereDate('expense_date', $date)
            ->whereIn('category', ['Refund', 'Refund (Past Shift)'])
            ->sum('amount');
            
        $total = $directSales + $layawayPayments - $refunds;
        return [
            'date' => $date->format('M d'),
            'sales' => (float) $total
        ];
    });

    $recentSales = Sale::with('customer', 'user')->orderBy('created_at', 'desc')->take(5)->get()->map(function ($sale) {
        return [
            'id' => $sale->id,
            'customer_name' => $sale->customer ? $sale->customer->name : 'Walk-in',
            'amount' => $sale->final_amount,
            'time' => $sale->created_at->diffForHumans(),
            'cashier' => $sale->user ? $sale->user->name : 'System',
            'cashier_photo' => $sale->user ? $sale->user->profile_photo_url : 'https://ui-avatars.com/api/?name=System&color=7F9CF5&background=EBF4FF',
            'payment_status' => $sale->payment_status
        ];
    });

    $inventoryValue = DeviceImei::where('status', 'In Stock')->sum('selling_price');

    $topBrands = \Illuminate\Support\Facades\DB::table('sale_items')
        ->join('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
        ->join('products', 'device_imeis.product_id', '=', 'products.id')
        ->join('brands', 'products.brand_id', '=', 'brands.id')
        ->select('brands.name', \Illuminate\Support\Facades\DB::raw('count(*) as value'))
        ->groupBy('brands.name')
        ->orderByDesc('value')
        ->limit(5)
        ->get();

    $dealerPendingInwardCount = \App\Models\DealerItem::where('direction', 'inward')->where('status', 'Pending')->count();
    $dealerOwedAmount = (float) \App\Models\DealerItem::where('direction', 'inward')
        ->where('status', 'Sold')
        ->where('settlement_status', '!=', 'Settled')
        ->sum(\Illuminate\Support\Facades\DB::raw('COALESCE(wholesale_cost, dealer_price, 0)'));
    $dealerOutwardPendingCount = \App\Models\DealerItem::where('direction', '!=', 'inward')->where('status', 'Pending')->count();
    $dealerOutwardOverdueCount = \App\Models\DealerItem::where('direction', '!=', 'inward')
        ->where('status', 'Pending')
        ->where('expected_return_date', '<', Carbon::today())
        ->count();

    $activeLayaways = Sale::with('layawayPayments')->where('payment_status', 'Partial')->get();
    $activeLayawaysCount = $activeLayaways->count();
    $totalLayawayReceivable = (float) $activeLayaways->sum(function ($sale) {
        return max(0, $sale->final_amount - $sale->layawayPayments->sum('amount_paid'));
    });

    $todayRepairRevenue = (float) \App\Models\LayawayPayment::whereHas('sale', function ($q) {
            $q->whereNotNull('repair_id');
        })
        ->whereDate('payment_date', Carbon::today())
        ->sum('amount_paid');

    $activeDrawersCount = \App\Models\CashDrawer::where('status', 'open')->count();
    $todayExpenses = (float) \App\Models\Expense::whereDate('expense_date', Carbon::today())
        ->whereNotIn('category', ['Refund', 'Refund (Past Shift)'])
        ->sum('amount');

    return Inertia::render('Dashboard', [
        'todaySales' => $todaySales,
        'inStockCount' => $inStockCount,
        'scrappedCount' => $scrappedCount,
        'lowStockCount' => $lowStockCount,
        'activeRepairsCount' => $activeRepairsCount,
        'completedRepairsToday' => $completedRepairsToday,
        'salesData' => $salesData,
        'recentSales' => $recentSales,
        'inventoryValue' => $inventoryValue,
        'topBrands' => $topBrands,
        'dealerMetrics' => [
            'pendingInwardCount' => $dealerPendingInwardCount,
            'owedAmount' => $dealerOwedAmount,
            'outwardPendingCount' => $dealerOutwardPendingCount,
            'outwardOverdueCount' => $dealerOutwardOverdueCount,
        ],
        'layawayMetrics' => [
            'activeCount' => $activeLayawaysCount,
            'totalReceivable' => $totalLayawayReceivable,
            'todayCollections' => (float) $todayLayawayPayments,
        ],
        'repairMetrics' => [
            'activeCount' => $activeRepairsCount,
            'completedToday' => $completedRepairsToday,
            'todayRevenue' => $todayRepairRevenue,
        ],
        'shiftMetrics' => [
            'activeDrawersCount' => $activeDrawersCount,
            'todayExpenses' => $todayExpenses,
        ],
    ]);
})->middleware(['auth', 'verified', 'role:admin,manager'])->name('dashboard');

Route::middleware('auth')->group(function () {
    Route::middleware('role:admin,manager,cashier')->group(function () {
        Route::get('/cashier', [CashierPortalController::class, 'index'])->name('cashier.index');
        Route::get('/pos', [POSController::class, 'index'])->name('pos.index');
        Route::get('/pos/receipt/{sale}', [POSController::class, 'receipt'])->name('pos.receipt');
        Route::get('/receipts', [ReceiptHistoryController::class, 'index'])->name('receipts.index');
        Route::post('/api/receipts/{sale}/refund', [ReceiptHistoryController::class, 'refund']);
        Route::post('/api/pos/validate-imei', [POSController::class, 'validateImei']);
        Route::post('/api/pos/checkout', [POSController::class, 'checkout']);
        Route::get('/api/pos/inventory-search', [POSController::class, 'inventorySearch']);

        Route::get('/customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::post('/api/customers', [CustomerController::class, 'store']);
        Route::put('/api/customers/{customer}', [CustomerController::class, 'update']);
        Route::delete('/api/customers/{customer}', [CustomerController::class, 'destroy']);
        Route::get('/api/customers/{customer}/history', [CustomerController::class, 'history']);

        Route::get('/warranties', [WarrantyController::class, 'index'])->name('warranties.index');
        Route::post('/api/warranties/lookup', [WarrantyController::class, 'lookup']);
        Route::post('/api/warranties', [WarrantyController::class, 'store']);
        Route::put('/api/warranties/{claim}', [WarrantyController::class, 'update']);

        Route::get('/cash-drawer', [\App\Http\Controllers\CashDrawerController::class, 'index'])->name('cash-drawer.index');
        Route::post('/cash-drawer/open', [\App\Http\Controllers\CashDrawerController::class, 'open']);
        Route::post('/cash-drawer/close', [\App\Http\Controllers\CashDrawerController::class, 'close']);
        Route::get('/cash-drawer/history', [\App\Http\Controllers\CashDrawerController::class, 'history'])->name('cash-drawer.history');
        Route::get('/cash-drawer/{drawer}/report', [ShiftReportController::class, 'generate'])->name('cash-drawer.report');
        
        Route::get('/expenses', [\App\Http\Controllers\ExpenseController::class, 'index'])->name('expenses.index');
        Route::post('/expenses', [\App\Http\Controllers\ExpenseController::class, 'store']);
        Route::put('/api/expenses/{expense}', [\App\Http\Controllers\ExpenseController::class, 'update']);
        Route::delete('/api/expenses/{expense}', [\App\Http\Controllers\ExpenseController::class, 'destroy']);
        Route::get('/api/expenses/export', [\App\Http\Controllers\ExpenseController::class, 'export'])->middleware('role:admin,manager');
        
        Route::get('/layaways', [\App\Http\Controllers\LayawayController::class, 'index'])->name('layaways.index');
        Route::post('/layaways/{sale}/payments', [\App\Http\Controllers\LayawayController::class, 'storePayment'])->name('layaways.payments.store');
    });

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
    Route::post('/two-factor/toggle', [\App\Http\Controllers\TwoFactorController::class, 'toggle'])->name('two-factor.toggle');

    // SmartPOS AI Chatbot Assistant API Route
    Route::post('/api/gemini/ask', [\App\Http\Controllers\GeminiAIController::class, 'ask'])->name('gemini.ask');

    // Repairs
    Route::prefix('repairs')->name('repairs.')->group(function () {
        Route::get('/', [RepairController::class, 'index'])->name('index');
        Route::post('/', [RepairController::class, 'store'])->name('store');
        Route::put('/{repair}', [RepairController::class, 'update'])->name('update');
        Route::delete('/{repair}', [RepairController::class, 'destroy'])->name('destroy');
        Route::get('/{repair}/print', [RepairController::class, 'printTicket'])->name('print');
        Route::post('/{repair}/payments', [RepairController::class, 'storePayment'])->name('payments.store');
        
        // Parts
        Route::post('/{repair}/parts', [\App\Http\Controllers\RepairPartController::class, 'store'])->name('parts.store');
        Route::delete('/{repair}/parts/{part}', [\App\Http\Controllers\RepairPartController::class, 'destroy'])->name('parts.destroy');
    });

    // Repair Excel Export (Accessible to all authenticated staff with repair access)
    Route::get('/api/export/repairs', [\App\Http\Controllers\ExportController::class, 'exportRepairs'])->name('export.repairs');

    // Technician Portal
    Route::middleware('role:technician,admin,manager')->group(function () {
        Route::get('/technician', [\App\Http\Controllers\TechnicianPortalController::class, 'index'])->name('technician.index');
    });

    // Dealers / Partner Items
    Route::get('/dealers/dashboard', [\App\Http\Controllers\DealerController::class, 'dashboard'])->name('dealers.dashboard');
    Route::get('/dealers', [\App\Http\Controllers\DealerController::class, 'index'])->name('dealers.index');
    Route::post('/api/dealers', [\App\Http\Controllers\DealerController::class, 'store'])->name('dealers.store');
    Route::get('/dealers/issue', [\App\Http\Controllers\DealerController::class, 'issue'])->name('dealers.issue');
    Route::get('/api/dealers/search-device', [\App\Http\Controllers\DealerController::class, 'searchDevice'])->name('dealers.search-device');
    Route::post('/api/dealers/issue', [\App\Http\Controllers\DealerController::class, 'storeIssue'])->name('dealers.store-issue');
    Route::post('/api/dealers/inward', [\App\Http\Controllers\DealerController::class, 'storeInward'])->name('dealers.store-inward');
    Route::get('/dealers/{dealer}', [\App\Http\Controllers\DealerController::class, 'show'])->name('dealers.show');
    Route::get('/dealers/{dealer}/statement', [\App\Http\Controllers\DealerController::class, 'generateStatement'])->name('dealers.statement');
    Route::put('/api/dealers/{dealer}', [\App\Http\Controllers\DealerController::class, 'update'])->name('dealers.update');
    Route::delete('/api/dealers/{dealer}', [\App\Http\Controllers\DealerController::class, 'destroy'])->name('dealers.destroy');
    Route::post('/api/dealers/items/{item}/sold', [\App\Http\Controllers\DealerController::class, 'markSold'])->name('dealers.mark-sold');
    Route::post('/api/dealers/items/{item}/returned', [\App\Http\Controllers\DealerController::class, 'markReturned'])->name('dealers.mark-returned');
    Route::post('/api/dealers/items/{item}/settle', [\App\Http\Controllers\DealerController::class, 'settleInward'])->name('dealers.settle');
    Route::get('/dealers/items/{item}/voucher', [\App\Http\Controllers\DealerController::class, 'generatePayoutVoucher'])->name('dealers.voucher');
    Route::put('/api/dealers/items/{item}', [\App\Http\Controllers\DealerController::class, 'updateItem'])->name('dealers.update-item');

    // Stock Audits
    Route::get('/inventory/audits', [\App\Http\Controllers\StockAuditController::class, 'index'])->name('inventory.audits.index');
    Route::post('/inventory/audits', [\App\Http\Controllers\StockAuditController::class, 'store'])->name('inventory.audits.store');
    Route::get('/inventory/audits/{audit}', [\App\Http\Controllers\StockAuditController::class, 'show'])->name('inventory.audits.show');
    Route::post('/api/inventory/audits/{audit}/scan', [\App\Http\Controllers\StockAuditController::class, 'scan'])->name('inventory.audits.scan');
    Route::post('/api/inventory/audits/{audit}/complete', [\App\Http\Controllers\StockAuditController::class, 'complete'])->name('inventory.audits.complete');
    Route::get('/inventory/audits/{audit}/export', [\App\Http\Controllers\StockAuditController::class, 'export'])->name('inventory.audits.export');
    Route::delete('/inventory/audits/{audit}', [\App\Http\Controllers\StockAuditController::class, 'destroy'])->name('inventory.audits.destroy');

    // Customer Statement
    Route::get('/customers/{customer}/statement', [\App\Http\Controllers\CustomerController::class, 'generateStatement'])->name('customers.statement');

    Route::middleware(['role:admin,manager'])->group(function () {
        // Suppliers
        Route::get('/suppliers', [\App\Http\Controllers\SupplierController::class, 'index'])->name('suppliers.index');
        Route::post('/api/suppliers', [\App\Http\Controllers\SupplierController::class, 'store']);
        Route::get('/suppliers/{supplier}', [\App\Http\Controllers\SupplierController::class, 'show'])->name('suppliers.show');
        Route::put('/api/suppliers/{supplier}', [\App\Http\Controllers\SupplierController::class, 'update']);
        Route::delete('/api/suppliers/{supplier}', [\App\Http\Controllers\SupplierController::class, 'destroy']);

        // Purchases
        Route::get('/purchases/create', [\App\Http\Controllers\PurchaseController::class, 'create'])->name('purchases.create');
        Route::post('/api/purchases', [\App\Http\Controllers\PurchaseController::class, 'store']);
        Route::post('/api/purchases/{purchase}/receive', [\App\Http\Controllers\PurchaseController::class, 'receive']);
        Route::post('/api/purchases/{purchase}/payments', [\App\Http\Controllers\PurchaseController::class, 'recordPayment'])->name('purchases.payments.store');
        Route::delete('/api/purchases/{purchase}', [\App\Http\Controllers\PurchaseController::class, 'destroy']);

        // Inventory
        Route::get('/inventory', [ProductController::class, 'index'])->name('inventory.index');
        Route::get('/inventory/labels/print', [ProductController::class, 'printLabel'])->name('inventory.labels.print');
        Route::post('/api/products', [ProductController::class, 'store']);
        Route::post('/api/products/{product}', [ProductController::class, 'update']);
        Route::delete('/api/products/{product}', [ProductController::class, 'destroy']);
        Route::post('/api/products/imeis', [ProductController::class, 'addImeis']);
        Route::put('/api/products/imeis/{imei}', [ProductController::class, 'updateImei']);
        Route::delete('/api/products/imeis/{imei}', [ProductController::class, 'deleteImei']);
        
        // Inventory API endpoints matching frontend
        Route::post('/api/inventory/products', [ProductController::class, 'store']);
        Route::put('/api/inventory/products/{product}', [ProductController::class, 'update']);
        Route::delete('/api/inventory/products/{product}', [ProductController::class, 'destroy']);
        Route::post('/api/inventory/categories', [CategoryController::class, 'store']);
        Route::delete('/api/inventory/categories/{category}', [CategoryController::class, 'destroy']);
        Route::post('/api/inventory/brands', [BrandController::class, 'store']);
        Route::delete('/api/inventory/brands/{brand}', [BrandController::class, 'destroy']);
        Route::post('/api/inventory/stock', [ProductController::class, 'addStock']);
        Route::get('/api/inventory/{product}/stock', [ProductController::class, 'viewStock']);
        Route::put('/api/inventory/stock/{deviceImei}', [ProductController::class, 'updateStock']);
        Route::delete('/api/inventory/stock/{deviceImei}', [ProductController::class, 'destroyStock']);

        // Brands and Categories
        Route::get('/api/brands', [BrandController::class, 'index']);
        Route::post('/api/brands', [BrandController::class, 'store']);
        Route::put('/api/brands/{brand}', [BrandController::class, 'update']);
        Route::delete('/api/brands/{brand}', [BrandController::class, 'destroy']);
        Route::get('/api/categories', [CategoryController::class, 'index']);
        Route::post('/api/categories', [CategoryController::class, 'store']);
        Route::put('/api/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/api/categories/{category}', [CategoryController::class, 'destroy']);

    // Admin & Manager Only Routes
    Route::middleware(['role:admin,manager'])->group(function () {
        Route::get('/activity-logs', [ActivityLogController::class, 'index'])->name('activity-logs.index');
        Route::get('/reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('/api/export/inventory', [\App\Http\Controllers\ExportController::class, 'exportInventory'])->name('export.inventory');
        Route::get('/api/export/sales', [\App\Http\Controllers\ExportController::class, 'exportSales'])->name('export.sales');

        // Accounts & Treasury Management
        Route::get('/accounts', [\App\Http\Controllers\AccountController::class, 'index'])->name('accounts.index');
        Route::post('/accounts', [\App\Http\Controllers\AccountController::class, 'store'])->name('accounts.store');
        Route::post('/accounts/transfer', [\App\Http\Controllers\AccountController::class, 'transfer'])->name('accounts.transfer');
        Route::get('/accounts/{account}', [\App\Http\Controllers\AccountController::class, 'show'])->name('accounts.show');
        Route::put('/accounts/{account}', [\App\Http\Controllers\AccountController::class, 'update'])->name('accounts.update');
        Route::post('/accounts/{account}/reconcile', [\App\Http\Controllers\AccountController::class, 'reconcile'])->name('accounts.reconcile');
        Route::get('/accounts/{account}/statement', [\App\Http\Controllers\AccountController::class, 'statement'])->name('accounts.statement');
    });

        // Admin Only Routes (Staff & Store Settings)
        Route::middleware(['role:admin'])->group(function () {
            Route::get('/settings', [SettingController::class, 'index'])->name('settings.index');
            Route::post('/api/settings', [SettingController::class, 'store']);

            Route::get('/users', [UserController::class, 'index'])->name('users.index');
            Route::post('/api/users', [UserController::class, 'store']);
            Route::put('/api/users/{user}', [UserController::class, 'update']);
            Route::delete('/api/users/{user}', [UserController::class, 'destroy']);
            Route::post('/api/users/{user}/suspend', [UserController::class, 'suspend']);
            Route::post('/api/users/{user}/reactivate', [UserController::class, 'reactivate']);
            Route::post('/api/users/{user}/reset-password', [UserController::class, 'resetPassword']);
        });

        // Sales History
        Route::get('/sales', [SaleController::class, 'index'])->name('sales.index');

    });
});

require __DIR__.'/auth.php';
