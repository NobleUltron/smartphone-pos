<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\LayawayPayment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class LayawayController extends Controller
{
    public function index()
    {
        // Fetch sales that are marked as 'Partial' (Layaway)
        $layaways = Sale::with(['customer', 'layawayPayments', 'saleItems.deviceImei.product.brand', 'saleItems.product.brand'])
            ->where('payment_status', 'Partial')
            ->orderBy('created_at', 'desc')
            ->get();
            
        $activeLayawaysCount = $layaways->count();
        $totalValue = $layaways->sum('final_amount');
        
        // Sum amount_paid from layawayPayments relationship for all active layaways
        $totalCollected = $layaways->sum(function ($sale) {
            return $sale->layawayPayments->sum('amount_paid');
        });
        
        $outstandingBalance = $totalValue - $totalCollected;

        return Inertia::render('Layaways/Index', [
            'layaways' => $layaways,
            'summary' => [
                'active_layaways' => $activeLayawaysCount,
                'total_value' => $totalValue,
                'total_collected' => $totalCollected,
                'outstanding_balance' => $outstandingBalance,
            ]
        ]);
    }

    public function storePayment(Request $request, Sale $sale)
    {
        $request->validate([
            'amount_paid' => 'required|numeric|min:1',
            'payment_method' => 'required|string',
        ]);

        if ($sale->payment_status === 'Paid') {
            return redirect()->back()->withErrors(['error' => 'Sale is already fully paid.']);
        }

        $totalPaid = $sale->layawayPayments()->sum('amount_paid');
        $remainingBalance = $sale->final_amount - $totalPaid;

        if ($request->amount_paid > $remainingBalance) {
            return redirect()->back()->withErrors(['amount_paid' => 'Amount cannot exceed the remaining balance of UGX ' . number_format($remainingBalance)]);
        }

        $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        if (!$activeDrawer) {
            return redirect()->back()->withErrors(['error' => 'You must open a shift (Cash Drawer) before taking payments.']);
        }

        DB::beginTransaction();

        try {
            $payment = LayawayPayment::create([
                'sale_id' => $sale->id,
                'cash_drawer_id' => $activeDrawer->id,
                'amount_paid' => $request->amount_paid,
                'payment_method' => $request->payment_method,
                'payment_date' => now(),
            ]);

            // Sync with Treasury Service
            \App\Services\TreasuryService::recordInflow(
                $request->payment_method,
                floatval($request->amount_paid),
                'Layaway Installment',
                $sale,
                "Layaway Installment for Sale #{$sale->id}",
                null,
                auth()->id()
            );

            // Recalculate total paid
            $totalPaid = $sale->layawayPayments()->sum('amount_paid');

            // If fully paid, update status
            if ($totalPaid >= $sale->final_amount) {
                $sale->update(['payment_status' => 'Paid']);
            }

            // Sync deposit back to repair if applicable
            if ($sale->repair_id) {
                $repair = \App\Models\Repair::find($sale->repair_id);
                if ($repair) {
                    $repair->update(['deposit' => $totalPaid]);
                }
            }

            DB::commit();
            return redirect()->back()->with('success', 'Payment recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Failed to record payment.']);
        }
    }
}
