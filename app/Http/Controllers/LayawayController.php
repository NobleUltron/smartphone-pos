<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\LayawayPayment;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LayawayController extends Controller
{
    public function index(Request $request)
    {
        $status = $request->input('status', 'active');
        if (!in_array($status, ['active', 'completed', 'all'], true)) {
            $status = 'active';
        }
        $search = trim((string) $request->input('search', ''));

        // Portfolio KPIs across all active ('Partial') layaways
        $activeSales = Sale::where('payment_status', 'Partial')
            ->withSum('layawayPayments', 'amount_paid')
            ->get();

        $activeLayawaysCount = $activeSales->count();
        $totalValue = (float) $activeSales->sum('final_amount');
        $totalCollected = (float) $activeSales->sum('layaway_payments_sum_amount_paid');
        $outstandingBalance = max(0, $totalValue - $totalCollected);

        $completedLayawaysCount = Sale::where('payment_status', 'Paid')
            ->where(function ($q) {
                $q->where('payment_method', 'Layaway')
                  ->orWhereHas('layawayPayments');
            })
            ->count();

        // Main filtered query
        $query = Sale::with([
            'customer',
            'layawayPayments' => fn ($q) => $q->orderBy('payment_date', 'desc'),
            'saleItems.deviceImei.product.brand',
            'saleItems.product.brand',
        ]);

        if ($status === 'active') {
            $query->where('payment_status', 'Partial');
        } elseif ($status === 'completed') {
            $query->where('payment_status', 'Paid')
                  ->where(function ($q) {
                      $q->where('payment_method', 'Layaway')
                        ->orWhereHas('layawayPayments');
                  });
        } else {
            $query->where(function ($q) {
                $q->where('payment_status', 'Partial')
                  ->orWhere('payment_method', 'Layaway')
                  ->orWhereHas('layawayPayments');
            });
        }

        if ($search !== '') {
            $term = '%' . strtolower($search) . '%';
            $numericId = preg_replace('/[^0-9]/', '', $search);

            $query->where(function ($q) use ($term, $numericId) {
                if ($numericId !== '') {
                    $q->orWhere('id', (int) $numericId);
                }
                $q->orWhereHas('customer', function ($cq) use ($term) {
                    $cq->whereRaw('LOWER(name) LIKE ?', [$term])
                       ->orWhereRaw('LOWER(phone) LIKE ?', [$term]);
                })
                ->orWhereHas('saleItems.deviceImei', function ($dq) use ($term) {
                    $dq->whereRaw('LOWER(imei) LIKE ?', [$term]);
                });
            });
        }

        $perPage = max(10, min(100, (int) $request->input('per_page', 15)));
        $layaways = $query->orderBy('created_at', 'desc')
            ->paginate($perPage)
            ->withQueryString();

        $hasActiveDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->exists();

        return Inertia::render('Layaways/Index', [
            'layaways' => $layaways,
            'hasActiveDrawer' => $hasActiveDrawer,
            'filters' => [
                'status' => $status,
                'search' => $search,
            ],
            'summary' => [
                'active_layaways' => $activeLayawaysCount,
                'completed_layaways' => $completedLayawaysCount,
                'total_value' => $totalValue,
                'total_collected' => $totalCollected,
                'outstanding_balance' => $outstandingBalance,
            ],
        ]);
    }

    public function storePayment(Request $request, Sale $sale)
    {
        $request->validate([
            'amount_paid' => 'required|numeric|min:1',
            'payment_method' => 'required|in:Cash,Bank Transfer,MTN MoMo,Airtel Money',
        ]);

        $activeDrawer = \App\Models\CashDrawer::where('user_id', auth()->id())
            ->where('status', 'open')
            ->first();

        if ($request->payment_method === 'Cash' && !$activeDrawer) {
            return redirect()->back()->withErrors(['error' => 'You must open a shift (Cash Drawer) before taking cash payments.']);
        }

        DB::beginTransaction();

        try {
            $lockedSale = Sale::where('id', $sale->id)->lockForUpdate()->first();
            if (!$lockedSale) {
                DB::rollBack();
                return redirect()->back()->withErrors(['error' => 'Layaway record not found.']);
            }

            if ($lockedSale->payment_status === 'Paid') {
                DB::rollBack();
                return redirect()->back()->withErrors(['error' => 'Sale is already fully paid.']);
            }

            $totalPaidBefore = (float) $lockedSale->layawayPayments()->sum('amount_paid');
            $remainingBalance = max(0, (float) $lockedSale->final_amount - $totalPaidBefore);
            $amountPaid = floatval($request->amount_paid);

            if ($amountPaid > $remainingBalance + 0.01) {
                DB::rollBack();
                return redirect()->back()->withErrors([
                    'amount_paid' => 'Amount cannot exceed the remaining balance of UGX ' . number_format($remainingBalance),
                ]);
            }

            $payment = LayawayPayment::create([
                'sale_id' => $lockedSale->id,
                'cash_drawer_id' => ($request->payment_method === 'Cash' && $activeDrawer) ? $activeDrawer->id : null,
                'amount_paid' => $amountPaid,
                'payment_method' => $request->payment_method,
                'payment_date' => now(),
            ]);

            // Sync with Treasury Service
            \App\Services\TreasuryService::recordInflow(
                $request->payment_method,
                $amountPaid,
                'Layaway Installment',
                $payment,
                "Layaway Installment for Sale #{$lockedSale->id}",
                null,
                auth()->id()
            );

            // Recalculate total paid
            $totalPaid = $totalPaidBefore + $amountPaid;
            $isSettled = $totalPaid >= ((float) $lockedSale->final_amount - 0.01);

            if ($isSettled) {
                $lockedSale->update(['payment_status' => 'Paid']);
            }

            // Sync deposit back to repair if applicable
            if ($lockedSale->repair_id) {
                $repair = \App\Models\Repair::find($lockedSale->repair_id);
                if ($repair) {
                    $repair->update(['deposit' => $totalPaid]);
                }
            }

            \App\Models\ActivityLog::log(
                'layaway_payment',
                'Layaways',
                "Collected UGX " . number_format($amountPaid) . " ({$request->payment_method}) for Layaway Sale #{$lockedSale->id}" . ($isSettled ? ' — Paid in Full' : ''),
                [
                    'sale_id' => $lockedSale->id,
                    'payment_id' => $payment->id,
                    'amount_paid' => $amountPaid,
                    'payment_method' => $request->payment_method,
                    'settled' => $isSettled,
                ]
            );

            DB::commit();
            return redirect()->back()->with('success', $isSettled ? 'Final installment recorded — layaway is now paid in full!' : 'Payment recorded successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Layaway Payment Error: ' . $e->getMessage() . ' at ' . $e->getFile() . ':' . $e->getLine());
            return redirect()->back()->withErrors(['error' => 'Failed to record payment.']);
        }
    }
}
