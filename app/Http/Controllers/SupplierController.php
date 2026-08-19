<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Supplier;
use Inertia\Inertia;

class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $query = Supplier::query();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('contact_name', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $suppliers = $query->orderBy('name')->paginate(10)->through(function($supplier) {
            $supplier->recalculateBalance();
            return $supplier;
        })->withQueryString();

        $totalSuppliers = Supplier::count();
        $pendingOrders = \App\Models\Purchase::where('status', 'Pending')->count();
        $totalSpend = \App\Models\Purchase::sum('total_amount');

        return Inertia::render('Suppliers/Index', [
            'suppliers' => $suppliers,
            'filters' => $request->only(['search']),
            'summary' => [
                'total_suppliers' => $totalSuppliers,
                'pending_orders' => $pendingOrders,
                'total_spend' => $totalSpend,
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
        return redirect()->back();
    }

    public function show(Supplier $supplier)
    {
        $supplier->recalculateBalance();

        $supplier->load(['purchases' => function($query) {
            $query->orderBy('purchase_date', 'desc')->with('items.product.brand');
        }]);

        return Inertia::render('Suppliers/Show', [
            'supplier' => $supplier
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
        return redirect()->back();
    }

    public function destroy(Supplier $supplier)
    {
        if ($supplier->balance > 0) {
            return redirect()->back()->withErrors(['error' => 'Cannot delete supplier with an outstanding balance.']);
        }
        $supplier->delete();
        return redirect()->route('suppliers.index');
    }
}
