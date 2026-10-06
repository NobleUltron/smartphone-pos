<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\DeviceImei;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoicePayment;
use App\Models\PaymentAccount;
use App\Models\Product;
use App\Models\Setting;
use App\Services\TreasuryService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        $query = Invoice::with(['customer', 'user', 'payments'])->latest();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'ilike', "%{$search}%")
                    ->orWhere('po_number', 'ilike', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('company_name', 'ilike', "%{$search}%")
                            ->orWhere('phone', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        $invoices = $query->paginate(15)->withQueryString();

        // Update overdue status dynamically on load
        foreach ($invoices as $inv) {
            if ($inv->payment_status !== 'Paid' && now()->gt($inv->due_date) && $inv->payment_status !== 'Overdue') {
                $inv->update(['payment_status' => 'Overdue']);
            }
        }

        $totalInvoiced = Invoice::where('status', '!=', 'Cancelled')->sum('total_amount');
        $totalCollected = InvoicePayment::sum('amount');
        $totalOutstanding = max(0, $totalInvoiced - $totalCollected);
        $overdueAmount = Invoice::where('payment_status', 'Overdue')
            ->selectRaw('SUM(total_amount - paid_amount) as remaining')
            ->value('remaining') ?? 0;

        $metrics = [
            'total_invoiced' => $totalInvoiced,
            'total_collected' => $totalCollected,
            'total_outstanding' => $totalOutstanding,
            'overdue_amount' => $overdueAmount,
            'overdue_count' => Invoice::where('payment_status', 'Overdue')->count(),
            'pending_count' => Invoice::whereIn('payment_status', ['Unpaid', 'Partial'])->count(),
        ];

        return Inertia::render('Invoices/Index', [
            'invoices' => $invoices,
            'filters' => $request->only(['search', 'payment_status']),
            'metrics' => $metrics,
        ]);
    }

    public function create()
    {
        $customers = Customer::orderBy('name')->get();
        $products = Product::with('brand')->orderBy('model_name')->get();
        $paymentAccounts = PaymentAccount::where('is_active', true)->orderBy('name')->get();

        $defaultTerms = Setting::get('invoice_terms', "1. Payment is strictly due according to agreed credit terms.\n2. Remit wire transfers to our official bank account stated on this invoice.\n3. Goods once received in good condition cannot be returned.\n4. For any billing queries, contact our finance department.");

        return Inertia::render('Invoices/Create', [
            'customers' => $customers,
            'products' => $products,
            'paymentAccounts' => $paymentAccounts,
            'nextNumber' => Invoice::generateNumber(),
            'defaultTerms' => $defaultTerms,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'customer_name' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'customer_phone' => 'nullable|string|max:50',
            'po_number' => 'nullable|string|max:100',
            'issue_date' => 'required|date',
            'due_date' => 'required|date|after_or_equal:issue_date',
            'payment_terms' => 'required|string|max:50',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'discount' => 'nullable|numeric|min:0',
            'terms_conditions' => 'nullable|string',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.type' => 'required|in:product,service',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.item_name' => 'required|string|max:255',
            'items.*.description' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        return DB::transaction(function () use ($validated) {
            $customerId = $validated['customer_id'] ?? null;

            if (!$customerId && (!empty($validated['customer_name']) || !empty($validated['company_name']))) {
                $name = $validated['customer_name'] ?: $validated['company_name'];
                $phone = $validated['customer_phone'] ?: 'N/A';
                $customer = Customer::create([
                    'name' => $name,
                    'company_name' => $validated['company_name'] ?? null,
                    'phone' => $phone,
                ]);
                $customerId = $customer->id;
            }

            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $subtotal += floatval($item['quantity']) * floatval($item['unit_price']);
            }

            $discount = floatval($validated['discount'] ?? 0);
            $taxRate = floatval($validated['tax_rate'] ?? 0);
            $netBeforeTax = max(0, $subtotal - $discount);
            $taxAmount = ($netBeforeTax * $taxRate) / 100;
            $totalAmount = $netBeforeTax + $taxAmount;

            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateNumber(),
                'customer_id' => $customerId,
                'user_id' => auth()->id(),
                'po_number' => $validated['po_number'] ?? null,
                'issue_date' => $validated['issue_date'],
                'due_date' => $validated['due_date'],
                'payment_terms' => $validated['payment_terms'],
                'status' => 'Confirmed',
                'payment_status' => 'Unpaid',
                'subtotal' => $subtotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'discount' => $discount,
                'total_amount' => $totalAmount,
                'paid_amount' => 0,
                'terms_conditions' => $validated['terms_conditions'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $itemData) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $itemData['product_id'] ?? null,
                    'type' => $itemData['type'],
                    'item_name' => $itemData['item_name'],
                    'description' => $itemData['description'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => floatval($itemData['quantity']) * floatval($itemData['unit_price']),
                ]);

                // Decrement inventory for bulk products
                if ($itemData['type'] === 'product' && !empty($itemData['product_id'])) {
                    $prod = Product::find($itemData['product_id']);
                    if ($prod && $prod->type === 'bulk') {
                        $prod->decrement('quantity', $itemData['quantity']);
                    }
                }
            }

            return redirect()->route('invoices.show', $invoice->id)
                ->with('success', "Invoice {$invoice->invoice_number} generated successfully.");
        });
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['customer', 'user', 'quotation', 'items.product.brand', 'payments.paymentAccount', 'payments.user']);
        $paymentAccounts = PaymentAccount::where('is_active', true)->orderBy('type')->orderBy('name')->get();

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
            'paymentAccounts' => $paymentAccounts,
        ]);
    }

    public function recordPayment(Request $request, Invoice $invoice)
    {
        $balanceRemaining = $invoice->balance_due;

        if ($balanceRemaining <= 0) {
            return redirect()->back()->withErrors(['amount' => 'This invoice is already fully paid.']);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:1|max:' . $balanceRemaining,
            'payment_account_id' => 'required|exists:payment_accounts,id',
            'payment_method' => 'nullable|string|max:50',
            'transaction_reference' => 'nullable|string|max:100',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string',
        ], [
            'amount.max' => 'Amount cannot exceed the remaining balance of ' . number_format($balanceRemaining) . ' UGX.',
        ]);

        return DB::transaction(function () use ($validated, $invoice) {
            $paymentAccount = PaymentAccount::find($validated['payment_account_id']);
            $receiptNumber = InvoicePayment::generateReceiptNumber();
            $method = $validated['payment_method'] ?: ($paymentAccount ? $paymentAccount->name : 'Bank Transfer');

            // 1. Create Invoice Payment record
            $payment = InvoicePayment::create([
                'invoice_id' => $invoice->id,
                'payment_account_id' => $paymentAccount->id,
                'user_id' => auth()->id(),
                'receipt_number' => $receiptNumber,
                'amount' => $validated['amount'],
                'payment_method' => $method,
                'transaction_reference' => $validated['transaction_reference'] ?? null,
                'payment_date' => $validated['payment_date'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // 2. Sync Treasury Inflow
            $desc = "Corporate Payment for Invoice #{$invoice->invoice_number} (" . ($invoice->customer->company_name ?: $invoice->customer->name) . ")";
            if (!empty($validated['transaction_reference'])) {
                $desc .= " - Ref: {$validated['transaction_reference']}";
            }

            TreasuryService::recordInflow(
                $paymentAccount,
                floatval($validated['amount']),
                'Invoice Payment',
                $invoice,
                $desc,
                $validated['transaction_reference'] ?? $receiptNumber,
                auth()->id()
            );

            // 3. Recalculate Invoice Status
            $invoice->recalculatePaymentStatus();

            return redirect()->route('invoices.show', $invoice->id)
                ->with('success', "Payment of UGX " . number_format($validated['amount']) . " recorded successfully. Official Receipt #{$receiptNumber} issued.");
        });
    }

    public function printPdf(Invoice $invoice)
    {
        $invoice->load(['customer', 'user', 'items.product.brand', 'payments.paymentAccount']);
        $settings = Setting::getAllAsKeyValue();

        $pdf = Pdf::loadView('invoices.a4', compact('invoice', 'settings'))
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'defaultFont' => 'Helvetica',
            ]);

        $filename = "Invoice-{$invoice->invoice_number}.pdf";
        return request()->query('download') === '1'
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }

    public function printReceiptPdf(InvoicePayment $payment)
    {
        $payment->load(['invoice.customer', 'invoice.items', 'paymentAccount', 'user']);
        $settings = Setting::getAllAsKeyValue();

        $pdf = Pdf::loadView('invoices.receipt_a4', compact('payment', 'settings'))
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'defaultFont' => 'Helvetica',
            ]);

        $filename = "Payment-Receipt-{$payment->receipt_number}.pdf";
        return request()->query('download') === '1'
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
