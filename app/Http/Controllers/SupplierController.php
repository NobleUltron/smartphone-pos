<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Supplier;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::withCount(['purchases' => fn($q) => $q->where('status', '!=', 'Cancelled')])
            ->withSum(['purchases' => fn($q) => $q->where('status', '!=', 'Cancelled')], 'total_amount')
            ->withSum(['purchases' => fn($q) => $q->where('status', '!=', 'Cancelled')], 'paid_amount')
            ->withMax('purchases', 'purchase_date');

        if ($request->filled('search')) {
            $search = '%' . strtolower($request->input('search')) . '%';
            $query->where(function($q) use ($search) {
                $q->whereRaw('LOWER(name) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(contact_name) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(phone) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(email) LIKE ?', [$search])
                  ->orWhereRaw('LOWER(address) LIKE ?', [$search]);
            });
        }

        $balanceFilter = $request->input('balance_filter', 'all');
        if ($balanceFilter === 'owing') {
            $query->whereRaw("COALESCE((SELECT SUM(total_amount - paid_amount) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status != 'Cancelled'), 0) > 0");
        } elseif ($balanceFilter === 'settled') {
            $query->whereRaw("COALESCE((SELECT SUM(total_amount - paid_amount) FROM purchases WHERE purchases.supplier_id = suppliers.id AND purchases.status != 'Cancelled'), 0) <= 0");
        } elseif ($balanceFilter === 'has_credit') {
            $query->where('credit_balance', '>', 0);
        }

        $suppliers = $query->orderBy('name')->paginate(10)->through(function($supplier) {
            $total = (float) ($supplier->purchases_sum_total_amount ?? 0);
            $paid = (float) ($supplier->purchases_sum_paid_amount ?? 0);
            $supplier->balance = max(0, $total - $paid);
            return $supplier;
        })->withQueryString();

        $totalSuppliers = Supplier::count();
        $pendingOrders = \App\Models\Purchase::where('status', 'Pending')->count();
        $totalSpend = (float) \App\Models\Purchase::where('status', '!=', 'Cancelled')->sum('total_amount');
        $totalPayable = (float) \App\Models\Purchase::where('status', '!=', 'Cancelled')
            ->selectRaw('COALESCE(SUM(CASE WHEN total_amount - paid_amount > 0 THEN total_amount - paid_amount ELSE 0 END), 0) as total')
            ->value('total');
        $totalCredit = (float) Supplier::sum('credit_balance');

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => $request->only(['search', 'balance_filter']),
            'summary' => [
                'total_suppliers' => $totalSuppliers,
                'pending_orders' => $pendingOrders,
                'total_spend' => $totalSpend,
                'total_payable' => $totalPayable,
                'total_credit' => $totalCredit,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string'
        ]);

        Supplier::create($validated);
        return redirect()->back()->with('success', 'Supplier added successfully.');
    }

    public function show(Supplier $supplier)
    {
        $supplier->recalculateBalance();

        $supplier->load([
            'purchases' => function($query) {
                $query->orderBy('purchase_date', 'desc')->with('items.product.brand');
            },
            'supplierReturns' => function($query) {
                $query->orderBy('created_at', 'desc')
                    ->with(['purchase', 'deviceImei.product.brand', 'replacementImei.product.brand', 'paymentAccount', 'user']);
            },
        ]);

        $paymentAccounts = \App\Models\PaymentAccount::where('is_active', true)->where('is_personal', false)
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return Inertia::render('Suppliers/Show', [
            'supplier' => $supplier,
            'paymentAccounts' => $paymentAccounts,
        ]);
    }

    public function update(Request $request, Supplier $supplier)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'contact_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string'
        ]);

        $supplier->update($validated);
        return redirect()->back()->with('success', 'Supplier updated successfully.');
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->recalculateBalance() > 0) {
            return redirect()->back()->withErrors(['error' => 'Cannot delete supplier with an outstanding balance.']);
        }
        if ($supplier->purchases()->exists()) {
            return redirect()->back()->withErrors(['error' => 'Cannot delete supplier with recorded purchase history.']);
        }
        $supplier->delete();
        return redirect()->route('suppliers.index')->with('success', 'Supplier deleted successfully.');
    }
}
