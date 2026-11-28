<?php

namespace App\Http\Controllers;

use App\Models\PaymentAccount;
use App\Models\AccountTransaction;
use App\Models\AccountTransfer;
use App\Models\DeviceImei;
use App\Models\Product;
use App\Models\PartnerInvestor;
use App\Models\Setting;
use App\Services\TreasuryService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class AccountController extends Controller
{
    public function __construct()
    {
        \Illuminate\Support\Facades\Cache::remember('default_accounts_ensured', 3600, function () {
            TreasuryService::ensureDefaultAccounts();
            return true;
        });
    }

    public function callAction($method, $parameters)
    {
        if (!(auth()->user()?->hasPermission('manage_accounts'))) {
            abort(403, 'You do not have permission to access Money & Accounts.');
        }

        return $this->{$method}(...array_values($parameters));
    }

    public function index(Request $request)
    {
        // Lazy auto-backfill if no transactions exist yet
        if (AccountTransaction::count() === 0) {
            TreasuryService::syncHistorical();
        }

        $canViewPersonal = auth()->user()?->hasPermission('view_personal_accounts') ?? false;

        $accountsQuery = PaymentAccount::withCount('transactions')
            ->where('is_active', true);

        if (!$canViewPersonal) {
            $accountsQuery->where('is_personal', false);
        }

        $accounts = $accountsQuery
            ->orderBy('is_personal')
            ->orderBy('type')
            ->orderBy('id')
            ->get();

        $businessAccounts = $accounts->where('is_personal', false);
        $personalAccounts = $accounts->where('is_personal', true);

        $totalLiquidity = (float) $businessAccounts->sum('current_balance');
        $cashOnHand = (float) $businessAccounts->where('type', 'cash')->sum('current_balance');
        $mobileMoneyTotal = (float) $businessAccounts->where('type', 'mobile_money')->sum('current_balance');
        $bankTotal = (float) $businessAccounts->where('type', 'bank')->sum('current_balance');
        $personalReserveTotal = (float) $personalAccounts->sum('current_balance');

        // Inventory Stock Valuation at Cost (Lower of cost or net realizable value principle)
        $serializedStockCost = (float) DeviceImei::where('status', 'In Stock')->sum('cost_price');
        $bulkStockCost = (float) Product::where('type', 'bulk')->where('quantity', '>', 0)->sum(DB::raw('cost_price * quantity'));
        $totalStockCost = $serializedStockCost + $bulkStockCost;

        $serializedCount = DeviceImei::where('status', 'In Stock')->count();
        $bulkCount = (int) Product::where('type', 'bulk')->where('quantity', '>', 0)->sum('quantity');
        $totalStockCount = $serializedCount + $bulkCount;

        $totalBusinessCapital = $totalLiquidity + $totalStockCost;

        // Partner & Family Capital Metrics
        $partnerInvestors = PartnerInvestor::where('is_active', true)->get();
        $partnerSummaries = $partnerInvestors->map(fn($p) => $p->getPortfolioSummary());
        $partnerFundsTotal = (float) $partnerSummaries->sum('total_deposits');
        $partnerStockCost = (float) $partnerSummaries->sum('in_stock_cost');
        $partnerCashAvailable = (float) $partnerSummaries->sum('cash_balance_available');
        $partnerPortfolioValue = (float) $partnerSummaries->sum('total_portfolio_value');
        $partnersCount = $partnerInvestors->count();

        // Owner Equity & Combined Net Worth (Business Wallets + Stock + Personal Reserve - Partner Owed)
        $ownerBusinessCash = $totalLiquidity - $partnerCashAvailable;
        $ownerStockCost = $totalStockCost - $partnerStockCost;
        $ownerBusinessEquity = $totalBusinessCapital - $partnerPortfolioValue;
        $ownerNetWorth = $ownerBusinessEquity + $personalReserveTotal;

        // Receivables & Payables Visibility
        $layawayReceivables = (float) \App\Models\Sale::withSum('layawayPayments', 'amount_paid')
            ->whereIn('payment_status', ['Unpaid', 'Partial'])
            ->get()
            ->sum(fn($s) => max(0, (float) $s->final_amount - (float) ($s->layaway_payments_sum_amount_paid ?? 0)));
        $invoiceReceivables = (float) \App\Models\Invoice::whereIn('payment_status', ['Unpaid', 'Partial'])
            ->where('status', '!=', 'Cancelled')
            ->selectRaw('COALESCE(SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END), 0) as total')
            ->value('total');
        $supplierCredits = (float) \App\Models\Supplier::sum('credit_balance');
        $totalReceivables = $layawayReceivables + $invoiceReceivables + $supplierCredits;

        $supplierPayables = (float) \App\Models\Purchase::where('status', '!=', 'Cancelled')
            ->selectRaw('COALESCE(SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END), 0) as total')
            ->value('total');
        $dealerPayables = (float) \App\Models\DealerItem::where('direction', 'inward')
            ->where('quantity_sold', '>', 0)
            ->selectRaw("COALESCE(SUM(CASE WHEN (quantity_sold * COALESCE(NULLIF(wholesale_cost, 0), dealer_price, 0) - COALESCE(settlement_amount, 0)) > 0 THEN (quantity_sold * COALESCE(NULLIF(wholesale_cost, 0), dealer_price, 0) - COALESCE(settlement_amount, 0)) ELSE 0 END), 0) as total")
            ->value('total');
        $totalPayables = $supplierPayables + $dealerPayables;
        $adjustedNetWorth = $ownerNetWorth + $totalReceivables - $totalPayables;

        $query = AccountTransaction::with(['account', 'user']);

        if (!$canViewPersonal) {
            $query->whereHas('account', fn($q) => $q->where('is_personal', false));
        }

        if ($request->filled('account_id') && $request->account_id !== 'all') {
            $query->where('payment_account_id', $request->account_id);
        }

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(description) LIKE ?', ["%{$search}%"])
                  ->orWhereRaw('LOWER(transaction_reference) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $filteredInflows = (float) (clone $query)->whereIn('type', ['inflow', 'transfer_in'])->sum('amount');
        $filteredOutflows = (float) (clone $query)->whereIn('type', ['outflow', 'transfer_out'])->sum('amount');

        $categories = AccountTransaction::select('category')
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->pluck('category');

        $perPage = max(10, min(100, (int) $request->input('per_page', 15)));
        $transactions = $query->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        return Inertia::render('Accounts/Index', [
            'accounts' => $accounts,
            'categories' => $categories,
            'metrics' => [
                'totalLiquidity' => $totalLiquidity,
                'cashOnHand' => $cashOnHand,
                'mobileMoneyTotal' => $mobileMoneyTotal,
                'bankTotal' => $bankTotal,
                'stockCost' => $totalStockCost,
                'serializedStockCost' => $serializedStockCost,
                'bulkStockCost' => $bulkStockCost,
                'stockCount' => $totalStockCount,
                'serializedCount' => $serializedCount,
                'bulkCount' => $bulkCount,
                'totalBusinessCapital' => $totalBusinessCapital,
                'personalReserveTotal' => $personalReserveTotal,
                'personalAccountsCount' => $personalAccounts->count(),
                'partnerFundsTotal' => $partnerFundsTotal,
                'partnerStockCost' => $partnerStockCost,
                'partnerCashAvailable' => $partnerCashAvailable,
                'partnerPortfolioValue' => $partnerPortfolioValue,
                'partnersCount' => $partnersCount,
                'ownerBusinessCash' => $ownerBusinessCash,
                'ownerStockCost' => $ownerStockCost,
                'ownerBusinessEquity' => $ownerBusinessEquity,
                'ownerNetWorth' => $ownerNetWorth,
                'layawayReceivables' => $layawayReceivables,
                'invoiceReceivables' => $invoiceReceivables,
                'supplierCredits' => $supplierCredits,
                'totalReceivables' => $totalReceivables,
                'supplierPayables' => $supplierPayables,
                'dealerPayables' => $dealerPayables,
                'totalPayables' => $totalPayables,
                'adjustedNetWorth' => $adjustedNetWorth,
                'filteredInflows' => $filteredInflows,
                'filteredOutflows' => $filteredOutflows,
            ],
            'transactions' => $transactions,
            'filters' => $request->only(['account_id', 'type', 'category', 'search', 'date_from', 'date_to']),
        ]);
    }

    public function show(PaymentAccount $account, Request $request)
    {
        $query = $account->transactions()->with(['user']);

        if ($request->filled('type') && $request->type !== 'all') {
            $query->where('type', $request->type);
        }

        if ($request->filled('category') && $request->category !== 'all') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = strtolower($request->search);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(description) LIKE ?', ["%{$search}%"])
                  ->orWhereRaw('LOWER(transaction_reference) LIKE ?', ["%{$search}%"]);
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $perPage = max(10, min(100, (int) $request->input('per_page', 20)));
        $transactions = $query->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        $allAccounts = PaymentAccount::where('id', '!=', $account->id)->where('is_active', true)->get();

        // 30-day inflow vs outflow trends (optimized into 2 aggregate queries instead of 60 individual queries)
        $thirtyDaysAgo = Carbon::today()->subDays(29)->startOfDay();

        $inflowAggregates = AccountTransaction::where('payment_account_id', $account->id)
            ->where('transaction_date', '>=', $thirtyDaysAgo)
            ->whereIn('type', ['inflow', 'transfer_in'])
            ->selectRaw("DATE(transaction_date) as tx_date, SUM(amount) as total")
            ->groupByRaw("DATE(transaction_date)")
            ->pluck('total', 'tx_date');

        $outflowAggregates = AccountTransaction::where('payment_account_id', $account->id)
            ->where('transaction_date', '>=', $thirtyDaysAgo)
            ->whereIn('type', ['outflow', 'transfer_out'])
            ->selectRaw("DATE(transaction_date) as tx_date, SUM(amount) as total")
            ->groupByRaw("DATE(transaction_date)")
            ->pluck('total', 'tx_date');

        $days = collect(range(0, 29))->map(function ($i) use ($inflowAggregates, $outflowAggregates) {
            $date = Carbon::today()->subDays($i)->format('Y-m-d');
            return [
                'date' => Carbon::parse($date)->format('d M'),
                'inflows' => (float) ($inflowAggregates[$date] ?? 0),
                'outflows' => (float) ($outflowAggregates[$date] ?? 0),
            ];
        })->reverse()->values();

        return Inertia::render('Accounts/Show', [
            'account' => $account,
            'allAccounts' => $allAccounts,
            'transactions' => $transactions,
            'trends' => $days,
            'filters' => $request->only(['type', 'category', 'search', 'date_from', 'date_to']),
        ]);
    }

    public function syncHistorical()
    {
        try {
            TreasuryService::syncHistorical();
            return redirect()->back()->with('success', 'Historical transactions successfully synchronized across all payment accounts!');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['sync' => $e->getMessage()]);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'type' => 'required|string|in:cash,mobile_money,bank,other',
            'account_number' => 'nullable|string|max:100',
            'provider' => 'nullable|string|max:100',
            'opening_balance' => 'nullable|numeric|min:0',
            'is_personal' => 'nullable|boolean',
            'description' => 'nullable|string|max:255',
        ]);

        $account = PaymentAccount::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'account_number' => $validated['account_number'] ?? null,
            'provider' => $validated['provider'] ?? null,
            'opening_balance' => $validated['opening_balance'] ?? 0,
            'current_balance' => 0, // Will be set to opening_balance by recordInflow below if > 0
            'is_personal' => (bool) ($validated['is_personal'] ?? false),
            'description' => $validated['description'] ?? null,
            'is_active' => true,
        ]);

        if (($validated['opening_balance'] ?? 0) > 0) {
            TreasuryService::recordInflow(
                $account,
                (float) $validated['opening_balance'],
                'Opening Balance',
                null,
                'Initial opening balance for new account',
                'INIT-' . $account->id,
                auth()->id()
            );
        }

        return redirect()->back()->with('success', "Payment account '{$account->name}' created successfully.");
    }

    public function update(PaymentAccount $account, Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'account_number' => 'nullable|string|max:100',
            'provider' => 'nullable|string|max:100',
            'description' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'is_personal' => 'boolean',
        ]);

        $account->update($validated);

        return redirect()->back()->with('success', "Account '{$account->name}' details updated.");
    }

    public function transfer(Request $request)
    {
        $validated = $request->validate([
            'from_account_id' => 'required|exists:payment_accounts,id',
            'to_account_id' => 'required|exists:payment_accounts,id|different:from_account_id',
            'amount' => 'required|numeric|min:1',
            'notes' => 'nullable|string|max:255',
        ]);

        try {
            TreasuryService::transfer(
                (int) $validated['from_account_id'],
                (int) $validated['to_account_id'],
                (float) $validated['amount'],
                $validated['notes'] ?? '',
                auth()->id()
            );

            return redirect()->back()->with('success', 'Transfer completed successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['transfer' => $e->getMessage()]);
        }
    }

    public function recordTransaction(PaymentAccount $account, Request $request)
    {
        if ($account->is_personal && !(auth()->user()?->hasPermission('view_personal_accounts'))) {
            abort(403, 'You do not have permission to access owner personal accounts.');
        }

        $validated = $request->validate([
            'type' => 'required|in:deposit,withdrawal',
            'amount' => 'required|numeric|min:1',
            'description' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:100',
        ]);

        $amount = floatval($validated['amount']);
        $isDeposit = $validated['type'] === 'deposit';

        DB::transaction(function () use ($account, $validated, $amount, $isDeposit) {
            $lockedAccount = PaymentAccount::where('id', $account->id)->lockForUpdate()->firstOrFail();

            if (!$isDeposit && floatval($lockedAccount->current_balance) < $amount) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'amount' => "Insufficient balance in {$lockedAccount->name}. Available: UGX " . number_format($lockedAccount->current_balance) . ".",
                ]);
            }

            if ($lockedAccount->is_personal) {
                $category = $isDeposit ? 'Personal Deposit' : 'Personal Withdrawal';
                $defaultDesc = $isDeposit
                    ? "Personal (non-business) deposit into {$lockedAccount->name}"
                    : "Personal withdrawal from {$lockedAccount->name}";
            } else {
                $category = $isDeposit ? 'Capital Injection' : 'Owner Withdrawal';
                $defaultDesc = $isDeposit
                    ? "External capital injection into {$lockedAccount->name}"
                    : "Owner withdrawal from {$lockedAccount->name}";
            }

            $desc = !empty($validated['description'])
                ? trim($validated['description'])
                : $defaultDesc;
            $ref = !empty($validated['reference']) ? trim($validated['reference']) : null;

            if ($isDeposit) {
                TreasuryService::recordInflow(
                    $lockedAccount,
                    $amount,
                    $category,
                    $lockedAccount,
                    $desc,
                    $ref,
                    auth()->id()
                );
            } else {
                TreasuryService::recordOutflow(
                    $lockedAccount,
                    $amount,
                    $category,
                    $lockedAccount,
                    $desc,
                    $ref,
                    auth()->id()
                );
            }

            \App\Models\ActivityLog::log(
                $isDeposit ? 'account_deposit' : 'account_withdrawal',
                'Accounts',
                "{$category} of UGX " . number_format($amount) . ($isDeposit ? ' into ' : ' from ') . $lockedAccount->name,
                [
                    'payment_account_id' => $lockedAccount->id,
                    'is_personal' => (bool) $lockedAccount->is_personal,
                    'type' => $validated['type'],
                    'amount' => $amount,
                    'category' => $category,
                ]
            );
        });

        $label = $account->is_personal
            ? ($isDeposit ? 'Personal deposit' : 'Personal withdrawal')
            : ($isDeposit ? 'Deposit' : 'Withdrawal');

        return redirect()->back()->with('success', "{$label} of UGX " . number_format($amount) . " recorded for {$account->name}.");
    }

    public function reconcile(PaymentAccount $account, Request $request)
    {
        $validated = $request->validate([
            'actual_balance' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:255',
        ]);

        try {
            $priorBalance = (float) $account->current_balance;
            $variance = (float) $validated['actual_balance'] - $priorBalance;

            TreasuryService::reconcile(
                $account->id,
                (float) $validated['actual_balance'],
                $validated['reason'] ?? ''
            );

            if ($variance == 0) {
                $msg = "Account balance verified: Physical balance matches system balance of UGX " . number_format($validated['actual_balance']);
            } else {
                $formattedVariance = ($variance > 0 ? "+" : "") . number_format($variance) . " UGX";
                $msg = "Account balance audited and reconciled to UGX " . number_format($validated['actual_balance']) . " (Variance: {$formattedVariance})";
            }

            return redirect()->back()->with('success', $msg);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['actual_balance' => $e->getMessage()]);
        }
    }

    public function statement(PaymentAccount $account, Request $request)
    {
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $outputMode = $request->query('mode', 'stream');

        $query = $account->transactions()->with('user');

        if ($startDate) {
            $query->whereDate('transaction_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('transaction_date', '<=', $endDate);
        }

        $transactions = $query->orderBy('transaction_date', 'asc')->get();

        $totalInflows = (float) $transactions->whereIn('type', ['inflow', 'transfer_in'])->sum('amount');
        $totalOutflows = (float) $transactions->whereIn('type', ['outflow', 'transfer_out'])->sum('amount');

        $settings = [
            'shop_name' => Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => Setting::getLogoUrl(),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => Setting::get('shop_phone', '+256 700 000 000'),
            'shop_email' => Setting::get('shop_email', 'info@smartpos.com'),
            'currency_symbol' => Setting::get('currency_symbol', 'UGX'),
        ];

        $pdf = Pdf::loadView('pdf.account_statement', compact(
            'account', 'transactions', 'totalInflows', 'totalOutflows', 'settings', 'startDate', 'endDate'
        ))->setPaper('a4', 'portrait');

        $filename = 'account-statement-' . \Str::slug($account->name) . '-' . now()->format('Ymd') . '.pdf';

        if ($outputMode === 'download') {
            return $pdf->download($filename);
        }

        return $pdf->stream($filename);
    }

    public function destroy(PaymentAccount $account)
    {
        // Protected core accounts cannot be deleted
        $protectedNames = ['Main Cash Register', 'Shop Safe (Master Cash)'];
        if (in_array($account->name, $protectedNames)) {
            return redirect()->back()->withErrors(['delete' => 'Cannot delete system-critical cash account.']);
        }

        if (abs($account->current_balance) > 0.01) {
            return redirect()->back()->withErrors(['delete' => "Cannot delete account '{$account->name}' with a non-zero balance (UGX " . number_format($account->current_balance) . "). Transfer funds first or deactivate."]);
        }

        if ($account->transactions()->count() > 0) {
            // Soft-deactivate if it has ledger history
            $account->update(['is_active' => false]);
            return redirect()->back()->with('success', "Account '{$account->name}' has been archived / deactivated.");
        }

        $account->delete();
        return redirect()->route('accounts.index')->with('success', "Account '{$account->name}' deleted successfully.");
    }
}
