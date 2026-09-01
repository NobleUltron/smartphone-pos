<?php

namespace App\Http\Controllers;

use App\Models\PaymentAccount;
use App\Models\AccountTransaction;
use App\Models\AccountTransfer;
use App\Models\Setting;
use App\Services\TreasuryService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class AccountController extends Controller
{
    public function __construct()
    {
        TreasuryService::ensureDefaultAccounts();
    }

    public function index(Request $request)
    {
        $accounts = PaymentAccount::withCount('transactions')->get();

        $totalLiquidity = (float) $accounts->sum('current_balance');
        $cashOnHand = (float) $accounts->where('type', 'cash')->sum('current_balance');
        $mobileMoneyTotal = (float) $accounts->where('type', 'mobile_money')->sum('current_balance');
        $bankTotal = (float) $accounts->where('type', 'bank')->sum('current_balance');

        $query = AccountTransaction::with(['account', 'user']);

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
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'ilike', "%{$search}%")
                  ->orWhere('transaction_reference', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('Accounts/Index', [
            'accounts' => $accounts,
            'metrics' => [
                'totalLiquidity' => $totalLiquidity,
                'cashOnHand' => $cashOnHand,
                'mobileMoneyTotal' => $mobileMoneyTotal,
                'bankTotal' => $bankTotal,
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
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'ilike', "%{$search}%")
                  ->orWhere('transaction_reference', 'ilike', "%{$search}%");
            });
        }

        if ($request->filled('date_from')) {
            $query->whereDate('transaction_date', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('transaction_date', '<=', $request->date_to);
        }

        $transactions = $query->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(20)
            ->withQueryString();

        $allAccounts = PaymentAccount::where('id', '!=', $account->id)->where('is_active', true)->get();

        // 30-day inflow vs outflow trends
        $days = collect(range(0, 29))->map(function ($i) use ($account) {
            $date = Carbon::today()->subDays($i)->format('Y-m-d');
            $inflows = (float) $account->transactions()->whereDate('transaction_date', $date)->whereIn('type', ['inflow', 'transfer_in'])->sum('amount');
            $outflows = (float) $account->transactions()->whereDate('transaction_date', $date)->whereIn('type', ['outflow', 'transfer_out'])->sum('amount');
            return [
                'date' => Carbon::parse($date)->format('d M'),
                'inflows' => $inflows,
                'outflows' => $outflows,
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:cash,mobile_money,bank,other',
            'account_number' => 'nullable|string|max:255',
            'provider' => 'nullable|string|max:255',
            'opening_balance' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $openingBalance = (float) ($validated['opening_balance'] ?? 0);

        $account = PaymentAccount::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'account_number' => $validated['account_number'] ?? null,
            'provider' => $validated['provider'] ?? null,
            'opening_balance' => $openingBalance,
            'current_balance' => $openingBalance,
            'is_active' => true,
            'description' => $validated['description'] ?? null,
        ]);

        if ($openingBalance > 0) {
            AccountTransaction::create([
                'payment_account_id' => $account->id,
                'type' => 'inflow',
                'amount' => $openingBalance,
                'balance_after' => $openingBalance,
                'category' => 'Opening Balance',
                'description' => 'Initial account opening float balance',
                'user_id' => auth()->id(),
                'transaction_date' => now(),
            ]);
        }

        return redirect()->back()->with('success', "Payment account {$account->name} created successfully.");
    }

    public function update(Request $request, PaymentAccount $account)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'account_number' => 'nullable|string|max:255',
            'provider' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $account->update($validated);

        return redirect()->back()->with('success', 'Account details updated successfully.');
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
                $validated['from_account_id'],
                $validated['to_account_id'],
                (float) $validated['amount'],
                $validated['notes'] ?? ''
            );

            return redirect()->back()->with('success', 'Inter-account transfer completed successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['amount' => $e->getMessage()]);
        }
    }

    public function reconcile(PaymentAccount $account, Request $request)
    {
        $validated = $request->validate([
            'actual_balance' => 'required|numeric|min:0',
            'reason' => 'nullable|string|max:255',
        ]);

        try {
            TreasuryService::reconcile(
                $account->id,
                (float) $validated['actual_balance'],
                $validated['reason'] ?? ''
            );

            return redirect()->back()->with('success', "Account balance audited and reconciled to UGX " . number_format($validated['actual_balance']));
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
}
