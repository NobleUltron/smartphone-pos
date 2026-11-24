<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\CashDrawer;
use App\Models\Sale;
use App\Models\Expense;
use App\Models\PaymentAccount;
use App\Models\User;
use App\Services\TreasuryService;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashDrawerController extends Controller
{
    public function index()
    {
        $activeDrawer = CashDrawer::with(['expenses' => fn ($q) => $q->orderBy('created_at', 'desc')])
            ->where('user_id', Auth::id())
            ->where('status', 'open')
            ->first();

        // Calculate expected cash and sales across all payment channels if a drawer is open
        if ($activeDrawer) {
            $activeDrawer->calculated_expected = $activeDrawer->calculateExpectedCash();

            $cashSales = (float) Sale::where('cash_drawer_id', $activeDrawer->id)
                ->whereNull('repair_id')
                ->where('payment_method', 'Cash')
                ->whereIn('payment_status', ['Paid', 'Refunded'])
                ->sum('final_amount');
                
            $layawayCash = (float) \App\Models\LayawayPayment::where('cash_drawer_id', $activeDrawer->id)
                ->where('payment_method', 'Cash')
                ->sum('amount_paid');

            $cashRefunds = (float) $activeDrawer->expenses
                ->whereIn('category', ['Refund', 'Refund (Past Shift)'])
                ->sum('amount');

            $momoSales = (float) Sale::where('cash_drawer_id', $activeDrawer->id)
                ->whereNull('repair_id')
                ->whereIn('payment_method', ['MTN MoMo', 'MoMo'])
                ->whereIn('payment_status', ['Paid'])
                ->sum('final_amount')
                + (float) \App\Models\LayawayPayment::where('cash_drawer_id', $activeDrawer->id)
                ->whereIn('payment_method', ['MTN MoMo', 'MoMo'])
                ->sum('amount_paid');

            $airtelSales = (float) Sale::where('cash_drawer_id', $activeDrawer->id)
                ->whereNull('repair_id')
                ->where('payment_method', 'Airtel Money')
                ->whereIn('payment_status', ['Paid'])
                ->sum('final_amount')
                + (float) \App\Models\LayawayPayment::where('cash_drawer_id', $activeDrawer->id)
                ->where('payment_method', 'Airtel Money')
                ->sum('amount_paid');

            $bankSales = (float) Sale::where('cash_drawer_id', $activeDrawer->id)
                ->whereNull('repair_id')
                ->whereIn('payment_method', ['Bank Transfer', 'Card'])
                ->whereIn('payment_status', ['Paid'])
                ->sum('final_amount')
                + (float) \App\Models\LayawayPayment::where('cash_drawer_id', $activeDrawer->id)
                ->whereIn('payment_method', ['Bank Transfer', 'Card'])
                ->sum('amount_paid');

            $totalSalesCount = Sale::where('cash_drawer_id', $activeDrawer->id)
                ->where('payment_status', '!=', 'Refunded')
                ->count();

            $activeDrawer->cash_sales = $cashSales + $layawayCash;
            $activeDrawer->cash_refunds = $cashRefunds;
            $activeDrawer->momo_sales = $momoSales;
            $activeDrawer->airtel_sales = $airtelSales;
            $activeDrawer->bank_sales = $bankSales;
            $activeDrawer->total_shift_sales = max(0, ($cashSales + $layawayCash - $cashRefunds)) + $momoSales + $airtelSales + $bankSales;
            $activeDrawer->total_sales_count = $totalSalesCount;

            $openedAt = Carbon::parse($activeDrawer->opened_at);
            $activeDrawer->hours_open = round($openedAt->diffInMinutes(now()) / 60, 1);
            $activeDrawer->is_stale = $openedAt->diffInHours(now()) >= 24;
        }

        $accounts = PaymentAccount::where('is_active', true)->where('is_personal', false)->get(['id', 'name', 'type', 'current_balance', 'provider']);

        return Inertia::render('CashDrawer/Index', [
            'activeDrawer' => $activeDrawer,
            'accounts'     => $accounts,
        ]);
    }

    public function open(Request $request)
    {
        $request->validate([
            'starting_cash'     => 'required|numeric|min:0',
            'source_account_id' => 'nullable|string',
        ]);

        $startingCash = floatval($request->starting_cash);
        $sourceId = $request->source_account_id;

        DB::transaction(function () use ($startingCash, $sourceId) {
            // Lock check to prevent concurrent double-open shifts
            $existing = CashDrawer::where('user_id', Auth::id())
                ->where('status', 'open')
                ->lockForUpdate()
                ->exists();

            if ($existing) {
                throw ValidationException::withMessages([
                    'starting_cash' => 'You already have an open shift.',
                ]);
            }

            $sourceAccount = null;
            $tillAccount = TreasuryService::getTillAccount();

            // 1. If user claims cash was already in the register till, verify the register has that balance on the books
            if ($startingCash > 0 && ($sourceId === 'existing' || empty($sourceId))) {
                $lockedTill = $tillAccount ? PaymentAccount::where('id', $tillAccount->id)->lockForUpdate()->first() : null;
                $tillBalance = floatval($lockedTill?->current_balance ?? 0);
                if ($tillBalance < $startingCash) {
                    throw ValidationException::withMessages([
                        'source_account_id' => "Cannot claim UGX " . number_format($startingCash) . " is 'Already in Register' because the register balance on the books is only UGX " . number_format($tillBalance) . ". Please select Shop Safe or External Cash Injection to avoid ghost money.",
                    ]);
                }
            }

            // 2. If user selected a funding account (e.g. Shop Safe), verify it has sufficient balance
            if ($startingCash > 0 && $sourceId && $sourceId !== 'existing' && $sourceId !== 'external') {
                if (is_numeric($sourceId) && (int) $sourceId !== (int) $tillAccount?->id) {
                    $sourceAccount = PaymentAccount::where('id', (int) $sourceId)->lockForUpdate()->first();
                    if (!$sourceAccount) {
                        throw ValidationException::withMessages([
                            'source_account_id' => 'Selected funding account was not found.',
                        ]);
                    }
                    if ($sourceAccount->current_balance < $startingCash) {
                        throw ValidationException::withMessages([
                            'source_account_id' => "Insufficient balance in {$sourceAccount->name}! Available balance is UGX " . number_format($sourceAccount->current_balance) . ".",
                        ]);
                    }
                }
            }

            $drawer = CashDrawer::create([
                'user_id'       => Auth::id(),
                'starting_cash' => $startingCash,
                'status'        => 'open',
                'opened_at'     => Carbon::now(),
            ]);

            if ($startingCash > 0 && $sourceId && $sourceId !== 'existing') {
                if ($sourceId === 'external') {
                    TreasuryService::recordInflow(
                        'Cash',
                        $startingCash,
                        'Opening Float',
                        $drawer,
                        "Opening shift float for Shift #{$drawer->id} (External funds)",
                        null,
                        Auth::id()
                    );
                } elseif ($sourceAccount && $tillAccount && (int) $sourceAccount->id !== (int) $tillAccount->id) {
                    TreasuryService::transfer(
                        (int) $sourceAccount->id,
                        (int) $tillAccount->id,
                        $startingCash,
                        "Opening shift float for Shift #{$drawer->id} from {$sourceAccount->name}",
                        Auth::id()
                    );
                }
            }

            \App\Models\ActivityLog::log(
                'shift_opened',
                'Cash Drawer',
                "Opened Shift #{$drawer->id} with starting float UGX " . number_format($startingCash),
                [
                    'cash_drawer_id' => $drawer->id,
                    'starting_cash' => $startingCash,
                    'source_account_id' => $sourceId,
                ]
            );
        });

        return back()->with('success', 'Shift opened successfully.');
    }

    public function close(Request $request)
    {
        $request->validate([
            'actual_cash'      => 'required|numeric|min:0',
            'deposit_to_safe'  => 'nullable|boolean',
            'deposit_amount'   => 'nullable|numeric|min:0',
            'notes'            => 'nullable|string|max:500',
        ]);

        $actualCash = floatval($request->actual_cash);
        $shouldDeposit = $request->has('deposit_to_safe')
            ? filter_var($request->deposit_to_safe, FILTER_VALIDATE_BOOLEAN)
            : true;

        $depositAmount = $request->filled('deposit_amount')
            ? floatval($request->deposit_amount)
            : $actualCash;

        if ($shouldDeposit && $depositAmount > $actualCash) {
            throw ValidationException::withMessages([
                'deposit_amount' => 'Safe deposit amount cannot exceed the actual counted cash (UGX ' . number_format($actualCash) . ').',
            ]);
        }

        $safeDropMessage = null;

        DB::transaction(function () use ($request, $actualCash, $shouldDeposit, $depositAmount, &$safeDropMessage) {
            $activeDrawer = CashDrawer::where('user_id', Auth::id())
                ->where('status', 'open')
                ->lockForUpdate()
                ->first();

            if (!$activeDrawer) {
                throw ValidationException::withMessages([
                    'actual_cash' => 'No active open shift found to close.',
                ]);
            }

            $expectedCash = (float) $activeDrawer->calculateExpectedCash();
            $difference = $actualCash - $expectedCash;

            $activeDrawer->update([
                'expected_cash' => $expectedCash,
                'actual_cash'   => $actualCash,
                'difference'    => $difference,
                'status'        => 'closed',
                'closed_at'     => Carbon::now(),
            ]);

            $depositedToSafe = 0;
            if ($shouldDeposit && $depositAmount > 0) {
                $safeAccount = TreasuryService::getSafeAccount();
                $tillAccount = TreasuryService::getTillAccount();

                if ($safeAccount && $tillAccount && (int) $safeAccount->id !== (int) $tillAccount->id) {
                    $notes = "Shift #{$activeDrawer->id} End-of-Shift Cash Drop to Safe" . ($request->notes ? " - {$request->notes}" : '');
                    TreasuryService::transfer(
                        (int) $tillAccount->id,
                        (int) $safeAccount->id,
                        $depositAmount,
                        $notes,
                        Auth::id()
                    );
                    $depositedToSafe = $depositAmount;
                    $safeDropMessage = "Shift closed successfully. UGX " . number_format($depositAmount) . " deposited into {$safeAccount->name}.";
                }
            }

            \App\Models\ActivityLog::log(
                'shift_closed',
                'Cash Drawer',
                "Closed Shift #{$activeDrawer->id} — Expected: UGX " . number_format($expectedCash) . ", Counted: UGX " . number_format($actualCash) . ", Variance: " . ($difference >= 0 ? '+' : '') . number_format($difference),
                [
                    'cash_drawer_id' => $activeDrawer->id,
                    'expected_cash' => $expectedCash,
                    'actual_cash' => $actualCash,
                    'difference' => $difference,
                    'deposited_to_safe' => $depositedToSafe,
                    'notes' => $request->notes,
                ]
            );
        });

        return back()->with('success', $safeDropMessage ?? 'Shift closed successfully.');
    }

    public function history(Request $request)
    {
        $user = Auth::user();
        $isManager = in_array(strtolower($user->role ?? ''), ['admin', 'manager']);
        $status = $request->input('status', 'all');
        $userId = $request->input('user_id', '');

        $query = CashDrawer::with('user')->orderBy('opened_at', 'desc');

        // Cashiers and non-admins only see their own shift history; admins/managers see all
        if (!$isManager) {
            $query->where('user_id', $user->id);
        } elseif ($userId !== '' && is_numeric($userId)) {
            $query->where('user_id', (int) $userId);
        }

        if (in_array($status, ['open', 'closed'], true)) {
            $query->where('status', $status);
        }

        $drawers = $query->paginate(10)->withQueryString();

        $cashiers = $isManager
            ? User::orderBy('name')->get(['id', 'name'])
            : collect();

        return Inertia::render('CashDrawer/History', [
            'drawers' => $drawers,
            'cashiers' => $cashiers,
            'isManager' => $isManager,
            'filters' => [
                'status' => $status,
                'user_id' => $userId,
            ],
        ]);
    }
}
