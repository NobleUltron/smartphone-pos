<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\Product;
use App\Models\Quotation;
use App\Models\QuotationItem;
use App\Models\Setting;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class QuotationController extends Controller
{
    public function index(Request $request)
    {
        $query = Quotation::with(['customer', 'user', 'invoice'])->latest();

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('quotation_number', 'ilike', "%{$search}%")
                    ->orWhereHas('customer', function ($cq) use ($search) {
                        $cq->where('name', 'ilike', "%{$search}%")
                            ->orWhere('company_name', 'ilike', "%{$search}%")
                            ->orWhere('phone', 'ilike', "%{$search}%");
                    });
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $quotations = $query->paginate(15)->withQueryString();

        $metrics = [
            'total_quotations' => Quotation::count(),
            'draft_count' => Quotation::where('status', 'Draft')->count(),
            'approved_count' => Quotation::where('status', 'Approved')->count(),
            'converted_value' => Quotation::where('status', 'Converted')->sum('total_amount'),
            'pipeline_value' => Quotation::whereIn('status', ['Draft', 'Sent', 'Approved'])->sum('total_amount'),
        ];

        return Inertia::render('Quotations/Index', [
            'quotations' => $quotations,
            'filters' => $request->only(['search', 'status']),
            'metrics' => $metrics,
        ]);
    }

    public function create()
    {
        $customers = Customer::orderBy('name')->get();
        $products = Product::with('brand')
            ->orderBy('model_name')
            ->get();

        $defaultTerms = Setting::get('quotation_terms', "1. This quotation is valid for 14 days from date of issue.\n2. Prices are subject to prevailing stock availability.\n3. Goods remain the property of the vendor until fully paid for.\n4. Delivery within 1-3 business days upon official Purchase Order confirmation.");

        return Inertia::render('Quotations/Create', [
            'customers' => $customers,
            'products' => $products,
            'nextNumber' => Quotation::generateNumber(),
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
            'issue_date' => 'required|date',
            'valid_until' => 'required|date|after_or_equal:issue_date',
            'status' => 'required|in:Draft,Sent,Approved,Rejected',
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

        return DB::transaction(function () use ($validated, $request) {
            $customerId = $validated['customer_id'] ?? null;

            // Auto-create customer if customer_name or company_name was provided without ID
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

            // Calculate totals
            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $subtotal += floatval($item['quantity']) * floatval($item['unit_price']);
            }

            $discount = floatval($validated['discount'] ?? 0);
            $taxRate = floatval($validated['tax_rate'] ?? 0);
            $netBeforeTax = max(0, $subtotal - $discount);
            $taxAmount = ($netBeforeTax * $taxRate) / 100;
            $totalAmount = $netBeforeTax + $taxAmount;

            $quotation = Quotation::create([
                'quotation_number' => Quotation::generateNumber(),
                'customer_id' => $customerId,
                'user_id' => auth()->id(),
                'issue_date' => $validated['issue_date'],
                'valid_until' => $validated['valid_until'],
                'status' => $validated['status'],
                'subtotal' => $subtotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'discount' => $discount,
                'total_amount' => $totalAmount,
                'terms_conditions' => $validated['terms_conditions'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($validated['items'] as $itemData) {
                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $itemData['product_id'] ?? null,
                    'type' => $itemData['type'],
                    'item_name' => $itemData['item_name'],
                    'description' => $itemData['description'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => floatval($itemData['quantity']) * floatval($itemData['unit_price']),
                ]);
            }

            return redirect()->route('quotations.show', $quotation->id)
                ->with('success', "Quotation {$quotation->quotation_number} created successfully.");
        });
    }

    public function show(Quotation $quotation)
    {
        $quotation->load(['customer', 'user', 'items.product.brand', 'invoice']);

        return Inertia::render('Quotations/Show', [
            'quotation' => $quotation,
        ]);
    }

    public function edit(Quotation $quotation)
    {
        if ($quotation->status === 'Converted') {
            return redirect()->route('quotations.show', $quotation->id)
                ->withErrors(['error' => 'Converted quotations cannot be modified.']);
        }

        $quotation->load(['customer', 'items']);
        $customers = Customer::orderBy('name')->get();
        $products = Product::with('brand')->orderBy('model_name')->get();

        return Inertia::render('Quotations/Edit', [
            'quotation' => $quotation,
            'customers' => $customers,
            'products' => $products,
        ]);
    }

    public function update(Request $request, Quotation $quotation)
    {
        if ($quotation->status === 'Converted') {
            return redirect()->back()->withErrors(['error' => 'Converted quotations cannot be modified.']);
        }

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'issue_date' => 'required|date',
            'valid_until' => 'required|date|after_or_equal:issue_date',
            'status' => 'required|in:Draft,Sent,Approved,Rejected',
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

        return DB::transaction(function () use ($validated, $quotation) {
            $subtotal = 0;
            foreach ($validated['items'] as $item) {
                $subtotal += floatval($item['quantity']) * floatval($item['unit_price']);
            }

            $discount = floatval($validated['discount'] ?? 0);
            $taxRate = floatval($validated['tax_rate'] ?? 0);
            $netBeforeTax = max(0, $subtotal - $discount);
            $taxAmount = ($netBeforeTax * $taxRate) / 100;
            $totalAmount = $netBeforeTax + $taxAmount;

            $quotation->update([
                'customer_id' => $validated['customer_id'] ?? $quotation->customer_id,
                'issue_date' => $validated['issue_date'],
                'valid_until' => $validated['valid_until'],
                'status' => $validated['status'],
                'subtotal' => $subtotal,
                'tax_rate' => $taxRate,
                'tax_amount' => $taxAmount,
                'discount' => $discount,
                'total_amount' => $totalAmount,
                'terms_conditions' => $validated['terms_conditions'] ?? null,
                'notes' => $validated['notes'] ?? null,
            ]);

            // Recreate items
            $quotation->items()->delete();
            foreach ($validated['items'] as $itemData) {
                QuotationItem::create([
                    'quotation_id' => $quotation->id,
                    'product_id' => $itemData['product_id'] ?? null,
                    'type' => $itemData['type'],
                    'item_name' => $itemData['item_name'],
                    'description' => $itemData['description'] ?? null,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => floatval($itemData['quantity']) * floatval($itemData['unit_price']),
                ]);
            }

            return redirect()->route('quotations.show', $quotation->id)
                ->with('success', 'Quotation updated successfully.');
        });
    }

    public function destroy(Quotation $quotation)
    {
        if ($quotation->status === 'Converted' || $quotation->invoice()->exists()) {
            return redirect()->back()->withErrors(['error' => 'Converted quotations cannot be deleted as they are linked to an official Tax Invoice.']);
        }

        $quoteNumber = $quotation->quotation_number;

        DB::transaction(function () use ($quotation) {
            $quotation->items()->delete();
            $quotation->delete();
        });

        return redirect()->route('quotations.index')->with('success', "Quotation #{$quoteNumber} deleted successfully.");
    }

    public function convertToInvoice(Request $request, Quotation $quotation)
    {
        if ($quotation->invoice) {
            return redirect()->route('invoices.show', $quotation->invoice->id)
                ->with('info', 'This quotation has already been converted to an invoice.');
        }

        $request->validate([
            'po_number' => 'nullable|string|max:100',
            'payment_terms' => 'nullable|string|max:50',
            'due_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($quotation, $request) {
            $paymentTerms = $request->input('payment_terms', 'Net 30');
            $issueDate = now()->toDateString();
            $days = 30;
            if (preg_match('/Net\s*(\d+)/i', $paymentTerms, $m)) {
                $days = intval($m[1]);
            }
            $dueDate = $request->input('due_date') ?: now()->addDays($days)->toDateString();

            // Create Invoice
            $invoice = Invoice::create([
                'invoice_number' => Invoice::generateNumber(),
                'quotation_id' => $quotation->id,
                'customer_id' => $quotation->customer_id,
                'user_id' => auth()->id(),
                'po_number' => $request->input('po_number'),
                'issue_date' => $issueDate,
                'due_date' => $dueDate,
                'payment_terms' => $paymentTerms,
                'status' => 'Confirmed',
                'payment_status' => 'Unpaid',
                'subtotal' => $quotation->subtotal,
                'tax_rate' => $quotation->tax_rate,
                'tax_amount' => $quotation->tax_amount,
                'discount' => $quotation->discount,
                'total_amount' => $quotation->total_amount,
                'paid_amount' => 0,
                'terms_conditions' => $quotation->terms_conditions,
                'notes' => "Converted from Quotation #{$quotation->quotation_number}",
            ]);

            // Clone items and optionally decrement stock if product
            foreach ($quotation->items as $qItem) {
                InvoiceItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $qItem->product_id,
                    'type' => $qItem->type,
                    'item_name' => $qItem->item_name,
                    'description' => $qItem->description,
                    'quantity' => $qItem->quantity,
                    'unit_price' => $qItem->unit_price,
                    'total_price' => $qItem->total_price,
                ]);

                // Decrement inventory for bulk products
                if ($qItem->type === 'product' && $qItem->product_id) {
                    $prod = Product::find($qItem->product_id);
                    if ($prod && $prod->type === 'bulk') {
                        $prod->decrement('quantity', $qItem->quantity);
                    }
                }
            }

            // Mark quotation converted
            $quotation->update(['status' => 'Converted']);

            return redirect()->route('invoices.show', $invoice->id)
                ->with('success', "Quotation successfully converted to Invoice {$invoice->invoice_number}!");
        });
    }

    public function printPdf(Quotation $quotation)
    {
        $quotation->load(['customer', 'user', 'items.product.brand']);
        $settings = Setting::getAllAsKeyValue();

        $pdf = Pdf::loadView('quotations.a4', compact('quotation', 'settings'))
            ->setPaper('a4', 'portrait')
            ->setOptions([
                'isHtml5ParserEnabled' => true,
                'isRemoteEnabled' => true,
                'defaultFont' => 'Helvetica',
            ]);

        $filename = "Quotation-{$quotation->quotation_number}.pdf";
        return request()->query('download') === '1'
            ? $pdf->download($filename)
            : $pdf->stream($filename);
    }
}
