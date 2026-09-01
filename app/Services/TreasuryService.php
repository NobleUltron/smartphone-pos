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
