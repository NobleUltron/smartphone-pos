<?php

namespace App\Http\Controllers;

use App\Models\Repair;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class RepairController extends Controller
{
    public function index(Request $request)
    {
        $query = Repair::query();

        if ($request->search) {
            $query->where('customer_name', 'like', "%{$request->search}%")
                  ->orWhere('customer_phone', 'like', "%{$request->search}%")
                  ->orWhere('repair_code', 'like', "%{$request->search}%")
                  ->orWhere('device_model', 'like', "%{$request->search}%");
        }

        if ($request->status && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        $repairs = $query->with(['user', 'customer', 'parts.brand', 'sale.layawayPayments'])->latest()->paginate(10)->withQueryString();

        // Customers fetched below with full fields

        $products = \App\Models\Product::whereHas('category', function($q) {
                            $q->where('name', 'Repair Parts & Services');
                        })
                        ->select('id', 'model_name', 'selling_price', 'quantity', 'category_id', 'brand_id')
                        ->with(['category', 'brand']) // Just in case we want nicer names
                        ->get()
                        ->map(function ($product) {
                            $name = $product->model_name;
                            if ($product->brand) $name = $product->brand->name . ' ' . $name;
                            return [
                                'id' => $product->id,
                                'name' => $name,
                                'price' => $product->selling_price,
                                'stock' => $product->quantity
                            ];
                        });

        $customers = \App\Models\Customer::orderBy('name')->get();
        $technicians = \App\Models\User::where('role', 'technician')->orderBy('name')->get();

        $stats = [
            'total' => Repair::count(),
            'pending' => Repair::where('status', 'Pending')->count(),
            'in_progress' => Repair::where('status', 'In Progress')->count(),
            'completed' => Repair::whereIn('status', ['Completed', 'Delivered'])->count(),
            'total_value' => Repair::whereNotIn('status', ['Cancelled'])->sum('estimated_cost'),
        ];

        return Inertia::render('Repairs/Index', [
            'repairs' => $repairs,
            'filters' => $request->only(['search', 'status']),
            'products' => $products,
            'customers' => $customers,
            'technicians' => $technicians,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:255',
            'device_model' => 'required|string|max:255',
            'imei_serial' => 'nullable|string|max:255',
            'device_passcode' => 'nullable|string|max:255',
            'issue_description' => 'required|string',
            'estimated_cost' => 'required|numeric|min:0',
            'deposit' => 'required|numeric|min:0',
            'parts' => 'nullable|array',
            'parts.*.product_id' => 'required|exists:products,id',
            'parts.*.quantity' => 'required|integer|min:1',
            'pre_repair_checklist' => 'nullable|array',
            'expected_completion_date' => 'nullable|date',
            'technician_id' => 'nullable|exists:users,id',
        ]);

        // If a new customer is provided (no ID) and we have name & phone, we could optionally auto-create them.
        // For now, we will create the customer automatically if customer_id is empty to ensure history linkage.
        if (empty($validated['customer_id']) && !empty($validated['customer_name'])) {
            $customer = \App\Models\Customer::firstOrCreate(
                ['phone' => $validated['customer_phone']],
                ['name' => $validated['customer_name']]
            );
            $validated['customer_id'] = $customer->id;
        }

        // Generate unique repair code e.g., REP-ABCD12
        $validated['repair_code'] = 'REP-' . strtoupper(Str::random(6));
        $validated['user_id'] = auth()->id();
        $validated['status'] = 'Pending';

        $parts = $validated['parts'] ?? [];
        unset($validated['parts']);

        // Validate stock before creating repair
        foreach ($parts as $partData) {
            $product = \App\Models\Product::find($partData['product_id']);
            if (!$product || $product->quantity < $partData['quantity']) {
                $productName = $product ? $product->name : 'Unknown';
                return back()->withInput()->withErrors(['parts' => "Insufficient stock for part: {$productName}. Available: " . ($product->quantity ?? 0)]);
            }
        }

        if ($validated['deposit'] > 0) {
            $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
                ->where('status', 'open')
                ->first();

            if (!$activeDrawer) {
                return back()->withInput()->withErrors(['deposit' => 'You must open a shift (Cash Drawer) before collecting a deposit.']);
            }
        } else {
            $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())->where('status', 'open')->first();
        }

        \Log::info('Creating repair with parts:', ['parts' => $parts]);

        \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $parts, $activeDrawer) {
            $repair = Repair::create($validated);
            \Log::info('Created repair ID: ' . $repair->id);

            // Create Initial Sale
            $sale = \App\Models\Sale::create([
                'user_id' => auth()->id(),
                'cash_drawer_id' => $activeDrawer ? $activeDrawer->id : null,
                'customer_id' => $repair->customer_id,
                'repair_id' => $repair->id,
                'total_amount' => $repair->estimated_cost,
                'discount' => 0,
                'trade_in_value' => 0,
                'final_amount' => $repair->estimated_cost,
                'payment_method' => 'Layaway',
                'payment_status' => 'Partial',
            ]);

            if ($repair->deposit > 0 && $activeDrawer) {
                \App\Models\LayawayPayment::create([
                    'sale_id' => $sale->id,
                    'cash_drawer_id' => $activeDrawer->id,
                    'amount_paid' => $repair->deposit,
                    'payment_method' => 'Cash',
                    'payment_date' => now()
                ]);
            }

            foreach ($parts as $partData) {
                $product = \App\Models\Product::find($partData['product_id']);
                if ($product && $product->quantity >= $partData['quantity']) {
                    $repair->parts()->attach($product->id, [
                        'quantity' => $partData['quantity'],
                        'price' => $product->selling_price,
                        'cost' => $product->cost_price,
                    ]);
                    $product->decrement('quantity', $partData['quantity']);
                    \Log::info('Attached part ' . $product->id . ' to repair ' . $repair->id);
                } else {
                    \Log::info('Failed to attach part - stock insufficient or missing', ['part' => $partData]);
                }
            }
        });

        return redirect()->back()->with('success', 'Repair ticket created successfully.');
    }

    public function update(Request $request, Repair $repair)
    {
        $validated = $request->validate([
            'status' => 'required|in:Pending,In Progress,Completed,Delivered,Cancelled',
            'technician_notes' => 'nullable|string',
            'issue_description' => 'nullable|string',
            'estimated_cost' => 'nullable|numeric|min:0',
            'pre_repair_checklist' => 'nullable|array',
            'expected_completion_date' => 'nullable|date',
            'technician_id' => 'nullable|exists:users,id',
        ]);

        $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        \DB::beginTransaction();
        try {
            if ($validated['status'] === 'Cancelled' && $repair->status !== 'Cancelled') {
                if ($repair->sale) {
                    $refundAmount = $repair->sale->layawayPayments()->sum('amount_paid');
                    if ($refundAmount > 0) {
                        if (!$activeDrawer) {
                            return redirect()->back()->withErrors(['error' => 'You must have an open cash drawer to cancel a repair and refund the deposit.']);
                        }
                        if ($activeDrawer->calculateExpectedCash() < $refundAmount) {
                            return redirect()->back()->withErrors(['error' => 'Insufficient cash in drawer to process this refund. Please record a "Cash In" from management first.']);
                        }
                    }

                    $repair->sale->update(['payment_status' => 'Refunded']);

                    if ($refundAmount > 0) {
                        \App\Models\Expense::create([
                            'cash_drawer_id' => $activeDrawer->id,
                            'user_id' => auth()->id(),
                            'category' => 'Refund',
                            'amount' => $refundAmount,
                            'expense_date' => now(),
                            'description' => "Deposit Refund for Cancelled Repair #{$repair->id}",
                            'recorded_by' => auth()->id(),
                        ]);
                    }
                }

                // Restore inventory for all attached parts
                foreach ($repair->parts as $part) {
                    $product = \App\Models\Product::find($part->id);
                    if ($product) {
                        $product->increment('quantity', $part->pivot->quantity);
                    }
                }

                // Detach parts
                $repair->parts()->detach();

                // Update repair to cancelled state — zeroing cost and deposit prevents any double-refund if later deleted
                $repair->update([
                    'status' => 'Cancelled',
                    'estimated_cost' => 0,
                    'deposit' => 0,
                    'technician_notes' => $validated['technician_notes'] ?? $repair->technician_notes,
                ]);

                // Zero out the Sale totals so accounting is clean
                if ($repair->sale) {
                    $repair->sale->update([
                        'total_amount' => 0,
                        'final_amount' => 0,
                    ]);
                }

                \DB::commit();
                return redirect()->back()->with('success', 'Repair cancelled. Parts have been restocked and the deposit refunded.');
            }

            // Handle finalizing sale if delivered
            if ($validated['status'] === 'Delivered' && $repair->status !== 'Delivered') {
                if (!$activeDrawer) {
                    return redirect()->back()->withErrors(['error' => 'You must have an open cash drawer to deliver a repair.']);
                }

                $validatedDelivery = $request->validate([
                    'payment_method' => 'required|in:Cash,Bank Transfer,MTN MoMo,Airtel Money,Layaway',
                ]);

                if ($repair->sale) {
                    // Use actual payments sum for accurate balance — not the denormalized deposit field
                    $totalActuallyPaid = $repair->sale->layawayPayments()->sum('amount_paid');
                    $balance = $repair->estimated_cost - $totalActuallyPaid;
                    $repair->sale->update([
                        'payment_status' => 'Paid',
                    ]);

                    if ($balance > 0) {
                        \App\Models\LayawayPayment::create([
                            'sale_id' => $repair->sale->id,
                            'cash_drawer_id' => $activeDrawer->id,
                            'amount_paid' => $balance,
                            'payment_method' => $validatedDelivery['payment_method'],
                            'payment_date' => now()
                        ]);
                        $repair->update(['deposit' => $repair->estimated_cost]);
                    }
                }
            }

            // Standard update
            $repair->update([
                'status' => $validated['status'],
                'technician_notes' => $validated['technician_notes'] ?? $repair->technician_notes,
                'issue_description' => $validated['issue_description'] ?? $repair->issue_description,
                'estimated_cost' => $validated['estimated_cost'] ?? $repair->estimated_cost,
                'technician_id' => array_key_exists('technician_id', $validated) ? $validated['technician_id'] : $repair->technician_id,
            ]);

            // Keep the Sale's total_amount in sync with the Repair's estimated_cost if it exists
            if ($repair->sale && $validated['status'] !== 'Delivered') {
                $repair->sale->update([
                    'total_amount' => $repair->estimated_cost,
                    'final_amount' => $repair->estimated_cost,
                ]);
            }

            \DB::commit();
            return redirect()->back()->with('success', 'Repair ticket updated successfully.');
        } catch (\Exception $e) {
            \DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Update failed: ' . $e->getMessage()]);
        }
    }

    public function destroy(Repair $repair)
    {
        $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        // Use repair->deposit as the refund amount.
        // For active repairs this reflects what was paid; for cancelled repairs deposit is already
        // zeroed out during cancellation, so destroy() will naturally skip the refund.
        $refundAmount = $repair->deposit ?? 0;

        if ($refundAmount > 0) {
            if (!$activeDrawer) {
                return redirect()->back()->withErrors(['error' => 'You must have an open cash drawer to delete a repair and refund the deposit.']);
            }
            if ($activeDrawer->calculateExpectedCash() < $refundAmount) {
                return redirect()->back()->withErrors(['error' => 'Insufficient cash in drawer to process this refund. Please record a "Cash In" from management first.']);
            }
        }

        \Illuminate\Support\Facades\DB::transaction(function () use ($repair, $activeDrawer, $refundAmount) {
            // Restore inventory for all attached parts
            foreach ($repair->parts as $part) {
                $product = \App\Models\Product::find($part->id);
                if ($product) {
                    $product->increment('quantity', $part->pivot->quantity);
                }
            }

            // Detach parts
            $repair->parts()->detach();
            
            if ($repair->sale) {
                $repair->sale->update(['payment_status' => 'Refunded']);

                // Use the outer $refundAmount (based on repair->deposit).
                // Cancelled repairs have deposit = 0, so this correctly skips the expense entry.
                if ($refundAmount > 0) {
                    \App\Models\Expense::create([
                        'cash_drawer_id' => $activeDrawer->id,
                        'user_id' => auth()->id(),
                        'category' => 'Refund',
                        'amount' => $refundAmount,
                        'expense_date' => now(),
                        'description' => "Deposit Refund for Deleted Repair #{$repair->id}",
                        'recorded_by' => auth()->id(),
                    ]);
                }
            }
            
            $repair->delete();
        });

        return redirect()->back()->with('success', 'Repair ticket deleted, parts restored, and deposit refunded.');
    }

    public function printTicket(Repair $repair)
    {
        $repair->load(['customer', 'user', 'parts.brand']);
        return Inertia::render('Repairs/PrintTicket', [
            'repair' => $repair
        ]);
    }

    public function storePayment(Request $request, Repair $repair)
    {
        $validated = $request->validate([
            'amount_paid' => 'required|numeric|min:1',
            'payment_method' => 'required|in:Cash,Bank Transfer,MTN MoMo,Airtel Money',
        ]);

        $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        if (!$activeDrawer) {
            return redirect()->back()->withErrors(['error' => 'You must have an open cash drawer to record a payment.']);
        }

        \DB::beginTransaction();
        try {
            // Find or create sale
            $sale = $repair->sale;
            if (!$sale) {
                $sale = \App\Models\Sale::create([
                    'user_id' => auth()->id(),
                    'cash_drawer_id' => $activeDrawer->id,
                    'customer_id' => $repair->customer_id,
                    'repair_id' => $repair->id,
                    'total_amount' => $repair->estimated_cost,
                    'final_amount' => $repair->estimated_cost,
                    'payment_method' => 'Layaway',
                    'payment_status' => 'Partial',
                ]);
            }

            \App\Models\LayawayPayment::create([
                'sale_id' => $sale->id,
                'cash_drawer_id' => $activeDrawer->id,
                'amount_paid' => $validated['amount_paid'],
                'payment_method' => $validated['payment_method'],
                'payment_date' => now(),
            ]);

            $totalPaid = $sale->layawayPayments()->sum('amount_paid');
            $repair->update(['deposit' => $totalPaid]);

            if ($totalPaid >= $sale->final_amount && $repair->status !== 'Delivered') {
                 // We don't automatically mark it delivered, but we can mark the sale as paid if they fully pay off the repair before delivery.
                 $sale->update(['payment_status' => 'Paid']);
            }

            \DB::commit();
            return redirect()->back()->with('success', 'Repair payment recorded successfully.');
        } catch (\Exception $e) {
            \DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to record payment: ' . $e->getMessage()]);
        }
    }
}
