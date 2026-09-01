<?php

namespace App\Services;

use App\Models\PaymentAccount;
use App\Models\AccountTransaction;
use App\Models\AccountTransfer;
use Illuminate\Support\Facades\DB;
use Exception;

class TreasuryService
{
    /**
     * Ensure default accounts exist
     */
    public static function ensureDefaultAccounts(): void
    {
        if (PaymentAccount::count() === 0) {
            PaymentAccount::create([
                'name' => 'Main Cash Register',
                'type' => 'cash',
                'provider' => 'Cash',
                'current_balance' => 0,
                'opening_balance' => 0,
                'is_active' => true,
                'description' => 'Physical cash in shop drawer & register till'
            ]);

            PaymentAccount::create([
                'name' => 'MTN Mobile Money',
                'type' => 'mobile_money',
                'provider' => 'MTN',
                'account_number' => '+256 780 000 000',
                'current_balance' => 0,
                'opening_balance' => 0,
                'is_active' => true,
                'description' => 'MTN MoMo Merchant float & digital payments'
            ]);

            PaymentAccount::create([
                'name' => 'Airtel Money',
                'type' => 'mobile_money',
                'provider' => 'Airtel',
                'account_number' => '+256 700 000 000',
                'current_balance' => 0,
                'opening_balance' => 0,
                'is_active' => true,
                'description' => 'Airtel Money Merchant float & digital payments'
            ]);

            PaymentAccount::create([
                'name' => 'Primary Bank Account',
                'type' => 'bank',
                'provider' => 'Stanbic',
                'account_number' => '90400000000',
                'current_balance' => 0,
                'opening_balance' => 0,
                'is_active' => true,
                'description' => 'Commercial bank account for wire transfers & large payouts'
            ]);
        }
    }

    /**
     * Backfill / Synchronize historical transactions across accounts
     */
    public static function syncHistorical(): void
    {
        self::ensureDefaultAccounts();

        $cashAccount = PaymentAccount::where('type', 'cash')->first() ?? PaymentAccount::first();

        // 1. Backfill Paid POS Sales
        $sales = \App\Models\Sale::where('payment_status', 'Paid')
            ->where('payment_method', '!=', 'Layaway')
            ->where('final_amount', '>', 0)
            ->get();

        foreach ($sales as $sale) {
            $exists = AccountTransaction::where('reference_type', \App\Models\Sale::class)
                ->where('reference_id', $sale->id)
                ->exists();

            if (!$exists) {
                $account = PaymentAccount::getForMethod($sale->payment_method) ?? $cashAccount;

                AccountTransaction::create([
                    'payment_account_id' => $account->id,
                    'type' => 'inflow',
                    'amount' => $sale->final_amount,
                    'balance_after' => 0,
                    'category' => 'Sale',
                    'reference_type' => \App\Models\Sale::class,
                    'reference_id' => $sale->id,
                    'transaction_reference' => 'POS-' . $sale->id,
                    'description' => "POS Sale #{$sale->id}" . ($sale->customer ? " (" . ($sale->customer->name ?? 'Customer') . ")" : ''),
                    'user_id' => $sale->user_id,
                    'transaction_date' => $sale->created_at ?? now(),
                ]);
            }
        }

        // 2. Backfill Layaway Payments & Deposits
        $layawayPayments = \App\Models\LayawayPayment::where('amount_paid', '>', 0)->get();

        foreach ($layawayPayments as $payment) {
            $exists = AccountTransaction::where('reference_type', \App\Models\LayawayPayment::class)
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
                    'reference_type' => \App\Models\LayawayPayment::class,
                    'reference_id' => $payment->id,
                    'transaction_reference' => 'LAY-' . $payment->id,
                    'description' => "Layaway Installment for Sale #{$payment->sale_id}",
                    'user_id' => $payment->sale?->user_id ?? $payment->user_id,
                    'transaction_date' => $payment->payment_date ?? $payment->created_at ?? now(),
                ]);
            }
        }

        // 3. Backfill Expenses and Cash Ins
        $expenses = \App\Models\Expense::where('amount', '>', 0)->get();

        foreach ($expenses as $expense) {
            $exists = AccountTransaction::where('reference_type', \App\Models\Expense::class)
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
                    'reference_type' => \App\Models\Expense::class,
                    'reference_id' => $expense->id,
                    'transaction_reference' => 'EXP-' . $expense->id,
                    'description' => $expense->description ?: "Expense: {$expense->category}",
                    'user_id' => $expense->user_id ?? $expense->recorded_by,
                    'transaction_date' => $expense->expense_date ?? $expense->created_at ?? now(),
                ]);
            }
        }

        // 4. Recalculate Chronological Running Balances for All Accounts
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

        // 5. Synchronize Postgres Sequences safely if running on PostgreSQL
        if (DB::getDriverName() === 'pgsql') {
            $tables = ['payment_accounts', 'account_transactions', 'account_transfers'];
            foreach ($tables as $table) {
                $maxId = DB::table($table)->max('id') ?? 0;
                $seqName = "{$table}_id_seq";
                try {
                    DB::statement("SELECT setval('{$seqName}', {$maxId}, true)");
                } catch (\Throwable $e) {
                }
            }
        }
    }

    /**
     * Record an Inflow (Funds added to an account)
     */
    public static function recordInflow(
        $accountOrMethod,
        float $amount,
        string $category,
        $refModel = null,
        string $description = '',
        ?string $trxRef = null,
        ?int $userId = null
    ): AccountTransaction {
        if ($amount <= 0) {
            throw new Exception("Inflow amount must be greater than zero.");
        }

        self::ensureDefaultAccounts();

        $account = $accountOrMethod instanceof PaymentAccount 
            ? $accountOrMethod 
            : PaymentAccount::getForMethod($accountOrMethod);

        if (!$account) {
            $account = PaymentAccount::first();
        }

        return DB::transaction(function () use ($account, $amount, $category, $refModel, $description, $trxRef, $userId) {
            $newBalance = $account->current_balance + $amount;
            $account->update(['current_balance' => $newBalance]);

            return AccountTransaction::create([
                'payment_account_id' => $account->id,
                'type' => 'inflow',
                'amount' => $amount,
                'balance_after' => $newBalance,
                'category' => $category,
                'reference_type' => $refModel ? get_class($refModel) : null,
                'reference_id' => $refModel ? $refModel->id : null,
                'transaction_reference' => $trxRef,
                'description' => $description ?: "Inflow: {$category}",
                'user_id' => $userId ?? auth()->id(),
                'transaction_date' => now(),
            ]);
        });
    }

    /**
     * Record an Outflow (Funds deducted from an account)
     */
    public static function recordOutflow(
        $accountOrMethod,
        float $amount,
        string $category,
        $refModel = null,
        string $description = '',
        ?string $trxRef = null,
        ?int $userId = null
    ): AccountTransaction {
        if ($amount <= 0) {
            throw new Exception("Outflow amount must be greater than zero.");
        }

        self::ensureDefaultAccounts();

        $account = $accountOrMethod instanceof PaymentAccount 
            ? $accountOrMethod 
            : PaymentAccount::getForMethod($accountOrMethod);

        if (!$account) {
            $account = PaymentAccount::first();
        }

        return DB::transaction(function () use ($account, $amount, $category, $refModel, $description, $trxRef, $userId) {
            $newBalance = $account->current_balance - $amount;
            $account->update(['current_balance' => $newBalance]);

            return AccountTransaction::create([
                'payment_account_id' => $account->id,
                'type' => 'outflow',
                'amount' => $amount,
                'balance_after' => $newBalance,
                'category' => $category,
                'reference_type' => $refModel ? get_class($refModel) : null,
                'reference_id' => $refModel ? $refModel->id : null,
                'transaction_reference' => $trxRef,
                'description' => $description ?: "Outflow: {$category}",
                'user_id' => $userId ?? auth()->id(),
                'transaction_date' => now(),
            ]);
        });
    }

    /**
     * Inter-Account Transfer (e.g. Cash -> MTN MoMo Float)
     */
    public static function transfer(
        int $fromAccountId,
        int $toAccountId,
        float $amount,
        string $notes = '',
        ?int $userId = null
    ): AccountTransfer {
        if ($fromAccountId === $toAccountId) {
            throw new Exception("Cannot transfer to the same account.");
        }

        if ($amount <= 0) {
            throw new Exception("Transfer amount must be greater than zero.");
        }

        $fromAccount = PaymentAccount::findOrFail($fromAccountId);
        $toAccount = PaymentAccount::findOrFail($toAccountId);

        return DB::transaction(function () use ($fromAccount, $toAccount, $amount, $notes, $userId) {
            $refNumber = 'TRF-' . strtoupper(uniqid());

            $transfer = AccountTransfer::create([
                'from_account_id' => $fromAccount->id,
                'to_account_id' => $toAccount->id,
                'amount' => $amount,
                'reference_number' => $refNumber,
                'notes' => $notes,
                'user_id' => $userId ?? auth()->id(),
            ]);

            // Deduct from Source Account
            $fromBalanceAfter = $fromAccount->current_balance - $amount;
            $fromAccount->update(['current_balance' => $fromBalanceAfter]);

            AccountTransaction::create([
                'payment_account_id' => $fromAccount->id,
                'type' => 'transfer_out',
                'amount' => $amount,
                'balance_after' => $fromBalanceAfter,
                'category' => 'Transfer Out',
                'reference_type' => AccountTransfer::class,
                'reference_id' => $transfer->id,
                'transaction_reference' => $refNumber,
                'description' => "Transfer to {$toAccount->name}" . ($notes ? " ({$notes})" : ''),
                'user_id' => $userId ?? auth()->id(),
                'transaction_date' => now(),
            ]);

            // Add to Destination Account
            $toBalanceAfter = $toAccount->current_balance + $amount;
            $toAccount->update(['current_balance' => $toBalanceAfter]);

            AccountTransaction::create([
                'payment_account_id' => $toAccount->id,
                'type' => 'transfer_in',
                'amount' => $amount,
                'balance_after' => $toBalanceAfter,
                'category' => 'Transfer In',
                'reference_type' => AccountTransfer::class,
                'reference_id' => $transfer->id,
                'transaction_reference' => $refNumber,
                'description' => "Transfer from {$fromAccount->name}" . ($notes ? " ({$notes})" : ''),
                'user_id' => $userId ?? auth()->id(),
                'transaction_date' => now(),
            ]);

            return $transfer;
        });
    }

    /**
     * Reconcile / Audit Account Balance
     */
    public static function reconcile(
        int $accountId,
        float $actualBalance,
        string $reason = '',
        ?int $userId = null
    ): AccountTransaction {
        $account = PaymentAccount::findOrFail($accountId);

        return DB::transaction(function () use ($account, $actualBalance, $reason, $userId) {
            $variance = $actualBalance - $account->current_balance;

            if ($variance == 0) {
                throw new Exception("Recorded system balance already matches actual balance.");
            }

            $account->update(['current_balance' => $actualBalance]);

            return AccountTransaction::create([
                'payment_account_id' => $account->id,
                'type' => 'adjustment',
                'amount' => abs($variance),
                'balance_after' => $actualBalance,
                'category' => 'Reconciliation Adjustment',
                'transaction_reference' => 'AUDIT-' . date('Ymd'),
                'description' => ($variance > 0 ? "Positive" : "Negative") . " Audit Adjustment of UGX " . number_format(abs($variance)) . ($reason ? ": {$reason}" : ''),
                'user_id' => $userId ?? auth()->id(),
                'transaction_date' => now(),
            ]);
        });
    }
}
