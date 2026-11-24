<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DeviceImei;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Sale;
use App\Models\Repair;
use App\Models\Invoice;
use App\Models\Quotation;

class GlobalSearchController extends Controller
{
    public function search(Request $request)
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json([
                'imeis' => [],
                'products' => [],
                'customers' => [],
                'receipts' => [],
                'invoices' => [],
                'quotations' => [],
                'repairs' => [],
            ]);
        }

        $role = strtolower(auth()->user()->role ?? 'cashier');
        $canViewCost = auth()->user()?->hasPermission('view_cost_prices') ?? false;
        $isTechnician = $role === 'technician';

        $like = '%' . mb_strtolower($q) . '%';
        $numericQ = ltrim($q, '#');
        $isNumeric = ctype_digit($numericQ);

        // 1. Serialized Phones (Device IMEIs)
        $imeis = DeviceImei::with(['product.brand'])
            ->where(function ($query) use ($like) {
                $query->whereRaw('LOWER(imei) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(color, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(storage_capacity, \'\')) LIKE ?', [$like])
                    ->orWhereHas('product', function ($pq) use ($like) {
                        $pq->whereRaw('LOWER(model_name) LIKE ?', [$like])
                           ->orWhereHas('brand', fn($bq) => $bq->whereRaw('LOWER(name) LIKE ?', [$like]));
                    });
            })
            ->orderByRaw("CASE WHEN status = 'In Stock' THEN 0 WHEN status = 'In Transit' THEN 1 ELSE 2 END")
            ->orderByDesc('id')
            ->limit(6)
            ->get()
            ->map(function ($d) use ($canViewCost) {
                $brand = $d->product?->brand?->name ?? '';
                $model = $d->product?->model_name ?? 'Device';
                $spec = trim(($d->storage_capacity ?? '') . ' ' . ($d->color ?? ''));
                return [
                    'id' => $d->id,
                    'title' => trim("{$brand} {$model}" . ($spec ? " ({$spec})" : '')),
                    'subtitle' => "IMEI: {$d->imei}" . ($canViewCost && $d->cost_price ? ' • Cost: UGX ' . number_format((float)$d->cost_price) : ''),
                    'badge' => $d->status,
                    'price' => (float) ($d->selling_price ?? 0),
                    'url' => '/inventory?search=' . urlencode($d->imei),
                ];
            })
            ->values();

        // 2. Products / Catalog
        $products = Product::with('brand')
            ->where(function ($query) use ($like) {
                $query->whereRaw('LOWER(model_name) LIKE ?', [$like])
                    ->orWhereHas('brand', fn($bq) => $bq->whereRaw('LOWER(name) LIKE ?', [$like]));
            })
            ->limit(5)
            ->get()
            ->map(function ($p) {
                $brand = $p->brand?->name ?? '';
                return [
                    'id' => $p->id,
                    'title' => trim("{$brand} {$p->model_name}"),
                    'subtitle' => ($p->type === 'serialized' ? 'Serialized Phone' : 'Accessory / Bulk')
                        . ($p->type !== 'serialized' ? " • Stock: " . (int)($p->stock_quantity ?? 0) : ''),
                    'badge' => $p->type === 'serialized' ? 'Phone' : 'Accessory',
                    'price' => (float) ($p->selling_price ?? 0),
                    'url' => '/inventory?search=' . urlencode($p->model_name),
                ];
            })
            ->values();

        // 3. Customers (Hidden from technicians)
        $customers = collect();
        if (!$isTechnician) {
            $customers = Customer::where(function ($query) use ($like) {
                $query->whereRaw('LOWER(name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(phone, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(email, \'\')) LIKE ?', [$like]);
            })
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'title' => $c->name,
                'subtitle' => trim(($c->phone ?: 'No phone') . ($c->email ? " • {$c->email}" : '')),
                'badge' => 'Customer',
                'url' => '/customers?search=' . urlencode($c->name),
            ])
            ->values();
        }

        // 4. Receipts / Sales (Hidden from technicians)
        $receipts = collect();
        if (!$isTechnician) {
            $receipts = Sale::with('customer:id,name,phone')
                ->where(function ($query) use ($like, $isNumeric, $numericQ) {
                    if ($isNumeric) {
                        $query->where('id', (int) $numericQ);
                    }
                    $query->orWhereHas('customer', function ($cq) use ($like) {
                        $cq->whereRaw('LOWER(name) LIKE ?', [$like])
                           ->orWhereRaw('LOWER(COALESCE(phone, \'\')) LIKE ?', [$like]);
                    });
                })
                ->orderByDesc('id')
                ->limit(5)
                ->get()
                ->map(fn($s) => [
                    'id' => $s->id,
                    'title' => "Receipt #{$s->id} — " . ($s->customer?->name ?? 'Walk-in Customer'),
                    'subtitle' => ($s->payment_method ?: 'Cash') . ' • ' . ($s->sale_date ? date('d M Y', strtotime($s->sale_date)) : ''),
                    'badge' => $s->payment_status ?: 'Paid',
                    'price' => (float) ($s->final_amount ?? 0),
                    'url' => "/pos/receipt/{$s->id}",
                ])
                ->values();
        }

        // 5. Repair Tickets
        $repairs = Repair::with('customer:id,name,phone')
            ->where(function ($query) use ($like) {
                $query->whereRaw('LOWER(COALESCE(repair_code, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(device_model, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(imei_serial, \'\')) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(COALESCE(customer_name, \'\')) LIKE ?', [$like])
                    ->orWhereHas('customer', fn($cq) => $cq->whereRaw('LOWER(name) LIKE ?', [$like]));
            })
            ->orderByDesc('id')
            ->limit(5)
            ->get()
            ->map(fn($r) => [
                'id' => $r->id,
                'title' => ($r->repair_code ? "{$r->repair_code} — " : "Repair #{$r->id} — ") . ($r->device_model ?: 'Device'),
                'subtitle' => ($r->customer?->name ?? $r->customer_name ?? 'Customer') . ($r->imei_serial ? " • IMEI: {$r->imei_serial}" : ''),
                'badge' => $r->status ?: 'Pending',
                'price' => (float) ($r->estimated_cost ?? 0),
                'url' => '/repairs?search=' . urlencode($r->repair_code ?: $r->device_model),
            ])
            ->values();

        // 6. Corporate Invoices & Quotations (Hidden from technicians)
        $invoices = collect();
        $quotations = collect();
        if (!$isTechnician) {
            $invoices = Invoice::with('customer:id,name,company_name')
                ->where(function ($query) use ($like) {
                    $query->whereRaw('LOWER(COALESCE(invoice_number, \'\')) LIKE ?', [$like])
                        ->orWhereRaw('LOWER(COALESCE(po_number, \'\')) LIKE ?', [$like])
                        ->orWhereHas('customer', function ($cq) use ($like) {
                            $cq->whereRaw('LOWER(name) LIKE ?', [$like])
                               ->orWhereRaw('LOWER(COALESCE(company_name, \'\')) LIKE ?', [$like]);
                        });
                })
                ->orderByDesc('id')
                ->limit(5)
                ->get()
                ->map(fn($inv) => [
                    'id' => $inv->id,
                    'title' => "{$inv->invoice_number} — " . ($inv->customer?->company_name ?: $inv->customer?->name ?: 'Corporate Buyer'),
                    'subtitle' => ($inv->po_number ? "PO: {$inv->po_number} • " : '') . 'Due: ' . ($inv->due_date ? date('d M Y', strtotime($inv->due_date)) : '—'),
                    'badge' => $inv->payment_status ?: 'Unpaid',
                    'price' => (float) ($inv->total_amount ?? 0),
                    'url' => "/invoices/{$inv->id}",
                ])
                ->values();

            $quotations = Quotation::with('customer:id,name,company_name')
                ->where(function ($query) use ($like) {
                    $query->whereRaw('LOWER(COALESCE(quotation_number, \'\')) LIKE ?', [$like])
                        ->orWhereHas('customer', function ($cq) use ($like) {
                            $cq->whereRaw('LOWER(name) LIKE ?', [$like])
                               ->orWhereRaw('LOWER(COALESCE(company_name, \'\')) LIKE ?', [$like]);
                        });
                })
                ->orderByDesc('id')
                ->limit(5)
                ->get()
                ->map(fn($qt) => [
                    'id' => $qt->id,
                    'title' => "{$qt->quotation_number} — " . ($qt->customer?->company_name ?: $qt->customer?->name ?: 'Corporate Client'),
                    'subtitle' => 'Valid until: ' . ($qt->valid_until ? date('d M Y', strtotime($qt->valid_until)) : '—'),
                    'badge' => $qt->status ?: 'Draft',
                    'price' => (float) ($qt->total_amount ?? 0),
                    'url' => "/quotations/{$qt->id}",
                ])
                ->values();
        }

        return response()->json([
            'imeis' => $imeis,
            'products' => $products,
            'customers' => $customers,
            'receipts' => $receipts,
            'invoices' => $invoices,
            'quotations' => $quotations,
            'repairs' => $repairs,
        ]);
    }
}
