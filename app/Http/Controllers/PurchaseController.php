<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Purchase;
use App\Models\PurchaseItem;
use App\Models\Supplier;
use App\Models\Product;
use App\Models\DeviceImei;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PurchaseController extends Controller
{
    public function store(Request $request)
    {
        $messages = [
            'paid_amount.lte' => 'Amount paid cannot exceed total purchase cost (' . number_format($request->total_amount ?? 0) . ' UGX).',
            'paid_amount.max' => 'Amount paid exceeds maximum limit (9,999,999,999 UGX).',
            'total_amount.max' => 'Total amount exceeds maximum limit (9,999,999,999 UGX).',
        ];

        $validated = $request->validate([
            'supplier_id' => 'required|exists:suppliers,id',
            'reference_no' => 'nullable|string|max:255',
            'total_amount' => 'required|numeric|min:0|max:9999999999',
            'paid_amount' => 'nullable|numeric|min:0|max:9999999999',
            'credit_applied' => 'nullable|numeric|min:0|max:9999999999',
            'payment_account_id' => 'nullable|exists:payment_accounts,id',
            'status' => 'required|in:Pending,Received',
            'purchase_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
            'items.*.imeis' => 'nullable|array',
            'items.*.imeis.*' => 'string',
            'items.*.condition' => 'nullable|string|in:Brand New,Refurbished,Used Grade A,Used Grade B',
            'items.*.color' => 'nullable|string',
            'items.*.storage_capacity' => 'nullable|string',
            'items.*.selling_price' => 'nullable|numeric|min:0',
        ], $messages);

        // Check for duplicate IMEIs in submission & existing database
        $allSubmittedImeis = [];
        $duplicatesInSubmission = [];

        foreach ($validated['items'] as $itemIndex => $item) {
            if (!empty($item['imeis']) && is_array($item['imeis'])) {
                foreach ($item['imeis'] as $imeiStr) {
                    $trimmed = trim($imeiStr);
                    if ($trimmed === '') continue;
                    if (in_array($trimmed, $allSubmittedImeis)) {
                        $duplicatesInSubmission[] = $trimmed;
                    }
                    $allSubmittedImeis[] = $trimmed;
                }
            }
        }

        if (!empty($duplicatesInSubmission)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'items' => 'Duplicate IMEI(s) within submission: ' . implode(', ', array_unique($duplicatesInSubmission))
            ]);
        }

        if (!empty($allSubmittedImeis)) {
            $existingInDb = DeviceImei::whereIn('imei', $allSubmittedImeis)->pluck('imei')->toArray();
            if (!empty($existingInDb)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'items' => 'The following IMEI(s) already exist in inventory: ' . implode(', ', $existingInDb)
                ]);
            }
        }

        // Validate supplier credit and wallet payment
        $walletPaid = floatval($validated['paid_amount'] ?? 0);
        $creditApplied = floatval($validated['credit_applied'] ?? 0);
        $totalPaid = $walletPaid + $creditApplied;

        if ($totalPaid > floatval($validated['total_amount'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'paid_amount' => 'Combined supplier credit + wallet payment (' . number_format($totalPaid) . ' UGX) cannot exceed total purchase cost (' . number_format($validated['total_amount']) . ' UGX).'
            ]);
        }

        if ($creditApplied > 0) {
            $supCheck = Supplier::find($validated['supplier_id']);
            if (!$supCheck || $creditApplied > floatval($supCheck->credit_balance ?? 0)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'credit_applied' => 'Supplier credit applied exceeds available credit balance (' . number_format(floatval($supCheck->credit_balance ?? 0)) . ' UGX).'
                ]);
            }
        }

        $paymentAccountId = $validated['payment_account_id'] ?? null;
        $paymentAccount = null;

        if ($walletPaid > 0) {
            $paymentAccount = $paymentAccountId
                ? \App\Models\PaymentAccount::where('is_active', true)->where('is_personal', false)->find($paymentAccountId)
                : null;
            if (!$paymentAccount) {
                $paymentAccount = \App\Models\PaymentAccount::where('is_active', true)->where('is_personal', false)->where('name', 'Main Cash Register')->first()
                    ?? \App\Models\PaymentAccount::where('is_active', true)->where('is_personal', false)->where('type', 'cash')->first()
                    ?? \App\Models\PaymentAccount::where('is_active', true)->where('is_personal', false)->first();
            }

            if ($paymentAccount && $walletPaid > floatval($paymentAccount->current_balance)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'paid_amount' => "Insufficient funds in {$paymentAccount->name}! Available balance is " . number_format(max(0, $paymentAccount->current_balance)) . " UGX."
                ]);
            }
        }

        DB::transaction(function () use ($validated, $walletPaid, $creditApplied, $totalPaid, $paymentAccount) {
            $payment_status = 'Unpaid';
            if ($totalPaid > 0) {
                if ($totalPaid >= $validated['total_amount']) {
                    $payment_status = 'Paid';
                } else {
                    $payment_status = 'Partial';
                }
            }

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'reference_no' => $validated['reference_no'],
                'total_amount' => $validated['total_amount'],
                'paid_amount' => $totalPaid,
                'status' => $validated['status'],
                'payment_status' => $payment_status,
                'purchase_date' => $validated['purchase_date']
            ]);

            foreach ($validated['items'] as $item) {
                PurchaseItem::create([
                    'purchase_id' => $purchase->id,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_cost' => $item['unit_cost'],
                    'total_cost' => $item['quantity'] * $item['unit_cost'],
                    'imeis' => isset($item['imeis']) ? $item['imeis'] : null
                ]);

                // Update Inventory
                $product = Product::find($item['product_id']);
                
                if ($product->type === 'serialized') {
                    // Create individual DeviceImei records
                    if (isset($item['imeis']) && is_array($item['imeis'])) {
                        foreach ($item['imeis'] as $imeiStr) {
                            DeviceImei::create([
                                'product_id' => $product->id,
                                'imei' => $imeiStr,
                                'condition' => isset($item['condition']) && $item['condition'] ? $item['condition'] : 'Brand New',
                                'status' => $validated['status'] === 'Received' ? 'In Stock' : 'In Transit',
                                'cost_price' => $item['unit_cost'],
                                'selling_price' => isset($item['selling_price']) && $item['selling_price'] !== '' ? $item['selling_price'] : $product->selling_price, // Inherit from parent if not specified

                                'color' => isset($item['color']) && $item['color'] ? $item['color'] : null,
                                'storage_capacity' => isset($item['storage_capacity']) && $item['storage_capacity'] ? $item['storage_capacity'] : null,
                            ]);
                        }
                    }
                } else {
                    // Bulk product: increment quantity only if Received
                    if ($validated['status'] === 'Received') {
                        $product->quantity += $item['quantity'];
                        $product->save();
                    }
                }
            }

            // Deduct applied supplier credit & log audit entry
            $supplier = Supplier::lockForUpdate()->find($validated['supplier_id']);
            if ($creditApplied > 0 && $supplier) {
                $supplier->decrement('credit_balance', $creditApplied);
                \App\Models\SupplierReturn::create([
                    'supplier_id' => $supplier->id,
                    'purchase_id' => $purchase->id,
                    'return_type' => 'credit_applied',
                    'resolution' => 'applied_to_purchase',
                    'status' => 'Completed',
                    'amount' => $creditApplied,
                    'reason' => "Applied UGX " . number_format($creditApplied) . " supplier credit towards Purchase #{$purchase->id}",
                    'returned_at' => now(),
                    'user_id' => auth()->id(),
                ]);
            }

            // Update supplier balance
            $supplier?->recalculateBalance();

            // Sync with Treasury Service if walletPaid > 0
            if ($walletPaid > 0 && $paymentAccount) {
                \App\Services\TreasuryService::recordOutflow(
                    $paymentAccount,
                    $walletPaid,
                    'Supplier Purchase',
                    $purchase,
                    "Stock Purchase #{$purchase->id} (" . ($purchase->supplier->name ?? 'Supplier') . ")" . ($purchase->reference_no ? " - Ref: {$purchase->reference_no}" : ''),
                    $purchase->reference_no,
                    auth()->id()
                );

                // If paid from Cash Register and an active drawer is open, record in Expense for shift drawer balance
                if ($paymentAccount->type === 'cash' && stripos($paymentAccount->name, 'Safe') === false) {
                    $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                        ->where('status', 'open')
                        ->first();
                    if ($activeDrawer) {
                        \App\Models\Expense::create([
                            'cash_drawer_id' => $activeDrawer->id,
                            'payment_account_id' => $paymentAccount->id,
                            'user_id' => auth()->id(),
                            'recorded_by' => auth()->id(),
                            'category' => 'Supplier Payment',
                            'amount' => $walletPaid,
                            'description' => "Stock Purchase #{$purchase->id} (" . ($purchase->supplier->name ?? 'Supplier') . ")",
                            'expense_date' => now(),
                        ]);
                    }
                }
            }
        });

        return redirect()->route('suppliers.show', $validated['supplier_id'])
            ->with('success', 'Purchase logged successfully.');
    }

    public function create(Request $request)
    {
        $suppliers = Supplier::orderBy('name')->get();
        // Eager load brand so we can show proper names
        $products = Product::with('brand')->orderBy('model_name')->get();
        $paymentAccounts = \App\Models\PaymentAccount::where('is_active', true)->where('is_personal', false)->get();
        
        return Inertia::render('Purchases/Create', [
            'suppliers' => $suppliers,
            'products' => $products,
            'paymentAccounts' => $paymentAccounts,
            'selected_supplier_id' => $request->query('supplier_id'),
        ]);
    }

    public function destroy(Purchase $purchase)
    {
        try {
            DB::transaction(function () use ($purchase) {
                // Pre-flight checks
                $purchase->load('items.product');

                foreach ($purchase->items as $item) {
                    $product = $item->product;

                    if ($product->type === 'serialized') {
                        // Check if any IMEI was already sold
                        if (isset($item->imeis) && is_array($item->imeis)) {
                            $imeis = DeviceImei::where('product_id', $product->id)
                                ->whereIn('imei', $item->imeis)
                                ->get();

                            foreach ($imeis as $imeiRecord) {
                                if (!in_array($imeiRecord->status, ['In Stock', 'In Transit'])) {
                                    throw new \Exception("Cannot delete purchase: IMEI {$imeiRecord->imei} is already {$imeiRecord->status}.");
                                }
                            }
                        }
                    } else {
                        // Bulk product check (only if received)
                        if ($purchase->status === 'Received') {
                            if ($product->quantity < $item->quantity) {
                                throw new \Exception("Cannot delete purchase: Bulk stock for {$product->model_name} is lower than the purchased amount.");
                            }
                        }
                    }
                }

                // Execution: Reverse the purchase
                foreach ($purchase->items as $item) {
                    $product = $item->product;

                    if ($product->type === 'serialized') {
                        if (isset($item->imeis) && is_array($item->imeis)) {
                            DeviceImei::where('product_id', $product->id)
                                ->whereIn('imei', $item->imeis)
                                ->delete();
                        }
                    } else {
                        if ($purchase->status === 'Received') {
                            $product->quantity -= $item->quantity;
                            $product->save();
                        }
                    }
                }

                // Reverse supplier balance
                $balanceDecrease = $purchase->total_amount - $purchase->paid_amount;
                if ($balanceDecrease > 0) {
                    $supplier = Supplier::find($purchase->supplier_id);
                    if ($supplier) {
                        $supplier->balance -= $balanceDecrease;
                        $supplier->save();
                    }
                }

                // Reverse Treasury outflows and restore account balances
                $trxs = \App\Models\AccountTransaction::where('reference_type', \App\Models\Purchase::class)
                    ->where('reference_id', $purchase->id)
                    ->get();
                foreach ($trxs as $trx) {
                    if ($trx->account) {
                        $trx->account->increment('current_balance', $trx->amount);
                    }
                    $trx->delete();
                }

                // Reverse any linked shift expenses
                \App\Models\Expense::where('category', 'Supplier Payment')
                    ->where('description', 'like', "%Purchase #{$purchase->id}%")
                    ->delete();

                // Delete items and purchase
                $purchase->items()->delete();
                $purchase->delete();
            });

            return redirect()->back()->with('success', 'Purchase deleted successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function receive(Purchase $purchase)
    {
        if ($purchase->status === 'Received') {
            return redirect()->back()->withErrors(['error' => 'Purchase is already received.']);
        }
        if ($purchase->status === 'Cancelled') {
            return redirect()->back()->withErrors(['error' => 'Cannot mark a cancelled purchase as received.']);
        }

        try {
            DB::transaction(function () use ($purchase) {
                $purchase->status = 'Received';
                $purchase->save();

                $purchase->load('items.product');

                foreach ($purchase->items as $item) {
                    $product = $item->product;
                    if ($product->type === 'serialized') {
                        if (isset($item->imeis) && is_array($item->imeis)) {
                            DeviceImei::where('product_id', $product->id)
                                ->whereIn('imei', $item->imeis)
                                ->where('status', 'In Transit')
                                ->update(['status' => 'In Stock']);
                        }
                    } else {
                        $product->quantity += $item->quantity;
                        $product->save();
                    }
                }
            });

            return redirect()->back()->with('success', 'Purchase marked as received.');
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function cancel(Request $request, Purchase $purchase)
    {
        if ($purchase->status !== 'Pending') {
            return redirect()->back()->withErrors(['error' => 'Only Pending (undelivered) purchase orders can be cancelled.']);
        }

        $paidAmount = (float) ($purchase->paid_amount ?? 0);

        $rules = [
            'reason' => 'required|string|max:1000',
            'notes' => 'nullable|string|max:1000',
        ];

        if ($paidAmount > 0) {
            $rules['resolution'] = 'required|in:refund,supplier_credit,forfeited';
            $rules['payment_account_id'] = 'required_if:resolution,refund|nullable|exists:payment_accounts,id';
        } else {
            $rules['resolution'] = 'nullable|in:none,refund,supplier_credit,forfeited';
        }

        $validated = $request->validate($rules, [
            'payment_account_id.required_if' => 'Please select the business wallet that received the supplier refund.',
        ]);

        $resolution = $paidAmount > 0 ? $validated['resolution'] : 'none';

        try {
            DB::transaction(function () use ($purchase, $validated, $paidAmount, $resolution) {
                $lockedPurchase = Purchase::with(['items.product', 'supplier'])->lockForUpdate()->findOrFail($purchase->id);

                if ($lockedPurchase->status !== 'Pending') {
                    throw new \RuntimeException('This purchase order is no longer Pending.');
                }

                // Cancel any In Transit IMEIs attached to this undelivered purchase
                foreach ($lockedPurchase->items as $item) {
                    if ($item->product && $item->product->type === 'serialized' && is_array($item->imeis) && count($item->imeis) > 0) {
                        DeviceImei::where('product_id', $item->product->id)
                            ->whereIn('imei', $item->imeis)
                            ->where('status', 'In Transit')
                            ->update(['status' => 'Cancelled']);
                    }
                }

                $lockedPurchase->status = 'Cancelled';
                $lockedPurchase->payment_status = match ($resolution) {
                    'refund' => 'Refunded',
                    'supplier_credit' => 'Credited',
                    'forfeited' => 'Forfeited',
                    default => 'Cancelled',
                };
                $lockedPurchase->save();

                $paymentAccountId = null;

                if ($paidAmount > 0) {
                    $supplierName = $lockedPurchase->supplier->name ?? 'Supplier';

                    if ($resolution === 'refund') {
                        $account = \App\Models\PaymentAccount::where('is_active', true)
                            ->where('is_personal', false)
                            ->lockForUpdate()
                            ->findOrFail($validated['payment_account_id']);
                        $paymentAccountId = $account->id;

                        \App\Services\TreasuryService::recordInflow(
                            $account,
                            $paidAmount,
                            'Supplier Refund',
                            $lockedPurchase,
                            "Refund for cancelled Purchase #{$lockedPurchase->id} ({$supplierName}): {$validated['reason']}",
                            $lockedPurchase->reference_no,
                            auth()->id()
                        );
                    } elseif ($resolution === 'supplier_credit') {
                        $lockedPurchase->supplier?->increment('credit_balance', $paidAmount);
                    } elseif ($resolution === 'forfeited') {
                        \App\Models\Expense::create([
                            'cash_drawer_id' => null,
                            'payment_account_id' => null,
                            'user_id' => auth()->id(),
                            'recorded_by' => auth()->id(),
                            'category' => 'Supplier Write-Off',
                            'amount' => $paidAmount,
                            'description' => "Forfeited deposit on cancelled Purchase #{$lockedPurchase->id} ({$supplierName}): {$validated['reason']}",
                            'expense_date' => now(),
                        ]);
                    }
                }

                $fullReason = trim($validated['reason']) . (!empty($validated['notes']) ? ' — ' . trim($validated['notes']) : '');

                \App\Models\SupplierReturn::create([
                    'supplier_id' => $lockedPurchase->supplier_id,
                    'purchase_id' => $lockedPurchase->id,
                    'return_type' => 'purchase_cancellation',
                    'resolution' => $resolution,
                    'status' => 'Completed',
                    'amount' => $paidAmount,
                    'payment_account_id' => $paymentAccountId,
                    'reason' => $fullReason,
                    'returned_at' => now(),
                    'user_id' => auth()->id(),
                ]);

                $lockedPurchase->supplier?->recalculateBalance();

                \App\Models\ActivityLog::log(
                    'purchase_cancelled',
                    'Purchases',
                    "Cancelled Purchase #{$lockedPurchase->id} ({$resolution}, UGX " . number_format($paidAmount) . "): {$validated['reason']}",
                    ['purchase_id' => $lockedPurchase->id, 'resolution' => $resolution, 'amount' => $paidAmount]
                );
            });

            $msg = match ($resolution) {
                'refund' => 'Purchase cancelled and UGX ' . number_format($paidAmount) . ' refund recorded into wallet.',
                'supplier_credit' => 'Purchase cancelled and UGX ' . number_format($paidAmount) . ' added to supplier credit.',
                'forfeited' => 'Purchase cancelled and UGX ' . number_format($paidAmount) . ' logged as Supplier Write-Off.',
                default => 'Pending purchase order cancelled cleanly.',
            };

            return redirect()->back()->with('success', $msg);
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function recordPayment(Request $request, Purchase $purchase)
    {
        if ($purchase->status === 'Cancelled') {
            return redirect()->back()->withErrors(['amount' => 'Cannot record a payment for a cancelled purchase order.']);
        }
        $remaining = (float) ($purchase->total_amount - $purchase->paid_amount);

        if ($remaining <= 0) {
            return redirect()->back()->withErrors(['amount' => 'This purchase is already paid in full.']);
        }

        $validated = $request->validate([
            'amount' => 'nullable|numeric|min:0',
            'credit_amount' => 'nullable|numeric|min:0',
            'payment_account_id' => 'nullable|exists:payment_accounts,id',
            'payment_method' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $walletAmount = floatval($validated['amount'] ?? 0);
        $creditAmount = floatval($validated['credit_amount'] ?? 0);
        $totalApplied = $walletAmount + $creditAmount;

        if ($totalApplied < 1) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'amount' => 'Enter a supplier credit amount and/or wallet payment of at least 1 UGX.',
            ]);
        }

        if ($totalApplied > $remaining) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'amount' => 'Total applied (' . number_format($totalApplied) . ' UGX) cannot exceed remaining balance of ' . number_format($remaining) . ' UGX.',
            ]);
        }

        $supplierCredit = floatval($purchase->supplier?->credit_balance ?? 0);
        if ($creditAmount > $supplierCredit) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'credit_amount' => 'Credit applied cannot exceed available supplier credit of ' . number_format($supplierCredit) . ' UGX.',
            ]);
        }

        $account = null;
        if ($walletAmount > 0) {
            $account = !empty($validated['payment_account_id'])
                ? \App\Models\PaymentAccount::where('is_active', true)->where('is_personal', false)->find($validated['payment_account_id'])
                : \App\Models\PaymentAccount::getForMethod($validated['payment_method'] ?? 'Cash');

            if ($account && $walletAmount > floatval($account->current_balance)) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'amount' => "Insufficient funds in {$account->name}! Available balance is " . number_format(max(0, $account->current_balance)) . " UGX."
                ]);
            }
        }

        DB::transaction(function () use ($purchase, $validated, $account, $walletAmount, $creditAmount, $totalApplied) {
            $purchase->paid_amount += $totalApplied;
            if ($purchase->paid_amount >= $purchase->total_amount) {
                $purchase->payment_status = 'Paid';
            } else {
                $purchase->payment_status = 'Partial';
            }
            $purchase->save();

            if ($creditAmount > 0 && $purchase->supplier) {
                $lockedSupplier = Supplier::lockForUpdate()->findOrFail($purchase->supplier_id);
                if ($creditAmount > floatval($lockedSupplier->credit_balance ?? 0)) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'credit_amount' => 'Insufficient available supplier credit.',
                    ]);
                }
                $lockedSupplier->decrement('credit_balance', $creditAmount);

                $notes = trim((string) ($validated['notes'] ?? ''));
                \App\Models\SupplierReturn::create([
                    'supplier_id' => $lockedSupplier->id,
                    'purchase_id' => $purchase->id,
                    'return_type' => 'credit_applied',
                    'resolution' => 'applied_to_purchase',
                    'status' => 'Completed',
                    'amount' => $creditAmount,
                    'reason' => "Applied UGX " . number_format($creditAmount) . " supplier credit towards Purchase #{$purchase->id}" . ($notes !== '' ? " — {$notes}" : ''),
                    'returned_at' => now(),
                    'user_id' => auth()->id(),
                ]);
            }

            $purchase->supplier?->recalculateBalance();

            if ($walletAmount > 0) {
                // Record in Cash Drawer Expenses only if paying specifically from the Cash Register Till (not the Shop Safe)
                $isTill = $account
                    ? ($account->type === 'cash' && stripos($account->name, 'Safe') === false && ($account->provider ?? '') !== 'Safe')
                    : (strtolower($validated['payment_method'] ?? '') === 'cash');

                $user = auth()->user();
                $isAdminOrManager = $user && in_array(strtolower($user->role ?? ''), ['admin', 'manager', 'owner']);

                if ($isTill) {
                    $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                        ->where('status', 'open')
                        ->first();

                    if (!$activeDrawer && !$isAdminOrManager) {
                        throw \Illuminate\Validation\ValidationException::withMessages([
                            'payment_method' => 'You must have an open shift to pay cash from the drawer register. Please open a shift or pay from Shop Safe / Mobile Money / Bank Transfer.'
                        ]);
                    }

                    if ($activeDrawer) {
                        $availableCash = $activeDrawer->calculateExpectedCash();
                        if ($walletAmount > $availableCash) {
                            throw \Illuminate\Validation\ValidationException::withMessages([
                                'amount' => 'Insufficient cash in active register shift! Available cash in drawer is ' . number_format(max(0, $availableCash)) . ' UGX. Please pay from Shop Safe, Bank, or Mobile Money.'
                            ]);
                        }

                        \App\Models\Expense::create([
                            'cash_drawer_id' => $activeDrawer->id,
                            'payment_account_id' => $account?->id,
                            'user_id' => auth()->id(),
                            'category' => 'Supplier Payment',
                            'amount' => $walletAmount,
                            'description' => "Payment towards Purchase #{$purchase->id} (" . ($purchase->supplier->name ?? 'Supplier') . "). " . ($validated['notes'] ?? ''),
                            'expense_date' => now(),
                        ]);
                    }
                }

                // Sync with Treasury Service for wallet portion only
                $methodOrAccount = $account ?: ($validated['payment_method'] ?? 'Cash');
                $accountName = $account ? $account->name : ($validated['payment_method'] ?? 'Cash');
                \App\Services\TreasuryService::recordOutflow(
                    $methodOrAccount,
                    $walletAmount,
                    'Supplier Payment',
                    $purchase,
                    "Supplier Payment for Purchase #{$purchase->id} (" . ($purchase->supplier->name ?? 'Supplier') . ") via {$accountName}",
                    $validated['notes'] ?? null,
                    auth()->id()
                );
            }
        });

        $parts = [];
        if ($creditAmount > 0) $parts[] = 'UGX ' . number_format($creditAmount) . ' from supplier credit';
        if ($walletAmount > 0) $parts[] = 'UGX ' . number_format($walletAmount) . ' from wallet';

        return redirect()->back()->with('success', 'Supplier payment recorded: ' . implode(' + ', $parts) . '.');
    }
}
