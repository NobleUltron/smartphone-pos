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
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class InvoiceController extends Controller
{
    public function index(Request $request)
    {
        // Bulk-sync overdue invoices BEFORE filtering and computing KPI metrics
        Invoice::where('status', '!=', 'Cancelled')
            ->whereIn('payment_status', ['Unpaid', 'Partial'])
            ->whereDate('due_date', '<', now()->toDateString())
            ->update(['payment_status' => 'Overdue']);

        $query = Invoice::with(['customer', 'user', 'payments'])->latest();

        if ($request->filled('search')) {
            $search = '%' . strtolower(trim($request->input('search'))) . '%';
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(invoice_number) LIKE ?', [$search])
                    ->orWhereRaw('LOWER(po_number) LIKE ?', [$search])
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->whereRaw('LOWER(name) LIKE ?', [$search])
                            ->orWhereRaw('LOWER(company_name) LIKE ?', [$search])
                            ->orWhereRaw('LOWER(phone) LIKE ?', [$search]);
                    });
            });
        }

        if ($request->filled('payment_status') && $request->payment_status !== 'all') {
            $query->where('payment_status', $request->payment_status);
        }

        $perPage = max(10, min(100, (int) $request->input('per_page', 15)));
        $invoices = $query->paginate($perPage)->withQueryString();

        $totalInvoiced = (float) Invoice::where('status', '!=', 'Cancelled')->sum('total_amount');
        $totalCollected = (float) InvoicePayment::sum('amount');
        $totalOutstanding = max(0, $totalInvoiced - $totalCollected);
        $overdueAmount = (float) (Invoice::where('payment_status', 'Overdue')
            ->where('status', '!=', 'Cancelled')
            ->selectRaw('SUM(total_amount - paid_amount) as remaining')
            ->value('remaining') ?? 0);

        $metrics = [
            'total_invoiced' => $totalInvoiced,
            'total_collected' => $totalCollected,
            'total_outstanding' => $totalOutstanding,
            'overdue_amount' => max(0, $overdueAmount),
            'overdue_count' => Invoice::where('payment_status', 'Overdue')->where('status', '!=', 'Cancelled')->count(),
            'pending_count' => Invoice::whereIn('payment_status', ['Unpaid', 'Partial'])->where('status', '!=', 'Cancelled')->count(),
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
        $products = Product::with('brand')
            ->withCount(['deviceImeis as in_stock_imeis_count' => fn($q) => $q->where('status', 'In Stock')])
            ->orderBy('model_name')
            ->get();
        $paymentAccounts = PaymentAccount::where('is_active', true)->where('is_personal', false)->orderBy('name')->get();

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

                // Lock & decrement inventory for bulk products with stock guard
                if ($itemData['type'] === 'product' && !empty($itemData['product_id'])) {
                    $prod = Product::where('id', $itemData['product_id'])->lockForUpdate()->first();
                    if ($prod && $prod->type === 'bulk') {
                        if ($prod->quantity < $itemData['quantity']) {
                            throw ValidationException::withMessages([
                                'items' => "Insufficient stock for {$itemData['item_name']}. Only {$prod->quantity} left in stock.",
                            ]);
                        }
                        $prod->decrement('quantity', $itemData['quantity']);
                    }
                }
            }

            \App\Models\ActivityLog::log(
                'invoice_created',
                'Invoices',
                "Created Invoice {$invoice->invoice_number} for UGX " . number_format($totalAmount),
                ['invoice_id' => $invoice->id, 'total_amount' => $totalAmount]
            );

            Cache::forget('global_low_stock_count');
            Cache::forget('inventory_stats');

            return redirect()->route('invoices.show', $invoice->id)
                ->with('success', "Invoice {$invoice->invoice_number} generated successfully.");
        });
    }

    public function show(Invoice $invoice)
    {
        $invoice->load(['customer', 'user', 'quotation', 'items.product.brand', 'payments.paymentAccount', 'payments.user']);
        $paymentAccounts = PaymentAccount::where('is_active', true)->where('is_personal', false)->orderBy('type')->orderBy('name')->get();

        return Inertia::render('Invoices/Show', [
            'invoice' => $invoice,
            'paymentAccounts' => $paymentAccounts,
        ]);
    }

    public function recordPayment(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:1',
            'payment_account_id' => 'required|exists:payment_accounts,id',
            'payment_method' => 'nullable|string|max:50',
            'transaction_reference' => 'nullable|string|max:100',
            'payment_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated, $invoice) {
            $lockedInvoice = Invoice::with('customer')->where('id', $invoice->id)->lockForUpdate()->firstOrFail();

            if ($lockedInvoice->status === 'Cancelled') {
                throw ValidationException::withMessages([
                    'amount' => 'Cannot record payment for a cancelled invoice.',
                ]);
            }

            $balanceRemaining = max(0, (float) $lockedInvoice->total_amount - (float) $lockedInvoice->paid_amount);

            if ($balanceRemaining <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'This invoice is already fully paid.',
                ]);
            }

            if (floatval($validated['amount']) > $balanceRemaining + 0.01) {
                throw ValidationException::withMessages([
                    'amount' => 'Amount cannot exceed the remaining balance of ' . number_format($balanceRemaining) . ' UGX.',
                ]);
            }

            $paymentAccount = PaymentAccount::where('is_personal', false)->findOrFail($validated['payment_account_id']);
            $receiptNumber = InvoicePayment::generateReceiptNumber();
            $method = $validated['payment_method'] ?: $paymentAccount->name;

            // 1. Create Invoice Payment record
            InvoicePayment::create([
                'invoice_id' => $lockedInvoice->id,
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
            $clientLabel = $lockedInvoice->customer?->company_name ?: $lockedInvoice->customer?->name ?: 'Walk-in Client';
            $desc = "Corporate Payment for Invoice #{$lockedInvoice->invoice_number} ({$clientLabel})";
            if (!empty($validated['transaction_reference'])) {
                $desc .= " - Ref: {$validated['transaction_reference']}";
            }

            TreasuryService::recordInflow(
                $paymentAccount,
                floatval($validated['amount']),
                'Invoice Payment',
                $lockedInvoice,
                $desc,
                $validated['transaction_reference'] ?? $receiptNumber,
                auth()->id()
            );

            // 3. Recalculate Invoice Status
            $lockedInvoice->recalculatePaymentStatus();

            \App\Models\ActivityLog::log(
                'invoice_payment',
                'Invoices',
                "Collected UGX " . number_format($validated['amount']) . " for Invoice {$lockedInvoice->invoice_number} (Receipt #{$receiptNumber})",
                [
                    'invoice_id' => $lockedInvoice->id,
                    'receipt_number' => $receiptNumber,
                    'amount' => floatval($validated['amount']),
                    'payment_account_id' => $paymentAccount->id,
                ]
            );

            return redirect()->route('invoices.show', $lockedInvoice->id)
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

    public function cancel(Request $request, Invoice $invoice)
    {
        $reason = $request->input('reason', 'Cancelled by manager/admin');

        DB::transaction(function () use ($invoice, $reason) {
            $lockedInvoice = Invoice::with(['items', 'quotation'])->where('id', $invoice->id)->lockForUpdate()->firstOrFail();

            if ($lockedInvoice->status === 'Cancelled') {
                throw ValidationException::withMessages([
                    'error' => 'This invoice has already been cancelled.',
                ]);
            }

            if ($lockedInvoice->paid_amount > 0 || $lockedInvoice->payments()->exists()) {
                throw ValidationException::withMessages([
                    'error' => 'Invoices with recorded payments cannot be cancelled directly. Please refund or reverse the recorded receipts first to preserve Treasury integrity.',
                ]);
            }

            // 1. Restock bulk products and serialized devices
            foreach ($lockedInvoice->items as $item) {
                if ($item->type === 'product' && !empty($item->product_id)) {
                    $prod = Product::where('id', $item->product_id)->lockForUpdate()->first();
                    if ($prod && $prod->type === 'bulk') {
                        $prod->increment('quantity', $item->quantity);
                    }
                }

                if (!empty($item->imeis) && is_array($item->imeis)) {
                    DeviceImei::whereIn('imei', $item->imeis)->update(['status' => 'In Stock']);
                }
            }

            // 2. Revert linked quotation status to Approved if applicable
            if ($lockedInvoice->quotation) {
                $lockedInvoice->quotation->update(['status' => 'Approved']);
            }

            // 3. Update invoice status to Cancelled
            $lockedInvoice->update([
                'status' => 'Cancelled',
                'payment_status' => 'Cancelled',
                'notes' => trim(($lockedInvoice->notes ?? '') . "\n[Cancelled on " . now()->format('Y-m-d H:i') . ": " . $reason . "]"),
            ]);

            \App\Models\ActivityLog::log(
                'invoice_cancelled',
                'Invoices',
                "Cancelled Invoice {$lockedInvoice->invoice_number} ({$reason})",
                ['invoice_id' => $lockedInvoice->id, 'reason' => $reason]
            );
        });

        Cache::forget('global_low_stock_count');
        Cache::forget('inventory_stats');

        return redirect()->back()->with('success', "Invoice #{$invoice->invoice_number} has been cancelled and reserved inventory has been returned to stock.");
    }

    public function destroy(Invoice $invoice)
    {
        $invoiceNumber = $invoice->invoice_number;

        DB::transaction(function () use ($invoice, $invoiceNumber) {
            $lockedInvoice = Invoice::with(['items', 'quotation'])->where('id', $invoice->id)->lockForUpdate()->firstOrFail();

            if ($lockedInvoice->paid_amount > 0 || $lockedInvoice->payments()->exists()) {
                throw ValidationException::withMessages([
                    'error' => 'Invoices with recorded payments cannot be deleted to preserve Treasury and financial audit integrity. Please reverse the payments first or mark the invoice as Cancelled.',
                ]);
            }

            // 1. Restock inventory if not already cancelled (if it was already cancelled, stock was already returned)
            if ($lockedInvoice->status !== 'Cancelled') {
                foreach ($lockedInvoice->items as $item) {
                    if ($item->type === 'product' && !empty($item->product_id)) {
                        $prod = Product::where('id', $item->product_id)->lockForUpdate()->first();
                        if ($prod && $prod->type === 'bulk') {
                            $prod->increment('quantity', $item->quantity);
                        }
                    }

                    if (!empty($item->imeis) && is_array($item->imeis)) {
                        DeviceImei::whereIn('imei', $item->imeis)->update(['status' => 'In Stock']);
                    }
                }
            }

            // 2. Revert linked quotation status to Approved if applicable
            if ($lockedInvoice->quotation) {
                $lockedInvoice->quotation->update(['status' => 'Approved']);
            }

            \App\Models\ActivityLog::log(
                'invoice_deleted',
                'Invoices',
                "Permanently deleted Invoice {$invoiceNumber}",
                ['invoice_id' => $lockedInvoice->id, 'invoice_number' => $invoiceNumber]
            );

            // 3. Delete items and invoice
            $lockedInvoice->items()->delete();
            $lockedInvoice->delete();
        });

        Cache::forget('global_low_stock_count');
        Cache::forget('inventory_stats');

        return redirect()->route('invoices.index')->with('success', "Invoice #{$invoiceNumber} has been permanently deleted and inventory returned to stock.");
    }
}
