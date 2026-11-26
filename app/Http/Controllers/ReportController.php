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
        if (!(auth()->user()?->hasPermission('view_reports'))) {
            abort(403, 'Unauthorized action. Business reports require the View Reports permission.');
        }

        $period = $request->query('period', 'today'); // today, week, month, year, all, custom
        $dateFrom = $request->query('date_from', '');
        $dateTo = $request->query('date_to', '');

        if ($request->filled('date_from') || $request->filled('date_to')) {
            $period = 'custom';
            $startDate = $request->filled('date_from') ? Carbon::parse($dateFrom)->startOfDay() : Carbon::createFromTimestamp(0);
            $endDate = $request->filled('date_to') ? Carbon::parse($dateTo)->endOfDay() : Carbon::now()->endOfDay();
        } else {
            $startDate = match ($period) {
                'today' => Carbon::today(),
                'week' => Carbon::now()->startOfWeek(),
                'month' => Carbon::now()->startOfMonth(),
                'year' => Carbon::now()->startOfYear(),
                'all' => Carbon::createFromTimestamp(0),
                default => Carbon::today(),
            };
            $endDate = Carbon::now()->endOfDay();
        }

        $directSalesRevenue = Sale::whereNull('repair_id')
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where('payment_method', '!=', 'Layaway')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->sum('final_amount');

        $layawayRevenue = \App\Models\LayawayPayment::whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount_paid');

        $invoiceRevenue = \App\Models\InvoicePayment::whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount');

        $refunds = \App\Models\Expense::whereIn('category', ['Refund', 'Refund (Past Shift)'])
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->sum('amount');

        $totalRevenue = $directSalesRevenue + $layawayRevenue + $invoiceRevenue - $refunds;

        // Include trade_in_value (non-cash barter tender) and B2B invoices in gross sales volume
        $posSalesVolume = (float) Sale::where('payment_status', '!=', 'Refunded')
            ->whereBetween('sale_date', [$startDate, $endDate])
            ->sum(DB::raw('final_amount + COALESCE(trade_in_value, 0)'));

        $invoiceSalesVolume = (float) \App\Models\Invoice::where('status', '!=', 'Cancelled')
            ->whereBetween('issue_date', [$startDate, $endDate])
            ->sum('total_amount');

        $salesVolume = $posSalesVolume + $invoiceSalesVolume;
        
        // Calculate COGS and Gross Profit
        // For serialized items (device_imeis), bulk products, repair parts, and B2B invoice items
        $serializedCogs = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->sum(DB::raw('device_imeis.cost_price * sale_items.quantity'));

        $bulkCogs = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->join('products', 'sale_items.product_id', '=', 'products.id')
            ->whereNull('sale_items.device_imei_id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->sum(DB::raw('products.cost_price * sale_items.quantity'));

        $repairPartsCogs = DB::table('repair_parts')
            ->join('repairs', 'repair_parts.repair_id', '=', 'repairs.id')
            ->whereNotIn('repairs.status', ['Cancelled'])
            ->whereBetween('repairs.created_at', [$startDate, $endDate])
            ->sum(DB::raw('repair_parts.cost * repair_parts.quantity'));

        $invoiceCogs = DB::table('invoice_items')
            ->join('invoices', 'invoice_items.invoice_id', '=', 'invoices.id')
            ->join('products', 'invoice_items.product_id', '=', 'products.id')
            ->where('invoices.status', '!=', 'Cancelled')
            ->whereBetween('invoices.issue_date', [$startDate, $endDate])
            ->sum(DB::raw('products.cost_price * invoice_items.quantity'));

        $cogs = $serializedCogs + $bulkCogs + $repairPartsCogs + $invoiceCogs;
        $grossProfit = $salesVolume - $cogs;
        
        $repairsCompleted = Repair::whereIn('status', ['Completed', 'Delivered'])
            ->whereBetween('updated_at', [$startDate, $endDate])
            ->count();
            
        $repairRevenue = \App\Models\LayawayPayment::whereHas('sale', function($q) {
                $q->whereNotNull('repair_id');
            })
            ->whereBetween('payment_date', [$startDate, $endDate])
            ->sum('amount_paid');
        
        $totalItemsSold = (int) DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->sum('sale_items.quantity');

        // Top Selling Brands (supports serialized & bulk items)
        $topBrands = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->join('products', function($join) {
                $join->on('products.id', '=', DB::raw('COALESCE(sale_items.product_id, device_imeis.product_id)'));
            })
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select('brands.name', DB::raw('sum(sale_items.quantity) as value'))
            ->groupBy('brands.id', 'brands.name')
            ->orderByDesc('value')
            ->limit(5)
            ->get();

        // Top Selling Categories (supports serialized & bulk items)
        $topCategories = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->join('products', function($join) {
                $join->on('products.id', '=', DB::raw('COALESCE(sale_items.product_id, device_imeis.product_id)'));
            })
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select('categories.name', DB::raw('sum(sale_items.quantity) as value'))
            ->groupBy('categories.id', 'categories.name')
            ->orderByDesc('value')
            ->limit(5)
            ->get();

        // Detailed Brand Profit Margin Breakdown
        $brandProfitBreakdown = DB::table('sale_items')
            ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
            ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
            ->join('products', function($join) {
                $join->on('products.id', '=', DB::raw('COALESCE(sale_items.product_id, device_imeis.product_id)'));
            })
            ->join('brands', 'products.brand_id', '=', 'brands.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
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

        // Enhanced Cashier Performance (Sales, Profit Margin & Commission Leaderboard)
        $cashierPerformance = DB::table('sales')
            ->join('users', 'sales.user_id', '=', 'users.id')
            ->where('sales.payment_status', '!=', 'Refunded')
            ->whereBetween('sales.sale_date', [$startDate, $endDate])
            ->select(
                'users.id as user_id',
                'users.name',
                'users.role',
                'users.commission_type',
                'users.commission_rate',
                DB::raw('count(*) as sales_count'),
                DB::raw('sum(final_amount + COALESCE(trade_in_value, 0)) as total_revenue'),
                DB::raw('sum(discount) as total_discounts')
            )
            ->groupBy('users.id', 'users.name', 'users.role', 'users.commission_type', 'users.commission_rate')
            ->orderByDesc('total_revenue')
            ->get()
            ->map(function ($row) use ($startDate, $endDate) {
                $cogs = (float) DB::table('sale_items')
                    ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                    ->leftJoin('device_imeis', 'sale_items.device_imei_id', '=', 'device_imeis.id')
                    ->leftJoin('products', function($join) {
                        $join->on('products.id', '=', DB::raw('COALESCE(sale_items.product_id, device_imeis.product_id)'));
                    })
                    ->where('sales.user_id', $row->user_id)
                    ->where('sales.payment_status', '!=', 'Refunded')
                    ->whereBetween('sales.sale_date', [$startDate, $endDate])
                    ->sum(DB::raw('COALESCE(device_imeis.cost_price, products.cost_price, 0) * sale_items.quantity'));

                $phonesSold = (int) DB::table('sale_items')
                    ->join('sales', 'sale_items.sale_id', '=', 'sales.id')
                    ->where('sales.user_id', $row->user_id)
                    ->where('sales.payment_status', '!=', 'Refunded')
                    ->whereNotNull('sale_items.device_imei_id')
                    ->whereBetween('sales.sale_date', [$startDate, $endDate])
                    ->count();

                $revenue = (float) $row->total_revenue;
                $profit = $revenue - $cogs;
                $marginPct = $revenue > 0 ? round(($profit / $revenue) * 100, 1) : 0.0;
                $avgBasket = $row->sales_count > 0 ? round($revenue / $row->sales_count) : 0;

                $commType = $row->commission_type ?: 'none';
                $commRate = (float) ($row->commission_rate ?? 0);
                $commissionEarned = match ($commType) {
                    'per_phone' => $phonesSold * $commRate,
                    'profit_percent' => max(0, $profit) * ($commRate / 100),
                    'revenue_percent' => max(0, $revenue) * ($commRate / 100),
                    default => 0.0,
                };

                $commissionEarnedRounded = round($commissionEarned);
                $commissionPaid = (float) \App\Models\Expense::where('category', 'Staff Commission')
                    ->where('user_id', $row->user_id)
                    ->whereBetween('expense_date', [$startDate, $endDate])
                    ->sum('amount');

                return [
                    'user_id' => $row->user_id,
                    'name' => $row->name,
                    'role' => $row->role,
                    'sales_count' => (int) $row->sales_count,
                    'phones_sold' => $phonesSold,
                    'total_revenue' => $revenue,
                    'total_discounts' => (float) $row->total_discounts,
                    'net_profit' => (float) $profit,
                    'margin_pct' => $marginPct,
                    'avg_basket' => (float) $avgBasket,
                    'commission_type' => $commType,
                    'commission_rate' => $commRate,
                    'commission_earned' => $commissionEarnedRounded,
                    'commission_paid' => $commissionPaid,
                    'commission_balance' => max(0, $commissionEarnedRounded - $commissionPaid),
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
        $inwardReceivedCount = \App\Models\DealerItem::where('direction', 'inward')->whereBetween('created_at', [$startDate, $endDate])->count();
        $inwardSoldCount = (int) \App\Models\DealerItem::where('direction', 'inward')->where('quantity_sold', '>', 0)->whereBetween('sold_at', [$startDate, $endDate])->sum('quantity_sold');
        $inwardSettledAmount = (float) \App\Models\DealerItem::where('direction', 'inward')->where('settlement_amount', '>', 0)->whereBetween('settled_at', [$startDate, $endDate])->sum('settlement_amount');
        $unsettledOwedAmount = (float) \App\Models\DealerItem::where('direction', 'inward')
            ->where('quantity_sold', '>', 0)
            ->get()
            ->sum(function ($item) {
                $unitCost = (float) ($item->wholesale_cost ?: $item->dealer_price ?: 0);
                return max(0, ($unitCost * (int) $item->quantity_sold) - (float) ($item->settlement_amount ?? 0));
            });
        $soldInwardPeriod = \App\Models\DealerItem::where('direction', 'inward')->where('quantity_sold', '>', 0)->whereBetween('sold_at', [$startDate, $endDate])->get();
        $consignmentGrossRevenue = (float) $soldInwardPeriod->sum(fn($i) => (float) ($i->retail_price ?? 0) * (int) $i->quantity_sold);
        $consignmentWholesaleCost = (float) $soldInwardPeriod->sum(fn($i) => (float) ($i->wholesale_cost ?: $i->dealer_price ?: 0) * (int) $i->quantity_sold);
        $consignmentNetProfit = max(0, $consignmentGrossRevenue - $consignmentWholesaleCost);
        $outwardIssuedCount = \App\Models\DealerItem::where(fn($q) => $q->where('direction', 'outward')->orWhereNull('direction'))->whereBetween('created_at', [$startDate, $endDate])->count();
        $outwardSoldCount = \App\Models\DealerItem::where(fn($q) => $q->where('direction', 'outward')->orWhereNull('direction'))->where('status', 'Sold')->whereBetween('sold_at', [$startDate, $endDate])->count();

        // Layaways Breakdown in Period
        $newLayawaysCount = Sale::where('payment_status', 'Partial')->whereBetween('created_at', [$startDate, $endDate])->count();
        $completedLayawaysCount = Sale::where('payment_method', 'Layaway')->where('payment_status', 'Paid')->whereBetween('updated_at', [$startDate, $endDate])->count();
        $activeLayaways = Sale::with('layawayPayments')->where('payment_status', 'Partial')->get();
        $activeLayawaysCount = $activeLayaways->count();
        $totalLayawayReceivable = (float) $activeLayaways->sum(function ($sale) {
            return max(0, $sale->final_amount - $sale->layawayPayments->sum('amount_paid'));
        });
        $layawayCollectedInPeriod = (float) \App\Models\LayawayPayment::whereBetween('payment_date', [$startDate, $endDate])->sum('amount_paid');

        // Expense & Payout Categories Breakdown in Period (separating Operating Overheads from Debt/Settlements/Refunds)
        $nonOperatingCategories = ['Dealer Settlement', 'Supplier Payment', 'Refund', 'Refund (Past Shift)', 'Cash In'];
        $operatingExpenses = (float) \App\Models\Expense::whereBetween('expense_date', [$startDate, $endDate])
            ->whereNotIn('category', $nonOperatingCategories)
            ->sum('amount');
        $settlementsAndRefunds = (float) \App\Models\Expense::whereBetween('expense_date', [$startDate, $endDate])
            ->whereIn('category', ['Dealer Settlement', 'Supplier Payment', 'Refund', 'Refund (Past Shift)'])
            ->sum('amount');
        $totalExpensesInPeriod = $operatingExpenses + $settlementsAndRefunds;
        $netOperatingProfit = $grossProfit - $operatingExpenses;

        $expenseCategories = \App\Models\Expense::whereBetween('expense_date', [$startDate, $endDate])
            ->where('category', '!=', 'Cash In')
            ->select('category as name', DB::raw('sum(amount) as value'))
            ->groupBy('category')
            ->orderByDesc('value')
            ->get();

        // Repairs Breakdown in Period
        $repairsLogged = Repair::whereBetween('created_at', [$startDate, $endDate])->count();

        // Staff Commission Payouts Ledger in Period
        $commissionPayouts = \App\Models\Expense::with(['user:id,name,role', 'paymentAccount:id,name', 'recordedBy:id,name'])
            ->where('category', 'Staff Commission')
            ->whereBetween('expense_date', [$startDate, $endDate])
            ->orderByDesc('expense_date')
            ->orderByDesc('id')
            ->limit(30)
            ->get();

        $paymentAccounts = \App\Models\PaymentAccount::where('is_active', true)
            ->where('is_personal', false)
            ->orderBy('id')
            ->get(['id', 'name', 'type', 'current_balance']);

        return Inertia::render('Reports/Index', [
            'period' => $period,
            'filters' => [
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'metrics' => [
                'totalRevenue' => $totalRevenue,
                'salesVolume' => $salesVolume,
                'cogs' => $cogs,
                'grossProfit' => $grossProfit,
                'operatingExpenses' => $operatingExpenses,
                'netOperatingProfit' => $netOperatingProfit,
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
                'operating' => $operatingExpenses,
                'settlements' => $settlementsAndRefunds,
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
            'cashierPerformance' => $cashierPerformance,
            'commissionPayouts' => $commissionPayouts,
            'paymentAccounts' => $paymentAccounts,
        ]);
    }

    public function payCommission(Request $request)
    {
        if (!(auth()->user()?->hasPermission('view_reports'))) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:1',
            'payment_account_id' => 'required|exists:payment_accounts,id',
            'notes' => 'nullable|string|max:500',
            'period_label' => 'nullable|string|max:100',
        ], [
            'payment_account_id.required' => 'Please select the business wallet paying this commission.',
        ]);

        $amount = (float) $validated['amount'];
        $staff = User::findOrFail($validated['user_id']);
        $accountName = '';

        DB::transaction(function () use ($validated, $amount, $staff, &$accountName) {
            $account = \App\Models\PaymentAccount::where('is_active', true)
                ->where('is_personal', false)
                ->lockForUpdate()
                ->findOrFail($validated['payment_account_id']);

            if ((float) $account->current_balance < $amount) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'amount' => "Insufficient funds in {$account->name}! Available balance is UGX " . number_format(max(0, (float) $account->current_balance)) . ".",
                ]);
            }

            $accountName = $account->name;
            $cashDrawerId = null;

            if ($account->type === 'cash' && stripos($account->name, 'Safe') === false) {
                $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                    ->where('status', 'open')
                    ->first();
                if ($activeDrawer) {
                    $cashDrawerId = $activeDrawer->id;
                }
            }

            $periodLabel = trim((string) ($validated['period_label'] ?? ''));
            $notes = trim((string) ($validated['notes'] ?? ''));
            $desc = "Sales commission payout to {$staff->name}"
                . ($periodLabel !== '' ? " ({$periodLabel})" : '')
                . ($notes !== '' ? " — {$notes}" : '');

            $expense = \App\Models\Expense::create([
                'cash_drawer_id' => $cashDrawerId,
                'payment_account_id' => $account->id,
                'user_id' => $staff->id,
                'recorded_by' => auth()->id(),
                'category' => 'Staff Commission',
                'amount' => $amount,
                'description' => $desc,
                'expense_date' => now(),
            ]);

            \App\Services\TreasuryService::recordOutflow(
                $account,
                $amount,
                'Staff Commission',
                $expense,
                $desc,
                $notes !== '' ? $notes : null,
                auth()->id()
            );

            \App\Models\ActivityLog::log(
                'staff_commission_paid',
                'Reports',
                "Paid UGX " . number_format($amount) . " sales commission to {$staff->name} from {$account->name}",
                ['staff_user_id' => $staff->id, 'amount' => $amount, 'payment_account_id' => $account->id]
            );
        });

        return redirect()->back()->with('success', "Paid UGX " . number_format($amount) . " commission to {$staff->name} from {$accountName}.");
    }

    /**
     * Dedicated Daily Owner Brief (Z-Report) Page (80mm Thermal & A4 Print + WhatsApp).
     */
    public function dailyZReportPage(Request $request)
    {
        if (!(auth()->user()?->hasPermission('view_reports'))) {
            abort(403, 'Unauthorized action. Daily Z-Report requires the View Reports permission.');
        }

        $report = $this->buildDailyZReportData($request);
        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS'),
            'store_logo' => \App\Models\Setting::getLogoUrl(),
            'shop_address' => \App\Models\Setting::get('shop_address', ''),
            'shop_phone' => \App\Models\Setting::get('shop_phone', ''),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
        ];

        return Inertia::render('Reports/DailyZReport', [
            'report' => $report,
            'settings' => $settings,
        ]);
    }

    /**
     * Daily Owner Brief (Z-Report) JSON API for any selected date.
     * SQLite & PostgreSQL compatible.
     */
    public function dailyZReport(Request $request)
    {
        if (!(auth()->user()?->hasPermission('view_reports'))) {
            abort(403, 'Unauthorized action. Daily Z-Report requires the View Reports permission.');
        }

        return response()->json($this->buildDailyZReportData($request));
    }

    private function buildDailyZReportData(Request $request): array
    {

        $dateStr = $request->query('date', Carbon::today()->format('Y-m-d'));
        try {
            $date = Carbon::parse($dateStr);
        } catch (\Throwable $e) {
            $date = Carbon::today();
        }
        $start = $date->copy()->startOfDay();
        $end = $date->copy()->endOfDay();

        // Direct sales (non-layaway, non-refunded for count; Paid + Refunded for revenue minus refunds)
        $daySales = Sale::with(['saleItems.deviceImei.product.brand', 'saleItems.product.brand', 'customer'])
            ->whereBetween('sale_date', [$start, $end])
            ->get();

        $nonRefundedSales = $daySales->where('payment_status', '!=', 'Refunded');
        $salesCount = $nonRefundedSales->count();
        $totalDiscounts = (float) $nonRefundedSales->sum('discount');

        $directSalesRevenue = (float) $daySales
            ->whereNull('repair_id')
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where('payment_method', '!=', 'Layaway')
            ->sum('final_amount');

        $repairSalesRevenue = (float) $daySales
            ->whereNotNull('repair_id')
            ->where('payment_status', 'Paid')
            ->sum('final_amount');

        $layawayPayments = \App\Models\LayawayPayment::whereBetween('payment_date', [$start, $end])->get();
        $layawayCollections = (float) $layawayPayments->sum('amount_paid');

        $invoicePayments = \App\Models\InvoicePayment::whereBetween('payment_date', [$start, $end])->get();
        $invoiceCollections = (float) $invoicePayments->sum('amount');

        $dayExpenses = \App\Models\Expense::whereBetween('expense_date', [$start, $end])->get();
        $refunds = (float) $dayExpenses->whereIn('category', ['Refund', 'Refund (Past Shift)'])->sum('amount');
        $operatingExpenses = (float) $dayExpenses
            ->whereNotIn('category', ['Cash In', 'Refund', 'Refund (Past Shift)', 'Dealer Settlement', 'Supplier Payment'])
            ->sum('amount');

        $totalRevenue = $directSalesRevenue + $repairSalesRevenue + $layawayCollections + $invoiceCollections - $refunds;

        // COGS & Phones Sold
        $cogs = 0.0;
        $phonesSold = [];
        foreach ($nonRefundedSales as $sale) {
            foreach ($sale->saleItems as $item) {
                if ($item->deviceImei) {
                    $cogs += (float) ($item->deviceImei->cost_price ?? 0);
                    $brand = $item->deviceImei->product?->brand?->name ?? '';
                    $model = $item->deviceImei->product?->model_name ?? 'Device';
                    $spec = trim(($item->deviceImei->storage_capacity ?? '') . ' ' . ($item->deviceImei->color ?? ''));
                    $phonesSold[] = [
                        'sale_id' => $sale->id,
                        'name' => trim("{$brand} {$model}" . ($spec ? " ({$spec})" : '')),
                        'imei' => $item->deviceImei->imei,
                        'price' => (float) $item->price,
                        'cost' => (float) ($item->deviceImei->cost_price ?? 0),
                    ];
                } elseif ($item->product) {
                    $cogs += (float) ($item->product->cost_price ?? 0) * (int) ($item->quantity ?? 1);
                }
            }
        }

        $grossProfit = $totalRevenue - $cogs;
        $netProfit = $grossProfit - $operatingExpenses;

        // Payment Method Breakdown (Direct Paid Sales + Layaway Collections + Invoice Collections)
        $methodTotals = [];
        foreach ($daySales->where('payment_status', 'Paid')->where('payment_method', '!=', 'Layaway') as $s) {
            $m = $s->payment_method ?: 'Cash';
            $methodTotals[$m] = ($methodTotals[$m] ?? 0) + (float) $s->final_amount;
        }
        foreach ($layawayPayments as $lp) {
            $m = ($lp->payment_method ?: 'Cash') . ' (Layaway)';
            $methodTotals[$m] = ($methodTotals[$m] ?? 0) + (float) $lp->amount_paid;
        }
        foreach ($invoicePayments as $ip) {
            $m = ($ip->payment_method ?: 'Cash') . ' (Invoice)';
            $methodTotals[$m] = ($methodTotals[$m] ?? 0) + (float) $ip->amount;
        }
        arsort($methodTotals);
        $paymentBreakdown = collect($methodTotals)->map(fn($amt, $method) => [
            'method' => $method,
            'amount' => (float) $amt,
        ])->values()->all();

        // Active Layaways Balance
        $activeLayawaysBalance = (float) Sale::withSum('layawayPayments', 'amount_paid')
            ->whereIn('payment_status', ['Unpaid', 'Partial'])
            ->get()
            ->sum(fn($s) => max(0, (float) $s->final_amount - (float) ($s->layaway_payments_sum_amount_paid ?? 0)));

        // Active Business Wallets
        $businessWallets = \App\Models\PaymentAccount::where('is_active', true)
            ->where('is_personal', false)
            ->orderBy('id')
            ->get(['id', 'name', 'type', 'current_balance']);
        $businessLiquidCash = (float) $businessWallets->sum('current_balance');

        // Cash Drawer Shifts for this date
        $shifts = \App\Models\CashDrawer::with('user:id,name')
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('opened_at', [$start, $end])
                  ->orWhereBetween('closed_at', [$start, $end]);
            })
            ->orderBy('opened_at', 'desc')
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'cashier' => $d->user?->name ?? 'Staff',
                'status' => $d->status,
                'starting_cash' => (float) ($d->starting_cash ?? 0),
                'expected_cash' => (float) ($d->expected_cash ?? 0),
                'actual_cash' => (float) ($d->actual_cash ?? 0),
                'variance' => $d->status === 'closed'
                    ? (float) ($d->actual_cash ?? 0) - (float) ($d->expected_cash ?? 0)
                    : 0.0,
            ])
            ->values()
            ->all();

        return [
            'date' => $date->format('Y-m-d'),
            'formatted_date' => $date->format('D, d M Y'),
            'sales_count' => $salesCount,
            'direct_sales_revenue' => $directSalesRevenue,
            'repair_sales_revenue' => $repairSalesRevenue,
            'layaway_collections' => $layawayCollections,
            'invoice_collections' => $invoiceCollections,
            'refunds' => $refunds,
            'total_discounts' => $totalDiscounts,
            'total_revenue' => $totalRevenue,
            'cogs' => $cogs,
            'gross_profit' => $grossProfit,
            'operating_expenses' => $operatingExpenses,
            'net_profit' => $netProfit,
            'payment_breakdown' => $paymentBreakdown,
            'phones_sold' => $phonesSold,
            'active_layaways_balance' => $activeLayawaysBalance,
            'business_liquid_cash' => $businessLiquidCash,
            'wallets' => $businessWallets,
            'shifts' => $shifts,
        ];
    }

    /**
     * Dedicated Executive Profit & Loss (P&L) Statement Page.
     */
    public function profitLoss(Request $request)
    {
        if (!(auth()->user()?->hasPermission('view_reports'))) {
            abort(403, 'Unauthorized action. Profit & Loss reports require the View Reports permission.');
        }

        $pnl = $this->buildProfitLossData($request);
        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS'),
            'store_logo' => \App\Models\Setting::getLogoUrl(),
            'shop_address' => \App\Models\Setting::get('shop_address', ''),
            'shop_phone' => \App\Models\Setting::get('shop_phone', ''),
            'shop_email' => \App\Models\Setting::get('shop_email', ''),
            'tin_number' => \App\Models\Setting::get('tin_number', ''),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
        ];

        return Inertia::render('Reports/ProfitLoss', [
            'pnl' => $pnl,
            'settings' => $settings,
        ]);
    }

    /**
     * Export Profit & Loss Statement to Excel-compatible CSV (UTF-8 BOM).
     */
    public function exportProfitLoss(Request $request)
    {
        if (!(auth()->user()?->hasPermission('view_reports'))) {
            abort(403, 'Unauthorized action.');
        }

        $pnl = $this->buildProfitLossData($request);
        $shopName = \App\Models\Setting::get('shop_name', 'SmartPOS');
        $currency = \App\Models\Setting::get('currency_symbol', 'UGX');
        $slug = \Illuminate\Support\Str::slug($shopName) ?: 'smartpos';
        $filename = "{$slug}_profit_loss_{$pnl['date_from']}_to_{$pnl['date_to']}.csv";

        $rows = [
            [$shopName . ' - Profit & Loss Statement (Income Statement)'],
            ['Period', $pnl['period_label'], 'Generated', now()->format('Y-m-d H:i')],
            [],
            ['Section', 'Line Item', "Amount ({$currency})", 'Notes / Margin'],
            ['1. REVENUE', 'Direct POS Sales Revenue', $pnl['revenue']['direct_sales'], ''],
            ['1. REVENUE', 'Repair Services Revenue', $pnl['revenue']['repair_sales'], ''],
            ['1. REVENUE', 'Layaway & Installment Collections', $pnl['revenue']['layaway_collections'], ''],
            ['1. REVENUE', 'Credit Invoice Collections', $pnl['revenue']['invoice_collections'], ''],
            ['1. REVENUE', 'Less: Customer Refunds & Returns', -$pnl['revenue']['refunds'], ''],
            ['1. REVENUE', 'NET REVENUE', $pnl['revenue']['net_revenue'], '100.0%'],
            [],
            ['2. COGS', 'Device Purchase Cost (Initial Cost)', $pnl['cogs']['device_purchase'], ''],
            ['2. COGS', 'Capitalized Refurbishment / Repair Costs', $pnl['cogs']['refurbishment'], ''],
            ['2. COGS', 'Bulk Accessories & Parts Cost', $pnl['cogs']['bulk_accessories'], ''],
            ['2. COGS', 'TOTAL COST OF GOODS SOLD (COGS)', $pnl['cogs']['total'], ''],
            ['SUMMARY', 'GROSS PROFIT', $pnl['gross_profit'], $pnl['gross_margin_pct'] . '% Gross Margin'],
            [],
        ];

        foreach ($pnl['expenses']['by_category'] as $exp) {
            $rows[] = ['3. OPERATING EXPENSES', $exp['category'], $exp['amount'], $exp['count'] . ' entry(ies)'];
        }
        $rows[] = ['3. OPERATING EXPENSES', 'TOTAL OPERATING EXPENSES', $pnl['expenses']['total_operating'], ''];
        $rows[] = ['SUMMARY', 'OPERATING PROFIT (EBITDA)', $pnl['operating_profit'], $pnl['operating_margin_pct'] . '% Operating Margin'];
        $rows[] = [];

        foreach ($pnl['partners']['breakdown'] as $pb) {
            $rows[] = ['4. PARTNER SHARE', $pb['name'] . ' (' . $pb['share_pct'] . '% share)', $pb['amount'], $pb['units'] . ' device(s)'];
        }
        $rows[] = ['4. PARTNER SHARE', 'LESS: TOTAL PARTNER PROFIT SHARE', -$pnl['partners']['total_share'], ''];
        $rows[] = [];
        $rows[] = ['NET INCOME', 'TRUE OWNER NET PROFIT', $pnl['true_owner_net_profit'], $pnl['net_margin_pct'] . '% Net Margin'];
        $rows[] = [];
        $rows[] = ['BALANCE SHEET SNAPSHOT', 'Business Liquid Cash (Excl. Personal)', $pnl['balance_sheet']['business_liquid_cash'], 'As of today'];
        $rows[] = ['BALANCE SHEET SNAPSHOT', 'Inventory Value at Cost (In Stock)', $pnl['balance_sheet']['inventory_value'], 'As of today'];
        $rows[] = ['BALANCE SHEET SNAPSHOT', 'Customer Receivables (Layaways + Invoices)', $pnl['balance_sheet']['receivables'], 'As of today'];
        $rows[] = ['BALANCE SHEET SNAPSHOT', 'Partner & Supplier Payables', $pnl['balance_sheet']['payables'], 'As of today'];

        $handle = fopen('php://temp', 'r+');
        fwrite($handle, "\xEF\xBB\xBF"); // UTF-8 BOM for clean Excel opening
        foreach ($rows as $line) {
            fputcsv($handle, $line);
        }
        rewind($handle);
        $csv = stream_get_contents($handle);
        fclose($handle);

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }

    private function buildProfitLossData(Request $request): array
    {
        $preset = $request->query('preset', 'this_month');
        $dateFrom = $request->query('date_from', '');
        $dateTo = $request->query('date_to', '');

        if ($request->filled('date_from') || $request->filled('date_to')) {
            $preset = 'custom';
            $start = $request->filled('date_from') ? Carbon::parse($dateFrom)->startOfDay() : Carbon::today()->startOfMonth();
            $end = $request->filled('date_to') ? Carbon::parse($dateTo)->endOfDay() : Carbon::now()->endOfDay();
            $periodLabel = $start->format('d M Y') . ' – ' . $end->format('d M Y');
        } else {
            switch ($preset) {
                case 'last_month':
                    $start = Carbon::now()->subMonthNoOverflow()->startOfMonth();
                    $end = Carbon::now()->subMonthNoOverflow()->endOfMonth();
                    $periodLabel = $start->format('F Y');
                    break;
                case 'this_quarter':
                    $start = Carbon::now()->startOfQuarter();
                    $end = Carbon::now()->endOfDay();
                    $periodLabel = 'Q' . Carbon::now()->quarter . ' ' . Carbon::now()->year . ' (YTD)';
                    break;
                case 'this_year':
                    $start = Carbon::now()->startOfYear();
                    $end = Carbon::now()->endOfDay();
                    $periodLabel = 'FY ' . Carbon::now()->year . ' (YTD)';
                    break;
                case 'all':
                    $start = Carbon::create(2020, 1, 1)->startOfDay();
                    $end = Carbon::now()->endOfDay();
                    $periodLabel = 'All Time (Through ' . $end->format('d M Y') . ')';
                    break;
                case 'this_month':
                default:
                    $preset = 'this_month';
                    $start = Carbon::now()->startOfMonth();
                    $end = Carbon::now()->endOfDay();
                    $periodLabel = $start->format('F Y') . ' (MTD)';
                    break;
            }
        }

        // 1. REVENUE
        $periodSales = Sale::with(['saleItems.deviceImei.partnerInvestor', 'saleItems.product'])
            ->whereBetween('sale_date', [$start, $end])
            ->get();

        $directSales = (float) $periodSales
            ->whereNull('repair_id')
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where('payment_method', '!=', 'Layaway')
            ->sum('final_amount');

        $repairSales = (float) $periodSales
            ->whereNotNull('repair_id')
            ->where('payment_status', 'Paid')
            ->sum('final_amount');

        $layawayCollections = (float) \App\Models\LayawayPayment::whereBetween('payment_date', [$start, $end])
            ->sum('amount_paid');

        $invoiceCollections = (float) \App\Models\InvoicePayment::whereBetween('payment_date', [$start, $end])
            ->sum('amount');

        $periodExpenses = \App\Models\Expense::whereBetween('expense_date', [$start, $end])->get();
        $refunds = (float) $periodExpenses->whereIn('category', ['Refund', 'Refund (Past Shift)'])->sum('amount');

        $netRevenue = $directSales + $repairSales + $layawayCollections + $invoiceCollections - $refunds;

        // 2. COGS (Purchase Cost + Capitalized Refurbishment + Bulk) & Partner Profit Share
        $devicePurchaseCogs = 0.0;
        $refurbishmentCogs = 0.0;
        $bulkCogs = 0.0;
        $partnerSharesMap = [];

        $nonRefundedSales = $periodSales->where('payment_status', '!=', 'Refunded');
        foreach ($nonRefundedSales as $sale) {
            foreach ($sale->saleItems as $item) {
                if ($item->deviceImei) {
                    $dev = $item->deviceImei;
                    $refurb = (float) ($dev->refurbishment_cost ?? 0);
                    $totalDevCost = (float) ($dev->cost_price ?? 0);
                    $initialCost = $dev->initial_cost_price !== null
                        ? (float) $dev->initial_cost_price
                        : max(0, $totalDevCost - $refurb);

                    $devicePurchaseCogs += $initialCost;
                    $refurbishmentCogs += $refurb;

                    // Partner Profit Share on fully Paid partner-funded sales
                    if ($sale->payment_status === 'Paid' && $dev->partner_investor_id && $dev->partnerInvestor) {
                        $p = $dev->partnerInvestor;
                        $unitProfit = max(0, (float) $item->price - $totalDevCost);
                        $sharePct = (float) ($p->profit_share_percentage ?? 0);
                        $partnerCut = $unitProfit * ($sharePct / 100);
                        if (!isset($partnerSharesMap[$p->id])) {
                            $partnerSharesMap[$p->id] = [
                                'name' => $p->name,
                                'share_pct' => $sharePct,
                                'units' => 0,
                                'amount' => 0.0,
                            ];
                        }
                        $partnerSharesMap[$p->id]['units'] += 1;
                        $partnerSharesMap[$p->id]['amount'] += $partnerCut;
                    }
                } elseif ($item->product) {
                    $bulkCogs += (float) ($item->product->cost_price ?? 0) * (int) ($item->quantity ?? 1);
                }
            }
        }

        $totalCogs = $devicePurchaseCogs + $refurbishmentCogs + $bulkCogs;
        $grossProfit = $netRevenue - $totalCogs;
        $grossMarginPct = $netRevenue > 0 ? round(($grossProfit / $netRevenue) * 100, 1) : 0.0;

        // 3. OPERATING EXPENSES (Itemized by category, strictly excluding non-operating items)
        $excludedCategories = ['Cash In', 'Refund', 'Refund (Past Shift)', 'Dealer Settlement', 'Supplier Payment'];
        $opExpenses = $periodExpenses->whereNotIn('category', $excludedCategories);
        $expensesByCategory = $opExpenses
            ->groupBy(fn($e) => $e->category ?: 'General Operating')
            ->map(fn($group, $cat) => [
                'category' => $cat,
                'count' => $group->count(),
                'amount' => (float) $group->sum('amount'),
            ])
            ->sortByDesc('amount')
            ->values()
            ->all();

        $totalOperatingExpenses = (float) $opExpenses->sum('amount');
        $operatingProfit = $grossProfit - $totalOperatingExpenses;
        $operatingMarginPct = $netRevenue > 0 ? round(($operatingProfit / $netRevenue) * 100, 1) : 0.0;

        // 4. PARTNER PROFIT ALLOCATION & TRUE OWNER NET PROFIT
        $partnerBreakdown = collect($partnerSharesMap)
            ->map(fn($r) => [
                'name' => $r['name'],
                'share_pct' => $r['share_pct'],
                'units' => $r['units'],
                'amount' => round($r['amount']),
            ])
            ->values()
            ->all();
        $totalPartnerShare = (float) collect($partnerBreakdown)->sum('amount');

        $trueOwnerNetProfit = $operatingProfit - $totalPartnerShare;
        $netMarginPct = $netRevenue > 0 ? round(($trueOwnerNetProfit / $netRevenue) * 100, 1) : 0.0;

        // 5. LIVE BALANCE SHEET SNAPSHOT (For Bank Loans / Financial Review)
        $businessLiquidCash = (float) \App\Models\PaymentAccount::where('is_active', true)
            ->where('is_personal', false)
            ->sum('current_balance');

        $inventoryValue = (float) DeviceImei::where('status', 'In Stock')->sum('cost_price')
            + (float) Product::where('type', 'bulk')->where('quantity', '>', 0)->sum(DB::raw('cost_price * quantity'));

        $layawayReceivables = (float) Sale::withSum('layawayPayments', 'amount_paid')
            ->whereIn('payment_status', ['Unpaid', 'Partial'])
            ->get()
            ->sum(fn($s) => max(0, (float) $s->final_amount - (float) ($s->layaway_payments_sum_amount_paid ?? 0)));

        $invoiceReceivables = (float) \App\Models\Invoice::whereIn('payment_status', ['Unpaid', 'Partial'])
            ->where('status', '!=', 'Cancelled')
            ->selectRaw('COALESCE(SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END), 0) as total')
            ->value('total');

        $supplierPayables = (float) \App\Models\Purchase::selectRaw('COALESCE(SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END), 0) as total')
            ->value('total');

        $partnerOwed = \App\Models\PartnerInvestor::with('transactions')->get()->sum(function ($p) {
            $s = $p->getPortfolioSummary();
            return ($s['in_stock_cost'] ?? 0) + ($s['cash_balance_available'] ?? 0);
        });

        return [
            'preset' => $preset,
            'date_from' => $start->format('Y-m-d'),
            'date_to' => $end->format('Y-m-d'),
            'period_label' => $periodLabel,
            'sales_count' => $nonRefundedSales->count(),
            'revenue' => [
                'direct_sales' => $directSales,
                'repair_sales' => $repairSales,
                'layaway_collections' => $layawayCollections,
                'invoice_collections' => $invoiceCollections,
                'refunds' => $refunds,
                'net_revenue' => $netRevenue,
            ],
            'cogs' => [
                'device_purchase' => $devicePurchaseCogs,
                'refurbishment' => $refurbishmentCogs,
                'bulk_accessories' => $bulkCogs,
                'total' => $totalCogs,
            ],
            'gross_profit' => $grossProfit,
            'gross_margin_pct' => $grossMarginPct,
            'expenses' => [
                'by_category' => $expensesByCategory,
                'total_operating' => $totalOperatingExpenses,
            ],
            'operating_profit' => $operatingProfit,
            'operating_margin_pct' => $operatingMarginPct,
            'partners' => [
                'breakdown' => $partnerBreakdown,
                'total_share' => $totalPartnerShare,
            ],
            'true_owner_net_profit' => $trueOwnerNetProfit,
            'net_margin_pct' => $netMarginPct,
            'balance_sheet' => [
                'business_liquid_cash' => $businessLiquidCash,
                'inventory_value' => $inventoryValue,
                'receivables' => $layawayReceivables + $invoiceReceivables,
                'payables' => $supplierPayables + $partnerOwed,
            ],
        ];
    }
}
