<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Expense;
use App\Models\CashDrawer;
use App\Models\User;
use App\Models\PaymentAccount;
use App\Services\TreasuryService;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);

        $query = Expense::with(['user', 'cashDrawer', 'recordedBy'])
            ->orderBy('expense_date', 'desc')
            ->orderBy('created_at', 'desc');

        // Cashiers only see their own expenses
        if (!$isAdminOrManager) {
            $query->where('user_id', $user->id);
        }

        // Search by description
        if ($request->filled('search')) {
            $query->where('description', 'like', '%' . $request->input('search') . '%');
        }

        // Filter by category
        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        // Filter by cashier
        if ($request->filled('cashier_id') && $request->input('cashier_id') !== 'all') {
            $query->where('user_id', $request->input('cashier_id'));
        }

        // Filter by date range or quick preset
        if ($request->filled('date_filter')) {
            match ($request->input('date_filter')) {
                'today'     => $query->whereDate('expense_date', Carbon::today()),
                'yesterday' => $query->whereDate('expense_date', Carbon::yesterday()),
                'this_week' => $query->whereBetween('expense_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]),
                'this_month'=> $query->whereMonth('expense_date', Carbon::now()->month)->whereYear('expense_date', Carbon::now()->year),
                default     => null,
            };
        } elseif ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('expense_date', [$request->input('date_from'), $request->input('date_to')]);
        } elseif ($request->filled('date_from')) {
            $query->whereDate('expense_date', '>=', $request->input('date_from'));
        } elseif ($request->filled('date_to')) {
            $query->whereDate('expense_date', '<=', $request->input('date_to'));
        }

        $expenses = $query->paginate(15)->withQueryString();

        // Summary aggregates based on current filter
        $summaryQuery = clone $query;
        $todayTotal       = Expense::whereDate('expense_date', Carbon::today())->where('category', '!=', 'Cash In')->sum('amount');
        $totalFiltered    = (clone $summaryQuery)->where('category', '!=', 'Cash In')->sum('amount');
        $totalCashIns     = (clone $summaryQuery)->where('category', 'Cash In')->sum('amount');
        $totalRefunds     = (clone $summaryQuery)->whereIn('category', ['Refund', 'Refund (Past Shift)'])->sum('amount');
        $totalOperating   = (clone $summaryQuery)->whereNotIn('category', ['Cash In', 'Refund', 'Refund (Past Shift)'])->sum('amount');

        $topCategory = Expense::selectRaw('category, sum(amount) as total')
            ->groupBy('category')
            ->where('category', '!=', 'Cash In')
            ->orderByDesc('total')
            ->first();

        // Cashiers list for filter dropdown (admin/manager only)
        $cashiers = $isAdminOrManager
            ? User::select('id', 'name')->orderBy('name')->get()
            : [];

        $accounts = PaymentAccount::where('is_active', true)->get(['id', 'name', 'type', 'current_balance', 'provider']);

        return Inertia::render('Expenses/Index', [
            'expenses'  => $expenses,
            'cashiers'  => $cashiers,
            'summary'   => [
                'today_total'      => $todayTotal,
                'filtered_total'   => $totalFiltered,
                'cash_ins'         => $totalCashIns,
                'refunds'          => $totalRefunds,
                'operating'        => $totalOperating,
                'top_category'     => $topCategory?->category,
                'top_category_amt' => $topCategory?->total ?? 0,
            ],
            'filters'   => $request->only(['search', 'category', 'cashier_id', 'date_from', 'date_to', 'date_filter']),
            'categories' => [
                'Cash In', 'Shop Supplies', 'Meals / Food', 'Transport', 'Utilities',
                'Refund', 'Refund (Past Shift)', 'Other'
            ],
            'is_admin_or_manager' => $isAdminOrManager,
            'accounts'            => $accounts,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'amount'            => 'required|numeric|min:0.01',
            'category'          => 'required|string',
            'description'       => 'nullable|string|max:500',
            'source_account_id' => 'nullable|string',
        ]);

        $user = Auth::user();
        $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);

        $activeDrawer = CashDrawer::where('user_id', $user->id)
            ->where('status', 'open')
            ->first();

        // Cashiers must have an open drawer; admins can log without one
        if (!$isAdminOrManager && !$activeDrawer) {
            return back()->withErrors(['drawer' => 'You must have an open shift to log an expense.']);
        }

        if ($activeDrawer && $request->category !== 'Cash In') {
            $availableCash = $activeDrawer->calculateExpectedCash();
            if ($request->amount > $availableCash) {
                return back()->withErrors([
                    'amount' => 'Insufficient cash in active drawer shift! Available cash is ' . number_format(max(0, $availableCash)) . ' UGX. Please add starting cash float or use Mobile Money / Bank Transfer.'
                ]);
            }
        }

        $sourceAccount = null;
        $cashAccount = PaymentAccount::getForMethod('Cash');
        if ($request->category === 'Cash In' && $request->filled('source_account_id') && is_numeric($request->source_account_id)) {
            $sourceAccount = PaymentAccount::find($request->source_account_id);
        }

        // Build description with source account reference if selected
        $finalDescription = $request->description;
        if ($request->category === 'Cash In' && $sourceAccount && (int)$sourceAccount->id !== (int)$cashAccount?->id) {
            $prefix = "From {$sourceAccount->name}";
            $finalDescription = $request->description ? "{$prefix} - {$request->description}" : $prefix;
        }

        $expense = Expense::create([
            'cash_drawer_id' => $activeDrawer?->id,
            'user_id'        => $user->id,
            'recorded_by'    => $user->id,
            'amount'         => $request->amount,
            'category'       => $request->category,
            'description'    => $finalDescription,
            'expense_date'   => Carbon::today(),
        ]);

        // Sync with Treasury Service
        if ($request->category === 'Cash In') {
            if ($sourceAccount && (int)$sourceAccount->id !== (int)$cashAccount?->id) {
                // Inter-account transfer: Source Account (e.g. Airtel/MTN/Bank/Safe) -> Main Cash Register
                $notes = "Shift #" . ($activeDrawer ? $activeDrawer->id : 'N/A') . " Float Addition" . ($request->description ? " ({$request->description})" : '');
                TreasuryService::transfer(
                    (int) $sourceAccount->id,
                    (int) $cashAccount->id,
                    floatval($request->amount),
                    $notes,
                    $user->id
                );
            } else {
                // External cash injection / direct inflow into cash
                TreasuryService::recordInflow(
                    'Cash',
                    floatval($request->amount),
                    'Cash In Float',
                    $expense,
                    $finalDescription ?: 'Drawer float addition',
                    null,
                    $user->id
                );
            }
        } else {
            TreasuryService::recordOutflow(
                'Cash',
                floatval($request->amount),
                'Expense',
                $expense,
                "Expense: {$request->category}" . ($request->description ? " - {$request->description}" : ''),
                null,
                $user->id
            );
        }

        return back()->with('success', $request->category === 'Cash In' ? 'Cash In float added successfully.' : 'Expense logged successfully.');
    }

    public function update(Request $request, Expense $expense)
    {
        $user = Auth::user();
        if (!in_array(strtolower($user->role), ['admin', 'manager'])) {
            abort(403, 'Only managers can edit expenses.');
        }

        $request->validate([
            'amount'      => 'required|numeric|min:0.01',
            'category'    => 'required|string',
            'description' => 'nullable|string|max:500',
        ]);

        $expense->update([
            'amount'      => $request->amount,
            'category'    => $request->category,
            'description' => $request->description,
            'recorded_by' => $user->id,
        ]);

        return back()->with('success', 'Expense updated successfully.');
    }

    public function destroy(Expense $expense)
    {
        $user = Auth::user();
        $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);

        // Cashiers can only delete their own same-day expenses that aren't system-generated
        if (!$isAdminOrManager) {
            $systemCategories = ['Refund', 'Refund (Past Shift)', 'Cash In'];
            if ((int)$expense->user_id !== (int)$user->id
                || Carbon::parse($expense->expense_date)->toDateString() !== Carbon::today()->toDateString()
                || in_array($expense->category, $systemCategories)) {
                abort(403, 'You cannot delete this expense.');
            }
        }

        $expense->delete();

        return back()->with('success', 'Expense deleted.');
    }

    public function export(Request $request)
    {
        $user = Auth::user();
        if (!in_array(strtolower($user->role), ['admin', 'manager'])) {
            abort(403);
        }

        $query = Expense::with(['user', 'cashDrawer'])
            ->orderBy('expense_date', 'desc');

        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }
        if ($request->filled('cashier_id') && $request->input('cashier_id') !== 'all') {
            $query->where('user_id', $request->input('cashier_id'));
        }
        if ($request->filled('date_from')) {
            $query->whereDate('expense_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('expense_date', '<=', $request->input('date_to'));
        }

        $expenses = $query->get();

        $filename = 'expenses-export-' . now()->format('Ymd-Hi') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ExpensesExport($expenses), $filename);
    }
}
