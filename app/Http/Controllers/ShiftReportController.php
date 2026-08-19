<?php

namespace App\Http\Controllers;

use App\Models\CashDrawer;
use App\Models\LayawayPayment;
use App\Models\Sale;
use App\Models\Setting;
use Illuminate\Http\Request;
use Barryvdh\DomPDF\Facade\Pdf;

class ShiftReportController extends Controller
{
    public function generate(CashDrawer $drawer)
    {
        $user = auth()->user();

        // Access control: admins and managers can view any drawer report.
        // Cashiers and other non-admin staff can only view their own drawer reports.
        if (!in_array(strtolower($user->role), ['admin', 'manager']) && (int)$drawer->user_id !== (int)$user->id) {
            abort(403, 'You are not authorized to view this shift report.');
        }

        // Load relationships
        $drawer->load(['user', 'expenses', 'sales.customer']);

        // ── Revenue Calculations ─────────────────────────────────────
        $cashProductSales = Sale::where('cash_drawer_id', $drawer->id)
            ->where('payment_method', 'Cash')
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where(function ($q) {
                $q->whereNull('repair_id');
            })
            ->sum('final_amount');

        $cashRepairPayments = LayawayPayment::where('cash_drawer_id', $drawer->id)
            ->where('payment_method', 'Cash')
            ->sum('amount_paid');

        $momoSales = Sale::where('cash_drawer_id', $drawer->id)
            ->whereIn('payment_method', ['MoMo', 'Airtel Money'])
            ->whereIn('payment_status', ['Paid'])
            ->sum('final_amount');

        $bankSales = Sale::where('cash_drawer_id', $drawer->id)
            ->whereIn('payment_method', ['Bank Transfer', 'Card'])
            ->whereIn('payment_status', ['Paid'])
            ->sum('final_amount');

        $cashIns       = $drawer->expenses->where('category', 'Cash In')->sum('amount');
        $refunds       = $drawer->expenses->filter(fn($e) => str_contains($e->category, 'Refund'))->sum('amount');
        $operatingExp  = $drawer->expenses->filter(fn($e) => !str_contains($e->category, 'Refund') && $e->category !== 'Cash In')->sum('amount');

        $grossCash     = $drawer->starting_cash + $cashProductSales + $cashRepairPayments + $cashIns;
        $expectedCash  = $drawer->calculateExpectedCash();

        $summary = [
            'starting_cash'       => $drawer->starting_cash,
            'cash_product_sales'  => $cashProductSales,
            'cash_repair_payments'=> $cashRepairPayments,
            'momo_sales'          => $momoSales,
            'bank_sales'          => $bankSales,
            'cash_ins'            => $cashIns,
            'refunds'             => $refunds,
            'operating_expenses'  => $operatingExp,
            'gross_cash'          => $grossCash,
            'expected_cash'       => $expectedCash,
        ];

        // ── Load itemized data ───────────────────────────────────────
        $sales = Sale::with('customer')
            ->where('cash_drawer_id', $drawer->id)
            ->orderBy('created_at')
            ->get();

        $layawayPayments = LayawayPayment::with('sale.customer')
            ->where('cash_drawer_id', $drawer->id)
            ->orderBy('created_at')
            ->get();

        $expenses = $drawer->expenses()->orderBy('expense_date')->get();

        // ── Store settings ───────────────────────────────────────────
        $settings = [
            'shop_name'    => Setting::get('shop_name', 'SmartPOS Kampala'),
            'shop_address' => Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone'   => Setting::get('shop_phone', '+256 700 000 000'),
        ];

        // ── Generate PDF ─────────────────────────────────────────────
        $pdf = Pdf::loadView('pdf.shift_report', compact(
            'drawer', 'summary', 'sales', 'layawayPayments', 'expenses', 'settings'
        ))->setPaper('a4', 'portrait');

        $filename = 'shift-report-drawer-' . $drawer->id . '-' . now()->format('Ymd') . '.pdf';

        return $pdf->download($filename);
    }
}
