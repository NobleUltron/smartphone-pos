<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use App\Models\PaymentAccount;
use App\Models\AccountTransaction;
use App\Models\Sale;
use App\Models\LayawayPayment;
use App\Models\Expense;
use App\Services\TreasuryService;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Ensure default accounts exist
        TreasuryService::ensureDefaultAccounts();

        $cashAccount = PaymentAccount::where('type', 'cash')->first() ?? PaymentAccount::first();

        // 2. Backfill Paid POS Sales
        $sales = Sale::where('payment_status', 'Paid')
            ->where('payment_method', '!=', 'Layaway')
            ->where('final_amount', '>', 0)
            ->get();

        foreach ($sales as $sale) {
            $exists = AccountTransaction::where('reference_type', Sale::class)
                ->where('reference_id', $sale->id)
                ->exists();

            if (!$exists) {
                $account = PaymentAccount::getForMethod($sale->payment_method) ?? $cashAccount;

                AccountTransaction::create([
                    'payment_account_id' => $account->id,
                    'type' => 'inflow',
                    'amount' => $sale->final_amount,
                    'balance_after' => 0, // Will be computed in bulk pass
                    'category' => 'Sale',
                    'reference_type' => Sale::class,
                    'reference_id' => $sale->id,
                    'transaction_reference' => 'POS-' . $sale->id,
                    'description' => "POS Sale #{$sale->id}" . ($sale->customer ? " (" . ($sale->customer->name ?? 'Customer') . ")" : ''),
                    'user_id' => $sale->user_id,
                    'transaction_date' => $sale->created_at ?? now(),
                ]);
            }
        }

        // 3. Backfill Layaway Payments & Deposits
        $layawayPayments = LayawayPayment::where('amount_paid', '>', 0)->get();

        foreach ($layawayPayments as $payment) {
            $exists = AccountTransaction::where('reference_type', LayawayPayment::class)
                ->where('reference_id', $payment->id)
                ->exists();

            if (!$exists) {
                $account = PaymentAccount::getForMethod($payment->payment_method) ?? $cashAccount;

                AccountTransaction::create([
                    'payment_account_id' => $account->id,
                    'type' => 'inflow',
                    'amount' => $payment->amount_paid,
                    'balance_after' => 0,
                    'category' => 'Layaway Payment',
                    'reference_type' => LayawayPayment::class,
                    'reference_id' => $payment->id,
                    'transaction_reference' => 'LAY-' . $payment->id,
                    'description' => "Layaway Installment for Sale #{$payment->sale_id}",
                    'user_id' => $payment->sale?->user_id ?? $payment->user_id,
                    'transaction_date' => $payment->payment_date ?? $payment->created_at ?? now(),
                ]);
            }
        }

        // 4. Backfill Expenses and Cash Ins
        $expenses = Expense::where('amount', '>', 0)->get();

        foreach ($expenses as $expense) {
            $exists = AccountTransaction::where('reference_type', Expense::class)
                ->where('reference_id', $expense->id)
                ->exists();

            if (!$exists) {
                $isInflow = $expense->category === 'Cash In';

                AccountTransaction::create([
                    'payment_account_id' => $cashAccount->id,
                    'type' => $isInflow ? 'inflow' : 'outflow',
                    'amount' => $expense->amount,
                    'balance_after' => 0,
                    'category' => $isInflow ? 'Cash In Float' : ($expense->category ?: 'Expense'),
                    'reference_type' => Expense::class,
                    'reference_id' => $expense->id,
                    'transaction_reference' => 'EXP-' . $expense->id,
                    'description' => $expense->description ?: "Expense: {$expense->category}",
                    'user_id' => $expense->user_id ?? $expense->recorded_by,
                    'transaction_date' => $expense->expense_date ?? $expense->created_at ?? now(),
                ]);
            }
        }

        // 5. Recalculate Chronological Running Balances for All Accounts
        $accounts = PaymentAccount::all();
        foreach ($accounts as $account) {
            $transactions = AccountTransaction::where('payment_account_id', $account->id)
                ->orderBy('transaction_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $runningBalance = (float) ($account->opening_balance ?? 0);

            foreach ($transactions as $trx) {
                if (in_array($trx->type, ['inflow', 'transfer_in'])) {
                    $runningBalance += (float) $trx->amount;
                } else {
                    $runningBalance -= (float) $trx->amount;
                }

                $trx->update(['balance_after' => $runningBalance]);
            }

            $account->update(['current_balance' => $runningBalance]);
        }

        // 6. Synchronize Postgres Sequences safely if running on PostgreSQL
        if (DB::getDriverName() === 'pgsql') {
            $tables = ['payment_accounts', 'account_transactions', 'account_transfers'];
            foreach ($tables as $table) {
                $maxId = DB::table($table)->max('id') ?? 0;
                $seqName = "{$table}_id_seq";
                try {
                    DB::statement("SELECT setval('{$seqName}', {$maxId}, true)");
                } catch (\Throwable $e) {
                    // Sequence name might differ or table is empty
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op to preserve financial audit trail
    }
};
