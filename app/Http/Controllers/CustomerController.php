<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index()
    {
        $customers = Customer::withCount(['sales' => function ($query) {
            $query->where('payment_status', '!=', 'Refunded');
        }])
        ->withSum(['sales' => function ($query) {
            $query->where('payment_status', '!=', 'Refunded');
        }], 'final_amount')
        ->orderBy('created_at', 'desc')
        ->paginate(10);
            
        $totalCustomers = Customer::count();
        $totalLtv = \App\Models\Sale::where('payment_status', '!=', 'Refunded')->sum('final_amount');
        $averageSpend = $totalCustomers > 0 ? $totalLtv / $totalCustomers : 0;

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'summary' => [
                'total_customers' => $totalCustomers,
                'total_ltv' => $totalLtv,
                'average_spend' => $averageSpend,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string'
        ]);

        $customer = Customer::create($validated);

        return response()->json(['message' => 'Customer created successfully.', 'customer' => $customer]);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string'
        ]);

        $customer->update($validated);

        return response()->json(['message' => 'Customer updated successfully.', 'customer' => $customer]);
    }

    public function destroy(Customer $customer)
    {
        if ($customer->sales()->count() > 0) {
            return response()->json(['error' => 'Cannot delete customer with existing sales records.'], 400);
        }

        $customer->delete();

        return response()->json(['message' => 'Customer deleted successfully.']);
    }

    public function history(Customer $customer)
    {
        $history = $customer->sales()
            ->with(['saleItems.product.brand', 'user'])
            ->orderBy('sale_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->id,
                    'receipt_number' => $sale->receipt_number,
                    'sale_date' => $sale->sale_date ? $sale->sale_date->format('Y-m-d H:i:s') : $sale->created_at->format('Y-m-d H:i:s'),
                    'total_amount' => $sale->total_amount,
                    'discount' => $sale->discount,
                    'final_amount' => $sale->final_amount,
                    'payment_method' => $sale->payment_method,
                    'payment_status' => $sale->payment_status,
                    'cashier' => $sale->user ? $sale->user->name : 'System',
                    'items' => $sale->saleItems->map(function ($item) {
                        $productName = 'Unknown Product';
                        if ($item->product) {
                            $brandName = $item->product->brand ? $item->product->brand->name : '';
                            $productName = trim($brandName . ' ' . $item->product->model);
                        }
                        
                        return [
                            'id' => $item->id,
                            'product_name' => $productName,
                            'quantity' => $item->quantity,
                            'unit_price' => $item->price,
                            'subtotal' => $item->price * ($item->quantity ?: 1)
                        ];
                    })
                ];
            });

        return response()->json([
            'customer' => $customer,
            'history' => $history
        ]);
    }

    public function generateStatement(Customer $customer, Request $request)
    {
        $status = $request->query('status', 'all');
        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $outputMode = $request->query('mode', 'download');

        $query = $customer->sales()->with(['saleItems.product.brand', 'user']);

        if ($status === 'paid') {
            $query->where('payment_status', 'Paid');
        } elseif ($status === 'unpaid') {
            $query->whereIn('payment_status', ['Pending', 'Partial', 'Layaway']);
        }

        if ($startDate) {
            $query->whereDate('sale_date', '>=', $startDate);
        }

        if ($endDate) {
            $query->whereDate('sale_date', '<=', $endDate);
        }

        $sales = $query->orderBy('created_at', 'desc')->get();

        $totalSpent = $customer->sales()->where('payment_status', '!=', 'Refunded')->sum('final_amount');
        
        $totalPaidDirect = $customer->sales()->where('payment_status', 'Paid')->sum('final_amount');
        $totalLayawayPaid = \App\Models\LayawayPayment::whereHas('sale', function ($q) use ($customer) {
            $q->where('customer_id', $customer->id);
        })->sum('amount_paid');

        $totalPaid = $totalPaidDirect + $totalLayawayPaid;
        $outstandingBalance = max(0, $totalSpent - $totalPaid);

        $summary = [
            'total_purchases_count' => $customer->sales()->where('payment_status', '!=', 'Refunded')->count(),
            'total_spent' => $totalSpent,
            'total_paid' => $totalPaid,
            'outstanding_balance' => $outstandingBalance,
            'active_layaways_count' => $customer->sales()->whereIn('payment_status', ['Pending', 'Partial'])->count(),
        ];

        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS Kampala'),
            'shop_address' => \App\Models\Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => \App\Models\Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
        ];

        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.customer_statement', compact('customer', 'sales', 'summary', 'settings'))
            ->setPaper('a4', 'portrait');

        $filename = 'customer-statement-' . \Str::slug($customer->name) . '-' . date('Ymd') . '.pdf';

        if ($outputMode === 'stream') {
            return $pdf->stream($filename);
        }

        return $pdf->download($filename);
    }
}
