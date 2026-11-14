<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Sale;
use App\Models\DeviceImei;
use App\Models\Product;
use App\Models\User;
use App\Models\Repair;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        if (!in_array(strtolower(auth()->user()->role ?? ''), ['admin', 'manager'])) {
            abort(403, 'Unauthorized action. Business reports are restricted to Managers and Admins.');
        }

        $period = $request->query('period', 'today'); // today, week, month, year, all

        $startDate = match ($period) {
            'today' => Carbon::today(),
            'week' => Carbon::now()->startOfWeek(),
            'month' => Carbon::now()->startOfMonth(),
            'year' => Carbon::now()->startOfYear(),
            'all' => Carbon::createFromTimestamp(0),
            default => Carbon::today(),
        };

        $directSalesRevenue = Sale::whereNull('repair_id')
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where('payment_method', '!=', 'Layaway')
            ->where('sale_date', '>=', $startDate)
            ->sum('final_amount');

        $layawayRevenue = \App\Models\LayawayPayment::where('payment_date', '>=', $startDate)
            ->sum('amount_paid');

        $invoiceRevenue = \App\Models\InvoicePayment::where('payment_date', '>=', $startDate)
            ->sum('amount');

        $refunds = \App\Models\Expense::whereIn('category', ['Refund', 'Refund (Past Shift)'])
            ->where('expense_date', '>=', $startDate)
            ->sum('amount');

        $totalRevenue = $directSalesRevenue + $layawayRevenue + $invoiceRevenue - $refunds;

        // Include trade_in_value (non-cash barter tender) and B2B invoices in gross sales volume
        $posSalesVolume = (float) Sale::where('payment_status', '!=', 'Refunded')
            ->where('sale_date', '>=', $startDate)
            ->sum(DB::raw('final_amount + COALESCE(trade_in_value, 0)'));

        $invoiceSalesVolume = (float) \App\Models\Invoice::where('status', '!=', 'Cancelled')
            ->where('invoice_date', '>=', $startDate)
            ->sum('total_amount');

        $salesVolume = $posSalesVolume + $invoiceSalesVolume;
        
        // Calculate COGS and Gross Profit
        // For serialized items (device_imeis), bulk products, repair parts, and B2B invoice items
        $serializedCogs = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->where('sales.sale_date', '>=', $startDate)
            ->sum(DB::raw('device_imeis.cost_price * sale_items.quantity'));

        $bulkCogs = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereNull('sale_items.device_imei_id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->where('sales.sale_date', '>=', $startDate)
            ->sum(DB::raw('products.cost_price * sale_items.quantity'));

        $repairPartsCogs = DB::table('repair_parts')
            ->join('repairs', 'repair_parts.repair_id', '=', 'repairs.id')
            ->whereNotIn('repairs.status', ['Cancelled'])
            ->where('repairs.created_at', '>=', $startDate)
            ->sum(DB::raw('repair_parts.cost * repair_parts.quantity'));

        $invoiceCogs = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.status', '!=', 'Cancelled')
            ->where('invoices.invoice_date', '>=', $startDate)
            ->sum(DB::raw('products.cost_price * invoice_items.quantity'));

        $cogs = $serializedCogs + $bulkCogs + $repairPartsCogs + $invoiceCogs;
        $grossProfit = $salesVolume - $cogs;
        
        $repairsCompleted = Repair::whereIn('status', ['Completed', 'Delivered'])
            ->whereDate('updated_at', '>=', $startDate)
            ->count();
            
        $repairRevenue = \App\Models\LayawayPayment::whereHas('sale', function($q) {
                $q->whereNotNull('repair_id');
            })
            ->where('payment_date', '>=', $startDate)
            ->sum('amount_paid');
        
        $totalItemsSold = (int) DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->where('sales.sale_date', '>=', $startDate)
            ->sum('sale_items.quantity');

        // Top Selling Brands (supports serialized & bulk items)
        $topBrands = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->leftJoin('products', function($join) {
                $join->on('sale_items.product_id', '=', 'products.id')
                     ->orOn('device_imeis.product_id', '=', 'products.id');
            })
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->where('sales.sale_date', '>=', $startDate)
            ->select('brands.name', DB::raw('sum(sale_items.quantity) as value'))
            ->groupBy('brands.id', 'brands.name')
            ->orderByDesc('value')
            ->limit(5)
            ->get();

        // Top Selling Categories (supports serialized & bulk items)
        $topCategories = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->leftJoin('products', function($join) {
                $join->on('sale_items.product_id', '=', 'products.id')
                     ->orOn('device_imeis.product_id', '=', 'products.id');
            })
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->where('sales.sale_date', '>=', $startDate)
            ->select('categories.name', DB::raw('sum(sale_items.quantity) as value'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('value')
            ->limit(5)
            ->get();

        // Detailed Brand Profit Margin Breakdown
        $brandProfitBreakdown = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->leftJoin('products', function($join) {
                $join->on('sale_items.product_id', '=', 'products.id')
                     ->orOn('device_imeis.product_id', '=', 'products.id');
            })
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->where('sales.sale_date', '>=', $startDate)
            ->select(
                'brands.name as brand_name',
                DB::raw('sum(sale_items.quantity) as items_sold'),
                DB::raw('sum(sale_items.price * sale_items.quantity) as revenue'),
                DB::raw('sum(COALESCE(device_imeis.cost_price, products.cost_price, 0) * sale_items.quantity) as cogs')
            )
            ->groupBy('brands.id', 'brands.name')
            ->orderByDesc('revenue')
            ->get()
            ->map(function ($row) {
                $profit = $row->revenue - $row->cogs;
                $marginPct = $row->revenue > 0 ? round(($profit / $row->revenue) * 100, 1) : 0;
                return [
                    'brand_name' => $row->brand_name,
                    'items_sold' => (int) $row->items_sold,
                    'revenue' => (float) $row->revenue,
                    'cogs' => (float) $row->cogs,
                    'profit' => (float) $profit,
                    'margin_pct' => $marginPct
                ];
            });

        // Enhanced Cashier Performance
        $cashierPerformance = DB::table('sales')
            ->join('users', 'sales.user_id', '=', 'users.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->where('sales.sale_date', '>=', $startDate)
            ->select(
                'users.id as user_id',
                'users.name',
                'users.role',
                DB::raw('count(*) as sales_count'),
                DB::raw('sum(final_amount) as total_revenue'),
                DB::raw('sum(discount) as total_discounts')
            )
            ->groupBy('users.id', 'users.name', 'users.role')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(function ($row) use ($startDate) {
                $cogs = DB::table('sale_items')
                    ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                    ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
                    ->leftJoin('products', 'sale_items.product_id', '=', 'products.id')
                    ->where('sales.user_id', $row->user_id)
                    ->where('sales.payment_status', '!=', 'Refunded')
                    ->where('sales.sale_date', '>=', $startDate)
                    ->sum(DB::raw('COALESCE(device_imeis.cost_price, products.cost_price, 0) * sale_items.quantity'));

                $profit = $row->total_revenue - $cogs;
                $avgBasket = $row->sales_count > 0 ? round($row->total_revenue / $row->sales_count) : 0;

                return [
                    'name' => $row->name,
                    'role' => $row->role,
                    'sales_count' => (int) $row->sales_count,
                    'total_revenue' => (float) $row->total_revenue,
                    'total_discounts' => (float) $row->total_discounts,
                    'net_profit' => (float) $profit,
                    'avg_basket' => (float) $avgBasket
                ];
            });

        // Inventory Valuation (Current In Stock - Serialized & Bulk)
        $serializedStockValue = DeviceImei::where('status', 'In Stock')->sum('cost_price');
        $bulkStockValue = Product::where('type', 'bulk')->where('quantity', '>', 0)->sum(DB::raw('cost_price * quantity'));
        $inStockValue = $serializedStockValue + $bulkStockValue;

        $serializedExpectedRevenue = DeviceImei::where('status', 'In Stock')->sum('selling_price');
        $bulkExpectedRevenue = Product::where('type', 'bulk')->where('quantity', '>', 0)->sum(DB::raw('selling_price * quantity'));
        $expectedRevenue = $serializedExpectedRevenue + $bulkExpectedRevenue;

        $potentialProfit = $expectedRevenue - $inStockValue;
        $inStockCount = DeviceImei::where('status', 'In Stock')->count() + Product::where('type', 'bulk')->where('quantity', '>', 0)->sum('quantity');
        $defectiveCount = DeviceImei::where('status', 'Defective')->count();

        // Consignments Breakdown in Period
        $inwardReceivedCount = \App\Models\DealerItem::where('direction', 'inward')->where('created_at', '>=', $startDate)->count();
        $inwardSoldCount = (int) \App\Models\DealerItem::where('direction', 'inward')->where('quantity_sold', '>', 0)->where('sold_at', '>=', $startDate)->sum('quantity_sold');
        $inwardSettledAmount = (float) \App\Models\DealerItem::where('direction', 'inward')->where('settlement_amount', '>', 0)->where('settled_at', '>=', $startDate)->sum('settlement_amount');
        $unsettledOwedAmount = (float) \App\Models\DealerItem::where('direction', 'inward')
            ->where('quantity_sold', '>', 0)
            ->get()
            ->sum(function ($item) {
                $unitCost = (float) ($item->wholesale_cost ?: $item->dealer_price ?: 0);
                return max(0, ($unitCost * (int) $item->quantity_sold) - (float) ($item->settlement_amount ?? 0));
            });
        $soldInwardPeriod = \App\Models\DealerItem::where('direction', 'inward')->where('quantity_sold', '>', 0)->where('sold_at', '>=', $startDate)->get();
        $consignmentGrossRevenue = (float) $soldInwardPeriod->sum(fn($i) => (float) ($i->retail_price ?? 0) * (int) $i->quantity_sold);
        $consignmentWholesaleCost = (float) $soldInwardPeriod->sum(fn($i) => (float) ($i->wholesale_cost ?: $i->dealer_price ?: 0) * (int) $i->quantity_sold);
        $consignmentNetProfit = max(0, $consignmentGrossRevenue - $consignmentWholesaleCost);
        $outwardIssuedCount = \App\Models\DealerItem::where('direction', '!=', 'inward')->where('created_at', '>=', $startDate)->count();
        $outwardSoldCount = \App\Models\DealerItem::where('direction', '!=', 'inward')->where('status', 'Sold')->where('sold_at', '>=', $startDate)->count();

        // Layaways Breakdown in Period
        $newLayawaysCount = Sale::where('payment_status', 'Partial')->where('created_at', '>=', $startDate)->count();
        $completedLayawaysCount = Sale::where('payment_method', 'Layaway')->where('payment_status', 'Paid')->where('updated_at', '>=', $startDate)->count();
        $activeLayaways = Sale::with('layawayPayments')->where('payment_status', 'Partial')->get();
        $activeLayawaysCount = $activeLayaways->count();
        $totalLayawayReceivable = (float) $activeLayaways->sum(function ($sale) {
            return max(0, $sale->final_amount - $sale->layawayPayments->sum('amount_paid'));
        });
        $layawayCollectedInPeriod = (float) \App\Models\LayawayPayment::where('payment_date', '>=', $startDate)->sum('amount_paid');

        // Expense & Payout Categories Breakdown in Period
        $totalExpensesInPeriod = (float) \App\Models\Expense::where('expense_date', '>=', $startDate)->sum('amount');
        $expenseCategories = \App\Models\Expense::where('expense_date', '>=', $startDate)
            ->select('category as name', DB::raw('sum(amount) as value'))
            ->groupBy('category')
            ->orderByDesc('value')
            ->get();

        // Repairs Breakdown in Period
        $repairsLogged = Repair::where('created_at', '>=', $startDate)->count();

        return Inertia::render('Reports/Index', [
            'period' => $period,
            'metrics' => [
                'totalRevenue' => $totalRevenue,
                'salesVolume' => $salesVolume,
                'cogs' => $cogs,
                'grossProfit' => $grossProfit,
                'itemsSold' => $totalItemsSold,
                'repairsCompleted' => $repairsCompleted,
                'repairRevenue' => $repairRevenue,
            ],
            'inventory' => [
                'inStockValue' => $inStockValue,
                'expectedRevenue' => $expectedRevenue,
                'potentialProfit' => $potentialProfit,
                'inStockCount' => $inStockCount,
                'defectiveCount' => $defectiveCount,
            ],
            'consignments' => [
                'inwardReceived' => $inwardReceivedCount,
                'inwardSold' => $inwardSoldCount,
                'settledPayouts' => $inwardSettledAmount,
                'unsettledOwed' => $unsettledOwedAmount,
                'grossRevenue' => $consignmentGrossRevenue,
                'wholesaleCost' => $consignmentWholesaleCost,
                'netProfit' => $consignmentNetProfit,
                'outwardIssued' => $outwardIssuedCount,
                'outwardSold' => $outwardSoldCount,
            ],
            'layaways' => [
                'newPlans' => $newLayawaysCount,
                'completedPlans' => $completedLayawaysCount,
                'activePlans' => $activeLayawaysCount,
                'totalReceivable' => $totalLayawayReceivable,
                'collected' => $layawayCollectedInPeriod,
            ],
            'expenses' => [
                'total' => $totalExpensesInPeriod,
                'categories' => $expenseCategories,
            ],
            'repairs' => [
                'logged' => $repairsLogged,
                'completed' => $repairsCompleted,
                'revenue' => $repairRevenue,
            ],
            'topBrands' => $topBrands,
            'topCategories' => $topCategories,
            'brandProfitBreakdown' => $brandProfitBreakdown,
            'cashierPerformance' => $cashierPerformance
        ]);
    }
}
