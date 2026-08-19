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
            'paid_amount' => 'required|numeric|min:0|lte:total_amount|max:9999999999',
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

        DB::transaction(function () use ($validated) {
            $payment_status = 'Unpaid';
            if ($validated['paid_amount'] > 0) {
                if ($validated['paid_amount'] >= $validated['total_amount']) {
                    $payment_status = 'Paid';
                } else {
                    $payment_status = 'Partial';
                }
            }

            $purchase = Purchase::create([
                'supplier_id' => $validated['supplier_id'],
                'reference_no' => $validated['reference_no'],
                'total_amount' => $validated['total_amount'],
                'paid_amount' => $validated['paid_amount'],
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

            // Update supplier balance
            $balanceIncrease = $validated['total_amount'] - $validated['paid_amount'];
            if ($balanceIncrease > 0) {
                $supplier = Supplier::find($validated['supplier_id']);
                $supplier->balance += $balanceIncrease;
                $supplier->save();
            }
        });

        return redirect()->back();
    }

    public function create(Request $request)
    {
        $suppliers = Supplier::orderBy('name')->get();
        // Eager load brand so we can show proper names
        $products = Product::with('brand')->orderBy('model_name')->get();
        
        return Inertia::render('Purchases/Create', [
            'suppliers' => $suppliers,
            'products' => $products,
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

                // Delete items and purchase
                $purchase->items()->delete();
                $purchase->delete();
            });

            return redirect()->back();
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function receive(Purchase $purchase)
    {
        if ($purchase->status === 'Received') {
            return redirect()->back()->withErrors(['error' => 'Purchase is already received.']);
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

            return redirect()->back();
        } catch (\Exception $e) {
            return redirect()->back()->withErrors(['error' => $e->getMessage()]);
        }
    }

    public function recordPayment(Request $request, Purchase $purchase)
    {
        $remaining = $purchase->total_amount - $purchase->paid_amount;

        if ($remaining <= 0) {
            return redirect()->back()->withErrors(['amount' => 'This purchase is already paid in full.']);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1|max:' . $remaining,
            'payment_method' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ], [
            'amount.max' => 'Payment amount cannot exceed remaining balance of ' . number_format($remaining) . ' UGX.',
            'amount.min' => 'Payment amount must be at least 1 UGX.',
        ]);

        DB::transaction(function () use ($purchase, $validated) {
            $purchase->paid_amount += $validated['amount'];
            if ($purchase->paid_amount >= $purchase->total_amount) {
                $purchase->payment_status = 'Paid';
            } else {
                $purchase->payment_status = 'Partial';
            }
            $purchase->save();
            $purchase->supplier?->recalculateBalance();

            // Record in Cash Drawer Expenses if open drawer exists and payment method is Cash
            $paymentMethod = $validated['payment_method'] ?? 'Cash';
            if (strtolower($paymentMethod) === 'cash') {
                $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                    ->where('status', 'open')
                    ->first();

                if (!$activeDrawer) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'payment_method' => 'You must have an open shift to pay cash from drawer. Please open a shift or select Mobile Money / Bank Transfer.'
                    ]);
                }

                $availableCash = $activeDrawer->calculateExpectedCash();
                if ($validated['amount'] > $availableCash) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'amount' => 'Insufficient cash in active shift! Available cash in drawer is ' . number_format(max(0, $availableCash)) . ' UGX. Please add starting cash float or use Mobile Money / Bank Transfer.'
                    ]);
                }

                \App\Models\Expense::create([
                    'cash_drawer_id' => $activeDrawer->id,
                    'user_id' => auth()->id(),
                    'category' => 'Supplier Payment',
                    'amount' => $validated['amount'],
                    'description' => "Payment towards Purchase #{$purchase->id} (" . ($purchase->supplier->name ?? 'Supplier') . "). " . ($validated['notes'] ?? ''),
                    'expense_date' => now(),
                ]);
            }
        });

        return redirect()->back()->with('success', 'Supplier payment of ' . number_format($validated['amount']) . ' UGX recorded successfully.');
    }
}
