<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Expense;
use App\Models\CashDrawer;
use App\Models\User;
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

        // Category filter
        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }

        // Cashier filter (admin/manager only)
        if ($isAdminOrManager && $request->filled('cashier_id') && $request->input('cashier_id') !== 'all') {
            $query->where('user_id', $request->input('cashier_id'));
        }

        // Date range filter
        if ($request->filled('date_from')) {
            $query->whereDate('expense_date', '>=', $request->input('date_from'));
        }
        if ($request->filled('date_to')) {
            $query->whereDate('expense_date', '<=', $request->input('date_to'));
        }

        // Single date shortcut
        if ($request->filled('date_filter')) {
            switch ($request->input('date_filter')) {
                case 'today':
                    $query->whereDate('expense_date', Carbon::today());
                    break;
                case 'yesterday':
                    $query->whereDate('expense_date', Carbon::yesterday());
                    break;
                case 'this_week':
                    $query->whereBetween('expense_date', [Carbon::now()->startOfWeek(), Carbon::now()->endOfWeek()]);
                    break;
                case 'this_month':
                    $query->whereMonth('expense_date', Carbon::now()->month)
                          ->whereYear('expense_date', Carbon::now()->year);
                    break;
            }
        }

        // Summary stats (on filtered query, before pagination)
        $summaryQuery = clone $query;
        $totalFiltered    = (clone $summaryQuery)->where('category', '!=', 'Cash In')->sum('amount');
        $totalCashIns     = (clone $summaryQuery)->where('category', 'Cash In')->sum('amount');
        $totalRefunds     = (clone $summaryQuery)->where(function($q){ $q->where('category','Refund')->orWhere('category','Refund (Past Shift)'); })->sum('amount');
        $totalOperating   = (clone $summaryQuery)->whereNotIn('category', ['Cash In', 'Refund', 'Refund (Past Shift)'])->sum('amount');

        // Today's total (unfiltered scope)
        $todayQuery = Expense::whereDate('expense_date', Carbon::today())
            ->where('category', '!=', 'Cash In');
        if (!$isAdminOrManager) $todayQuery->where('user_id', $user->id);
        $todayTotal = $todayQuery->sum('amount');

        // Top category this month
        $topCategory = Expense::whereMonth('expense_date', Carbon::now()->month)
            ->whereYear('expense_date', Carbon::now()->year)
            ->whereNotIn('category', ['Cash In', 'Refund', 'Refund (Past Shift)'])
            ->when(!$isAdminOrManager, fn($q) => $q->where('user_id', $user->id))
            ->selectRaw('category, SUM(amount) as total')
            ->groupBy('category')
            ->orderByDesc('total')
            ->first();

        $expenses = $query->paginate(15)->withQueryString();

        // Cashiers list for filter (admin/manager only)
        $cashiers = $isAdminOrManager
            ? User::whereIn('role', ['cashier', 'admin', 'manager'])->orderBy('name')->get(['id', 'name'])
            : [];

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
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'amount'      => 'required|numeric|min:0.01',
            'category'    => 'required|string',
            'description' => 'nullable|string|max:500',
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

        if ($activeDrawer) {
            $availableCash = $activeDrawer->calculateExpectedCash();
            if ($request->amount > $availableCash) {
                return back()->withErrors([
                    'amount' => 'Insufficient cash in active drawer shift! Available cash is ' . number_format(max(0, $availableCash)) . ' UGX. Please add starting cash float or use Mobile Money / Bank Transfer.'
                ]);
            }
        }

        Expense::create([
            'cash_drawer_id' => $activeDrawer?->id,
            'user_id'        => $user->id,
            'recorded_by'    => $user->id,
            'amount'         => $request->amount,
            'category'       => $request->category,
            'description'    => $request->description,
            'expense_date'   => Carbon::today(),
        ]);

        return back()->with('success', 'Expense logged successfully.');
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
