<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use App\Models\CashDrawer;
use App\Models\Sale;
use App\Models\Expense;
use Inertia\Inertia;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class CashDrawerController extends Controller
{
    public function index()
    {
        $activeDrawer = CashDrawer::with('expenses')
            ->where('user_id', Auth::id())
            ->where('status', 'open')
            ->first();

        // Calculate expected cash and actual gross cash sales dynamically if a drawer is open
        if ($activeDrawer) {
            $activeDrawer->calculated_expected = $activeDrawer->calculateExpectedCash();

            $cashSales = Sale::where('cash_drawer_id', $activeDrawer->id)
                ->where('payment_method', 'Cash')
                ->whereIn('payment_status', ['Paid', 'Refunded'])
                ->sum('final_amount');
                
            $layawayCash = \App\Models\LayawayPayment::where('cash_drawer_id', $activeDrawer->id)
                ->where('payment_method', 'Cash')
                ->sum('amount_paid');

            $activeDrawer->cash_sales = $cashSales + $layawayCash;
        }

        return Inertia::render('CashDrawer/Index', [
            'activeDrawer' => $activeDrawer
        ]);
    }

    public function open(Request $request)
    {
        $request->validate([
            'starting_cash' => 'required|numeric|min:0'
        ]);

        // Ensure no active drawer exists
        if (CashDrawer::where('user_id', Auth::id())->where('status', 'open')->exists()) {
            return back()->with('error', 'You already have an open shift.');
        }

        CashDrawer::create([
            'user_id' => Auth::id(),
            'starting_cash' => $request->starting_cash,
            'status' => 'open',
            'opened_at' => Carbon::now()
        ]);

        return back()->with('success', 'Shift opened successfully.');
    }

    public function close(Request $request)
    {
        $request->validate([
            'actual_cash' => 'required|numeric|min:0'
        ]);

        $activeDrawer = CashDrawer::where('user_id', Auth::id())
            ->where('status', 'open')
            ->firstOrFail();

        $expectedCash = $activeDrawer->calculateExpectedCash();
        $difference = $request->actual_cash - $expectedCash;

        $activeDrawer->update([
            'expected_cash' => $expectedCash,
            'actual_cash' => $request->actual_cash,
            'difference' => $difference,
            'status' => 'closed',
            'closed_at' => Carbon::now()
        ]);

        return back()->with('success', 'Shift closed successfully.');
    }

    public function history()
    {
        $user = Auth::user();
        $query = CashDrawer::with('user')->orderBy('opened_at', 'desc');

        // Cashiers and non-admins only see their own shift history; admins/managers see all
        if (!in_array(strtolower($user->role), ['admin', 'manager'])) {
            $query->where('user_id', $user->id);
        }

        $drawers = $query->paginate(10);
            
        return Inertia::render('CashDrawer/History', [
            'drawers' => $drawers
        ]);
    }
}
