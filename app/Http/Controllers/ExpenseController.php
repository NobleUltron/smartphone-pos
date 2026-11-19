<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Expense;
use App\Models\CashDrawer;
use App\Models\User;
use App\Models\PaymentAccount;
use App\Models\AccountTransaction;
use App\Models\AccountTransfer;
use App\Services\TreasuryService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Carbon\Carbon;
use Inertia\Inertia;

class ExpenseController extends Controller
{
    private const PROTECTED_CATEGORIES = [
        'Dealer Settlement',
        'Supplier Payment',
        'Refund',
        'Refund (Past Shift)',
    ];

    public function index(Request $request)
    {
        $user = Auth::user();
        $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);

        $query = Expense::with(['user', 'cashDrawer', 'recordedBy', 'paymentAccount'])
            ->orderBy('expense_date', 'desc')
            ->orderBy('created_at', 'desc');

        // Cashiers only see their own expenses
        if (!$isAdminOrManager) {
            $query->where('user_id', $user->id);
        }

        // Search by description or category
        if ($request->filled('search')) {
            $search = '%' . strtolower(trim($request->input('search'))) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(COALESCE(description, \'\')) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(category) LIKE ?', [$search]);
            });
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
                'this_week' => $query->whereBetween('expense_date', [Carbon::now()->startOfWeek()->toDateString(), Carbon::now()->endOfWeek()->toDateString()]),
                'this_month'=> $query->whereBetween('expense_date', [Carbon::now()->startOfMonth()->toDateString(), Carbon::now()->endOfMonth()->toDateString()]),
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

        // Summary aggregates based on current filter & role scope
        $summaryQuery = clone $query;
        $baseScope = Expense::query();
        if (!$isAdminOrManager) {
            $baseScope->where('user_id', $user->id);
        }

        $nonOperating = array_merge(['Cash In'], self::PROTECTED_CATEGORIES);

        $todayTotal     = (float) (clone $baseScope)->whereDate('expense_date', Carbon::today())->where('category', '!=', 'Cash In')->sum('amount');
        $totalFiltered  = (float) (clone $summaryQuery)->where('category', '!=', 'Cash In')->sum('amount');
        $totalCashIns   = (float) (clone $summaryQuery)->where('category', 'Cash In')->sum('amount');
        $totalRefunds   = (float) (clone $summaryQuery)->whereIn('category', ['Refund', 'Refund (Past Shift)'])->sum('amount');
        $totalOperating = (float) (clone $summaryQuery)->whereNotIn('category', $nonOperating)->sum('amount');

        $topCategory = (clone $baseScope)->selectRaw('category, sum(amount) as total')
            ->whereDate('expense_date', '>=', Carbon::now()->startOfMonth())
            ->whereNotIn('category', $nonOperating)
            ->groupBy('category')
            ->orderByDesc('total')
            ->first();

        // Cashiers list for filter dropdown (admin/manager only)
        $cashiers = $isAdminOrManager
            ? User::select('id', 'name')->orderBy('name')->get()
            : [];

        $accounts = PaymentAccount::where('is_active', true)->orderBy('name')->get(['id', 'name', 'type', 'current_balance', 'provider']);

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
                'top_category_amt' => (float) ($topCategory?->total ?? 0),
            ],
            'filters'   => $request->only(['search', 'category', 'cashier_id', 'date_from', 'date_to', 'date_filter']),
            'categories' => [
                'Cash In', 'Shop Supplies', 'Meals / Food', 'Transport', 'Utilities',
                'Refund', 'Refund (Past Shift)', 'Dealer Settlement', 'Supplier Payment', 'Other'
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

        if (in_array($request->category, self::PROTECTED_CATEGORIES, true)) {
            return back()->withErrors(['category' => "System category '{$request->category}' cannot be logged manually."]);
        }

        $user = Auth::user();
        $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);
        $amount = floatval($request->amount);

        DB::transaction(function () use ($request, $user, $isAdminOrManager, $amount) {
            $activeDrawer = CashDrawer::where('user_id', $user->id)
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();

            $paymentAccountId = $request->input('payment_account_id');
            $tillAccount = TreasuryService::getTillAccount();
            $selectedAccount = $paymentAccountId
                ? PaymentAccount::where('id', (int) $paymentAccountId)->lockForUpdate()->first()
                : ($tillAccount ? PaymentAccount::where('id', $tillAccount->id)->lockForUpdate()->first() : null);

            if (!$selectedAccount && $tillAccount) {
                $selectedAccount = PaymentAccount::where('id', $tillAccount->id)->lockForUpdate()->first();
            }

            $isTill = $selectedAccount && ($selectedAccount->type === 'cash' && stripos($selectedAccount->name, 'Safe') === false);

            // Cashiers must have an open drawer for till expenses; admins can log without one
            if ($isTill && !$isAdminOrManager && !$activeDrawer) {
                throw ValidationException::withMessages([
                    'drawer' => 'You must have an open shift to log an expense from the cash till.',
                ]);
            }

            if ($isTill && $activeDrawer && $request->category !== 'Cash In') {
                $availableCash = $activeDrawer->calculateExpectedCash();
                if ($amount > $availableCash) {
                    throw ValidationException::withMessages([
                        'amount' => 'Insufficient cash in active drawer shift! Available cash is ' . number_format(max(0, $availableCash)) . ' UGX. Please add starting cash float or use Mobile Money / Bank Transfer.',
                    ]);
                }
            } elseif (!$isTill && $selectedAccount && $request->category !== 'Cash In') {
                if ($selectedAccount->current_balance < $amount) {
                    throw ValidationException::withMessages([
                        'amount' => "Insufficient balance in {$selectedAccount->name}! Available balance is UGX " . number_format($selectedAccount->current_balance) . ".",
                    ]);
                }
            }

            $sourceAccount = null;
            if ($request->category === 'Cash In' && $request->filled('source_account_id') && is_numeric($request->source_account_id)) {
                $sourceAccount = PaymentAccount::where('id', (int) $request->source_account_id)->lockForUpdate()->first();
                if ($sourceAccount && (int) $sourceAccount->id !== (int) $tillAccount?->id) {
                    if ($sourceAccount->current_balance < $amount) {
                        throw ValidationException::withMessages([
                            'source_account_id' => "Insufficient balance in {$sourceAccount->name}! Available balance is UGX " . number_format($sourceAccount->current_balance) . ".",
                        ]);
                    }
                }
            }

            // Build description with source account reference if selected
            $finalDescription = $request->description;
            if ($request->category === 'Cash In' && $sourceAccount && (int) $sourceAccount->id !== (int) $tillAccount?->id) {
                $prefix = "From {$sourceAccount->name}";
                $finalDescription = $request->description ? "{$prefix} - {$request->description}" : $prefix;
            }

            $expense = Expense::create([
                'cash_drawer_id'     => $isTill ? $activeDrawer?->id : null,
                'payment_account_id' => $request->category === 'Cash In' ? $tillAccount?->id : ($selectedAccount?->id ?? $tillAccount?->id),
                'user_id'            => $user->id,
                'recorded_by'        => $user->id,
                'amount'             => $amount,
                'category'           => $request->category,
                'description'        => $finalDescription,
                'expense_date'       => Carbon::today(),
            ]);

            // Sync with Treasury Service
            if ($request->category === 'Cash In') {
                if ($sourceAccount && $tillAccount && (int) $sourceAccount->id !== (int) $tillAccount->id) {
                    $notes = "Shift #" . ($activeDrawer ? $activeDrawer->id : 'N/A') . " Float Addition" . ($request->description ? " ({$request->description})" : '');
                    TreasuryService::transfer(
                        (int) $sourceAccount->id,
                        (int) $tillAccount->id,
                        $amount,
                        $notes,
                        $user->id
                    );
                } else {
                    TreasuryService::recordInflow(
                        'Cash',
                        $amount,
                        'Cash In Float',
                        $expense,
                        $finalDescription ?: 'Drawer float addition',
                        'EXP-' . $expense->id,
                        $user->id
                    );
                }
            } else {
                TreasuryService::recordOutflow(
                    $selectedAccount,
                    $amount,
                    'Expense',
                    $expense,
                    "Expense: {$request->category}" . ($request->description ? " - {$request->description}" : ''),
                    'EXP-' . $expense->id,
                    $user->id
                );
            }

            \App\Models\ActivityLog::log(
                $request->category === 'Cash In' ? 'cash_in_logged' : 'expense_created',
                'Expenses',
                ($request->category === 'Cash In' ? 'Logged Cash In float' : "Logged Expense ({$request->category})") . " of UGX " . number_format($amount),
                ['expense_id' => $expense->id, 'category' => $request->category, 'amount' => $amount]
            );
        });

        return back()->with('success', $request->category === 'Cash In' ? 'Cash In float added successfully.' : 'Expense logged successfully.');
    }

    public function update(Request $request, Expense $expense)
    {
        $user = Auth::user();
        if (!in_array(strtolower($user->role), ['admin', 'manager'])) {
            abort(403, 'Only managers can edit expenses.');
        }

        if (in_array($expense->category, self::PROTECTED_CATEGORIES, true)) {
            return back()->withErrors(['category' => "System-generated '{$expense->category}' entries must be managed from their source module (Dealers, Suppliers, or Receipts)."]);
        }

        $request->validate([
            'amount'      => 'required|numeric|min:0.01',
            'category'    => 'required|string',
            'description' => 'nullable|string|max:500',
        ]);

        if (in_array($request->category, self::PROTECTED_CATEGORIES, true)) {
            return back()->withErrors(['category' => "Cannot change an expense into protected system category '{$request->category}'."]);
        }

        // Prevent flipping between Cash In (inflow) and regular Expense (outflow)
        $wasCashIn = $expense->category === 'Cash In';
        $isCashIn = $request->category === 'Cash In';
        if ($wasCashIn !== $isCashIn) {
            return back()->withErrors(['category' => 'Cannot switch between Cash In (inflow) and Expense (outflow). Delete and re-log the entry instead.']);
        }

        DB::transaction(function () use ($request, $expense, $user) {
            $lockedExpense = Expense::where('id', $expense->id)->lockForUpdate()->firstOrFail();
            $oldAmount = (float) $lockedExpense->amount;
            $newAmount = floatval($request->amount);
            $diff = $newAmount - $oldAmount;

            $trx = AccountTransaction::where('reference_type', Expense::class)
                ->where('reference_id', $lockedExpense->id)
                ->lockForUpdate()
                ->first();

            if ($trx) {
                $account = PaymentAccount::where('id', $trx->payment_account_id)->lockForUpdate()->first();
                if ($account) {
                    if ($trx->type === 'outflow' && $diff > 0 && $account->current_balance < $diff) {
                        throw ValidationException::withMessages([
                            'amount' => "Insufficient balance in {$account->name} to increase expense by UGX " . number_format($diff) . ".",
                        ]);
                    }
                    if ($trx->type === 'inflow') {
                        $account->increment('current_balance', $diff);
                    } elseif ($trx->type === 'outflow') {
                        $account->decrement('current_balance', $diff);
                    }
                }

                $trx->update([
                    'amount' => $newAmount,
                    'category' => $request->category === 'Cash In' ? 'Cash In Float' : 'Expense',
                    'description' => $request->description ?: "Expense: {$request->category}",
                ]);
            }

            $lockedExpense->update([
                'amount'      => $newAmount,
                'category'    => $request->category,
                'description' => $request->description,
                'recorded_by' => $user->id,
            ]);

            \App\Models\ActivityLog::log(
                'expense_updated',
                'Expenses',
                "Updated Expense #{$lockedExpense->id} ({$request->category}) from UGX " . number_format($oldAmount) . " to UGX " . number_format($newAmount),
                ['expense_id' => $lockedExpense->id, 'old_amount' => $oldAmount, 'new_amount' => $newAmount]
            );
        });

        return back()->with('success', 'Expense updated successfully.');
    }

    public function destroy(Expense $expense)
    {
        $user = Auth::user();
        $isAdminOrManager = in_array(strtolower($user->role), ['admin', 'manager']);

        if (in_array($expense->category, self::PROTECTED_CATEGORIES, true)) {
            return back()->withErrors(['error' => "System-generated '{$expense->category}' entries cannot be deleted directly here. Reverse them in their source module."]);
        }

        // Cashiers can only delete their own same-day expenses that aren't system-generated
        if (!$isAdminOrManager) {
            $systemCategories = ['Refund', 'Refund (Past Shift)', 'Cash In'];
            if ((int) $expense->user_id !== (int) $user->id
                || Carbon::parse($expense->expense_date)->toDateString() !== Carbon::today()->toDateString()
                || in_array($expense->category, $systemCategories, true)) {
                abort(403, 'You cannot delete this expense.');
            }
        }

        DB::transaction(function () use ($expense) {
            $lockedExpense = Expense::where('id', $expense->id)->lockForUpdate()->firstOrFail();

            // Reverse linked AccountTransaction before deleting expense
            $trx = AccountTransaction::where('reference_type', Expense::class)
                ->where('reference_id', $lockedExpense->id)
                ->lockForUpdate()
                ->first();

            if ($trx) {
                $account = PaymentAccount::where('id', $trx->payment_account_id)->lockForUpdate()->first();
                if ($account) {
                    if ($trx->type === 'inflow') {
                        $account->decrement('current_balance', $trx->amount);
                    } elseif ($trx->type === 'outflow') {
                        $account->increment('current_balance', $trx->amount);
                    }
                }
                $trx->delete();
            }

            // If it was a Cash In funded by an inter-account transfer, reverse the transfer
            if ($lockedExpense->category === 'Cash In' && str_starts_with($lockedExpense->description ?? '', 'From ')) {
                $tillAccount = TreasuryService::getTillAccount();
                $transfer = AccountTransfer::where('to_account_id', $tillAccount?->id)
                    ->where('amount', $lockedExpense->amount)
                    ->whereDate('created_at', $lockedExpense->expense_date ?? $lockedExpense->created_at)
                    ->lockForUpdate()
                    ->first();

                if ($transfer) {
                    $txs = AccountTransaction::where('reference_type', AccountTransfer::class)
                        ->where('reference_id', $transfer->id)
                        ->lockForUpdate()
                        ->get();
                    foreach ($txs as $t) {
                        $acct = PaymentAccount::where('id', $t->payment_account_id)->lockForUpdate()->first();
                        if ($acct) {
                            if ($t->type === 'transfer_in') {
                                $acct->decrement('current_balance', $t->amount);
                            } elseif ($t->type === 'transfer_out') {
                                $acct->increment('current_balance', $t->amount);
                            }
                        }
                        $t->delete();
                    }
                    $transfer->delete();
                }
            }

            \App\Models\ActivityLog::log(
                'expense_deleted',
                'Expenses',
                "Deleted Expense #{$lockedExpense->id} ({$lockedExpense->category}) of UGX " . number_format($lockedExpense->amount),
                ['expense_id' => $lockedExpense->id, 'category' => $lockedExpense->category, 'amount' => (float) $lockedExpense->amount]
            );

            $lockedExpense->delete();
        });

        return back()->with('success', 'Expense deleted.');
    }

    public function export(Request $request)
    {
        $user = Auth::user();
        if (!in_array(strtolower($user->role), ['admin', 'manager'])) {
            abort(403);
        }

        $query = Expense::with(['user', 'cashDrawer', 'paymentAccount'])
            ->orderBy('expense_date', 'desc');

        if ($request->filled('search')) {
            $search = '%' . strtolower(trim($request->input('search'))) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(COALESCE(description, \'\')) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(category) LIKE ?', [$search]);
            });
        }
        if ($request->filled('category') && $request->input('category') !== 'all') {
            $query->where('category', $request->input('category'));
        }
        if ($request->filled('cashier_id') && $request->input('cashier_id') !== 'all') {
            $query->where('user_id', $request->input('cashier_id'));
        }
        if ($request->filled('date_filter')) {
            match ($request->input('date_filter')) {
                'today'     => $query->whereDate('expense_date', Carbon::today()),
                'yesterday' => $query->whereDate('expense_date', Carbon::yesterday()),
                'this_week' => $query->whereBetween('expense_date', [Carbon::now()->startOfWeek()->toDateString(), Carbon::now()->endOfWeek()->toDateString()]),
                'this_month'=> $query->whereBetween('expense_date', [Carbon::now()->startOfMonth()->toDateString(), Carbon::now()->endOfMonth()->toDateString()]),
                default     => null,
            };
        } else {
            if ($request->filled('date_from')) {
                $query->whereDate('expense_date', '>=', $request->input('date_from'));
            }
            if ($request->filled('date_to')) {
                $query->whereDate('expense_date', '<=', $request->input('date_to'));
            }
        }

        $expenses = $query->get();

        $filename = 'expenses-export-' . now()->format('Ymd-Hi') . '.xlsx';

        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\ExpensesExport($expenses), $filename);
    }
}
