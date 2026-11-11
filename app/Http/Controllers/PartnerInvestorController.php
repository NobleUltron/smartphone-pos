<?php

namespace App\Http\Controllers;

use App\Models\PartnerInvestor;
use App\Models\PartnerTransaction;
use App\Models\PaymentAccount;
use App\Models\AccountTransaction;
use App\Models\DeviceImei;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Barryvdh\DomPDF\Facade\Pdf;

class PartnerInvestorController extends Controller
{
    public function index(Request $request)
    {
        $partners = PartnerInvestor::with(['transactions'])
            ->orderBy('name')
            ->get();

        $summaries = $partners->map(fn($partner) => $partner->getPortfolioSummary());

        $totalInvested = $summaries->sum('total_deposits');
        $totalStockCost = $summaries->sum('in_stock_cost');
        $totalCashAvailable = $summaries->sum('cash_balance_available');
        $totalProfitEarned = $summaries->sum('partner_profit_earned');
        $totalPayouts = $summaries->sum('total_payouts');

        $paymentAccounts = PaymentAccount::where('is_active', true)->get();

        // Also fetch active in-stock devices not yet assigned to any partner (for quick-assigning)
        $unassignedDevices = DeviceImei::with('product.brand')
            ->where('status', 'In Stock')
            ->whereNull('partner_investor_id')
            ->orderBy('created_at', 'desc')
            ->take(50)
            ->get()
            ->map(function ($device) {
                return [
                    'id' => $device->id,
                    'imei' => $device->imei,
                    'label' => ($device->product ? (($device->product->brand->name ?? '') . ' ' . $device->product->model_name) : 'Device') . " ({$device->imei}) - " . number_format($device->cost_price) . ' UGX',
                    'cost_price' => (float) $device->cost_price,
                ];
            });

        return Inertia::render('Accounts/Partners/Index', [
            'partners' => $summaries,
            'metrics' => [
                'total_invested' => (float) $totalInvested,
                'total_stock_cost' => (float) $totalStockCost,
                'total_cash_available' => (float) $totalCashAvailable,
                'total_profit_earned' => (float) $totalProfitEarned,
                'total_payouts' => (float) $totalPayouts,
                'partners_count' => $partners->count(),
            ],
            'paymentAccounts' => $paymentAccounts,
            'unassignedDevices' => $unassignedDevices,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'profit_share_percentage' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'initial_deposit' => 'nullable|numeric|min:0',
            'payment_account_id' => 'nullable|exists:payment_accounts,id',
        ]);

        DB::transaction(function () use ($validated, $request) {
            $partner = PartnerInvestor::create([
                'name' => $validated['name'],
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'profit_share_percentage' => $validated['profit_share_percentage'],
                'notes' => $validated['notes'] ?? null,
                'is_active' => true,
            ]);

            if (!empty($validated['initial_deposit']) && $validated['initial_deposit'] > 0) {
                $paymentAccountId = $validated['payment_account_id'] ?? null;

                PartnerTransaction::create([
                    'partner_investor_id' => $partner->id,
                    'payment_account_id' => $paymentAccountId,
                    'type' => 'deposit',
                    'amount' => $validated['initial_deposit'],
                    'transaction_date' => now()->toDateString(),
                    'reference' => 'INITIAL-CAPITAL',
                    'notes' => 'Initial capital contribution',
                    'user_id' => $request->user()->id ?? null,
                ]);

                if ($paymentAccountId) {
                    $account = PaymentAccount::find($paymentAccountId);
                    if ($account) {
                        $account->increment('current_balance', $validated['initial_deposit']);

                        AccountTransaction::create([
                            'payment_account_id' => $account->id,
                            'type' => 'inflow',
                            'category' => 'partner_capital',
                            'amount' => $validated['initial_deposit'],
                            'transaction_date' => now(),
                            'transaction_reference' => 'PARTNER-' . $partner->id . '-' . time(),
                            'description' => "Initial capital deposit from {$partner->name}",
                            'user_id' => $request->user()->id ?? null,
                        ]);
                    }
                }
            }
        });

        return redirect()->back()->with('success', 'Partner capital profile created successfully.');
    }

    public function update(Request $request, PartnerInvestor $partner)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:255',
            'profit_share_percentage' => 'required|numeric|min:0|max:100',
            'notes' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $partner->update($validated);

        return redirect()->back()->with('success', 'Partner profile updated successfully.');
    }

    public function destroy(Request $request, PartnerInvestor $partner)
    {
        // Check if has active stock
        $activeStockCount = $partner->deviceImeis()->where('status', 'In Stock')->count();
        if ($activeStockCount > 0 && !$request->boolean('unlink_stock')) {
            return redirect()->back()->with('error', "Cannot delete {$partner->name} while they have {$activeStockCount} active phone(s) in stock. Unlink the phones first.");
        }

        DB::transaction(function () use ($partner) {
            $partner->deviceImeis()->update(['partner_investor_id' => null]);
            $partner->delete();
        });

        $msg = $activeStockCount > 0
            ? "Removed {$partner->name} and unlinked {$activeStockCount} in-stock phone(s) back to shop stock."
            : 'Partner record removed successfully.';

        return redirect()->back()->with('success', $msg);
    }

    public function addCapital(Request $request, PartnerInvestor $partner)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1000',
            'payment_account_id' => 'nullable|exists:payment_accounts,id',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string',
            'reference' => 'nullable|string|max:100',
        ]);

        DB::transaction(function () use ($partner, $validated, $request) {
            $tx = PartnerTransaction::create([
                'partner_investor_id' => $partner->id,
                'payment_account_id' => $validated['payment_account_id'] ?? null,
                'type' => 'deposit',
                'amount' => $validated['amount'],
                'transaction_date' => $validated['transaction_date'],
                'reference' => $validated['reference'] ?? ('DEP-' . time()),
                'notes' => $validated['notes'] ?? 'Additional capital deposit',
                'user_id' => $request->user()->id ?? null,
            ]);

            // Sync with Treasury Payment Account if specified
            if (!empty($validated['payment_account_id'])) {
                $account = PaymentAccount::find($validated['payment_account_id']);
                if ($account) {
                    $account->increment('current_balance', $validated['amount']);

                    AccountTransaction::create([
                        'payment_account_id' => $account->id,
                        'type' => 'inflow',
                        'category' => 'partner_capital',
                        'amount' => $validated['amount'],
                        'transaction_date' => $validated['transaction_date'],
                        'transaction_reference' => $tx->reference,
                        'description' => "Capital deposit from {$partner->name} - " . ($validated['notes'] ?? ''),
                        'user_id' => $request->user()->id ?? null,
                    ]);
                }
            }
        });

        return redirect()->back()->with('success', "UGX " . number_format($validated['amount']) . " capital deposit recorded for {$partner->name}.");
    }

    public function payout(Request $request, PartnerInvestor $partner)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1000',
            'type' => 'required|string|in:payout,profit_payout',
            'payment_account_id' => 'required|exists:payment_accounts,id',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string',
            'reference' => 'nullable|string|max:100',
        ]);

        $account = PaymentAccount::findOrFail($validated['payment_account_id']);

        if ($account->current_balance < $validated['amount']) {
            return redirect()->back()->with('error', "Insufficient funds in {$account->name}. Available: UGX " . number_format($account->current_balance));
        }

        DB::transaction(function () use ($partner, $account, $validated, $request) {
            $tx = PartnerTransaction::create([
                'partner_investor_id' => $partner->id,
                'payment_account_id' => $account->id,
                'type' => $validated['type'],
                'amount' => $validated['amount'],
                'transaction_date' => $validated['transaction_date'],
                'reference' => $validated['reference'] ?? ('PAY-' . time()),
                'notes' => $validated['notes'] ?? ($validated['type'] === 'profit_payout' ? 'Profit distribution payout' : 'Principal capital return'),
                'user_id' => $request->user()->id ?? null,
            ]);

            $account->decrement('current_balance', $validated['amount']);

            AccountTransaction::create([
                'payment_account_id' => $account->id,
                'type' => 'outflow',
                'category' => 'partner_payout',
                'amount' => $validated['amount'],
                'transaction_date' => $validated['transaction_date'],
                'transaction_reference' => $tx->reference,
                'description' => "Payout to {$partner->name} (" . ($validated['type'] === 'profit_payout' ? 'Profit' : 'Principal') . ")",
                'user_id' => $request->user()->id ?? null,
            ]);
        });

        return redirect()->back()->with('success', "UGX " . number_format($validated['amount']) . " payout successfully disbursed to {$partner->name}.");
    }

    public function assignStock(Request $request, PartnerInvestor $partner)
    {
        $validated = $request->validate([
            'device_imei_ids' => 'required|array|min:1',
            'device_imei_ids.*' => 'exists:device_imeis,id',
        ]);

        DeviceImei::whereIn('id', $validated['device_imei_ids'])
            ->update(['partner_investor_id' => $partner->id]);

        $count = count($validated['device_imei_ids']);
        return redirect()->back()->with('success', "{$count} phone(s) linked to {$partner->name}'s capital pool.");
    }

    public function unassignStock(Request $request, DeviceImei $deviceImei)
    {
        $deviceImei->update(['partner_investor_id' => null]);
        return redirect()->back()->with('success', "Phone unlinked from partner pool.");
    }

    public function printPdf(PartnerInvestor $partner)
    {
        $summary = $partner->getPortfolioSummary();
        $transactions = $partner->transactions()->with(['paymentAccount'])->get();
        $settings = Setting::getAllAsKeyValue();

        $pdf = Pdf::loadView('pdf.partner_statement', [
            'partner' => $partner,
            'summary' => $summary,
            'transactions' => $transactions,
            'settings' => $settings,
            'date' => now()->format('d M Y, h:i A'),
        ]);

        return $pdf->setPaper('a4', 'portrait')->stream("Statement-{$partner->name}-" . now()->format('Ymd') . ".pdf");
    }
}

