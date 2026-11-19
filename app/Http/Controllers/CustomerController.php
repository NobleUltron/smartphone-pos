<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $type = $request->input('type', 'all');
        $sort = $request->input('sort', 'newest');

        $query = Customer::withCount([
            'sales' => fn ($q) => $q->where('payment_status', '!=', 'Refunded'),
            'invoices' => fn ($q) => $q->where('status', '!=', 'Cancelled'),
        ])->withSum([
            'sales' => fn ($q) => $q->where('payment_status', '!=', 'Refunded'),
        ], 'final_amount');

        if ($request->filled('search')) {
            $term = '%' . strtolower(trim($request->search)) . '%';
            $query->where(function ($q) use ($term) {
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(phone) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(COALESCE(company_name, \'\')) LIKE ?', [$term])
                  ->orWhereRaw('LOWER(COALESCE(email, \'\')) LIKE ?', [$term]);
            });
        }

        if ($type === 'corporate') {
            $query->whereNotNull('company_name')->whereRaw("TRIM(company_name) != ''");
        } elseif ($type === 'individual') {
            $query->where(function ($q) {
                $q->whereNull('company_name')->orWhereRaw("TRIM(company_name) = ''");
            });
        }

        if ($sort === 'top_spenders') {
            $query->orderByRaw('sales_sum_final_amount DESC NULLS LAST')->orderBy('created_at', 'desc');
        } elseif ($sort === 'most_orders') {
            $query->orderByDesc('sales_count')->orderBy('created_at', 'desc');
        } else {
            $query->orderBy('created_at', 'desc');
        }

        $customers = $query->paginate(10)->withQueryString();

        $totalCustomers = Customer::count();
        $corporateCustomers = Customer::whereNotNull('company_name')->whereRaw("TRIM(company_name) != ''")->count();
        $totalLtv = (float) \App\Models\Sale::whereNotNull('customer_id')
            ->where('payment_status', '!=', 'Refunded')
            ->sum('final_amount');
        $averageSpend = $totalCustomers > 0 ? round($totalLtv / $totalCustomers) : 0;

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters' => [
                'search' => $request->input('search', ''),
                'type' => $type,
                'sort' => $sort,
            ],
            'summary' => [
                'total_customers' => $totalCustomers,
                'corporate_customers' => $corporateCustomers,
                'total_ltv' => $totalLtv,
                'average_spend' => $averageSpend,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'tin_number' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms_days' => 'nullable|integer|min:0',
            'address' => 'nullable|string'
        ]);

        $customer = Customer::create($validated);

        \App\Models\ActivityLog::log(
            'customer_created',
            'Customers',
            "Created customer {$customer->name}" . ($customer->company_name ? " ({$customer->company_name})" : ''),
            ['customer_id' => $customer->id]
        );

        return response()->json(['message' => 'Customer created successfully.', 'customer' => $customer]);
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'phone' => 'required|string|max:50',
            'email' => 'nullable|email|max:255',
            'tin_number' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
            'payment_terms_days' => 'nullable|integer|min:0',
            'address' => 'nullable|string'
        ]);

        $customer->update($validated);

        \App\Models\ActivityLog::log(
            'customer_updated',
            'Customers',
            "Updated customer {$customer->name}",
            ['customer_id' => $customer->id]
        );

        return response()->json(['message' => 'Customer updated successfully.', 'customer' => $customer]);
    }

    public function destroy(Customer $customer)
    {
        if ($customer->sales()->exists()) {
            return response()->json(['error' => 'Cannot delete customer with existing sales records.'], 400);
        }
        if ($customer->invoices()->exists()) {
            return response()->json(['error' => 'Cannot delete customer with existing corporate invoices.'], 400);
        }
        if ($customer->quotations()->exists()) {
            return response()->json(['error' => 'Cannot delete customer with existing quotations.'], 400);
        }

        $name = $customer->name;
        $id = $customer->id;
        $customer->delete();

        \App\Models\ActivityLog::log(
            'customer_deleted',
            'Customers',
            "Deleted customer {$name}",
            ['customer_id' => $id]
        );

        return response()->json(['message' => 'Customer deleted successfully.']);
    }

    public function history(Customer $customer)
    {
        $history = $customer->sales()
            ->with(['saleItems.product.brand', 'saleItems.deviceImei.product.brand', 'user'])
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
                        $prod = $item->product ?? $item->deviceImei?->product;
                        if ($prod) {
                            $brandName = $prod->brand ? $prod->brand->name : '';
                            $productName = trim($brandName . ' ' . $prod->model_name);
                        }
                        if ($item->deviceImei?->imei) {
                            $productName .= ' (IMEI: ' . $item->deviceImei->imei . ')';
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

        $query = $customer->sales()->with(['saleItems.product.brand', 'saleItems.deviceImei.product.brand', 'user']);

        if ($status === 'paid') {
            $query->where('payment_status', 'Paid');
        } elseif ($status === 'unpaid') {
            $query->whereIn('payment_status', ['Unpaid', 'Partial']);
        }

        if ($startDate) {
            $query->whereRaw('DATE(COALESCE(sale_date, created_at)) >= ?', [$startDate]);
        }

        if ($endDate) {
            $query->whereRaw('DATE(COALESCE(sale_date, created_at)) <= ?', [$endDate]);
        }

        $sales = $query->orderBy('created_at', 'desc')->get();

        $totalSpent = (float) $customer->sales()->where('payment_status', '!=', 'Refunded')->sum('final_amount');
        
        $totalPaidDirect = (float) $customer->sales()
            ->where('payment_status', 'Paid')
            ->whereDoesntHave('layawayPayments')
            ->sum('final_amount');
        $totalLayawayPaid = (float) \App\Models\LayawayPayment::whereHas('sale', function ($q) use ($customer) {
            $q->where('customer_id', $customer->id)
              ->where('payment_status', '!=', 'Refunded');
        })->sum('amount_paid');

        $totalPaid = $totalPaidDirect + $totalLayawayPaid;
        $outstandingBalance = max(0, $totalSpent - $totalPaid);

        $summary = [
            'total_purchases_count' => $customer->sales()->where('payment_status', '!=', 'Refunded')->count(),
            'total_spent' => $totalSpent,
            'total_paid' => $totalPaid,
            'outstanding_balance' => $outstandingBalance,
            'active_layaways_count' => $customer->sales()->whereIn('payment_status', ['Unpaid', 'Partial'])->count(),
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
