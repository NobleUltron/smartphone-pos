<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Sale;
use Carbon\Carbon;
use Inertia\Inertia;

class CashierPortalController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Query sales handled by this cashier today
        $todayQuery = Sale::where('user_id', $user->id)
            ->whereDate('sale_date', Carbon::today());

        $todaySalesCount = (clone $todayQuery)->count();
        
        $todayDirectSales = (clone $todayQuery)
            ->whereIn('payment_status', ['Paid', 'Refunded'])
            ->where('payment_method', '!=', 'Layaway')
            ->sum('final_amount');
            
        $todayLayawayPayments = \App\Models\LayawayPayment::whereDate('payment_date', Carbon::today())
            ->whereHas('sale', function($q) use ($user) {
                $q->where('user_id', $user->id);
            });
            
        $todayLayawayPaymentsTotal = (clone $todayLayawayPayments)->sum('amount_paid');
        
        $todayRefundsTotal = \App\Models\Expense::where('user_id', $user->id)
            ->whereDate('expense_date', Carbon::today())
            ->where('category', 'Refund')
            ->sum('amount');
            
        $todaySalesTotal = $todayDirectSales + $todayLayawayPaymentsTotal - $todayRefundsTotal;
        
        $cashCollected = (clone $todayQuery)->whereIn('payment_status', ['Paid', 'Refunded'])->where('payment_method', 'Cash')->sum('final_amount') 
                       + (clone $todayLayawayPayments)->where('payment_method', 'Cash')->sum('amount_paid')
                       - $todayRefundsTotal;
                       
        $momoCollected = (clone $todayQuery)->whereIn('payment_status', ['Paid', 'Refunded'])->whereIn('payment_method', ['MTN MoMo', 'Airtel Money'])->sum('final_amount')
                       + (clone $todayLayawayPayments)->whereIn('payment_method', ['MTN MoMo', 'Airtel Money'])->sum('amount_paid');
                       
        $otherCollected = (clone $todayQuery)->whereIn('payment_status', ['Paid', 'Refunded'])->whereNotIn('payment_method', ['Cash', 'MTN MoMo', 'Airtel Money', 'Layaway'])->sum('final_amount')
                        + (clone $todayLayawayPayments)->whereNotIn('payment_method', ['Cash', 'MTN MoMo', 'Airtel Money'])->sum('amount_paid');

        $activeRepairsCount = \App\Models\Repair::whereIn('status', ['Pending', 'In Progress'])
            ->count();

        // Recent sales by this cashier today
        $recentSales = Sale::with(['customer', 'saleItems.deviceImei.product.brand', 'saleItems.product.brand', 'layawayPayments', 'repair', 'user', 'dealerItem.dealer'])
            ->where('user_id', $user->id)
            ->whereDate('sale_date', Carbon::today())
            ->orderBy('created_at', 'desc')
            ->take(10)
            ->get();

        $settings = [
            'shop_name' => \App\Models\Setting::get('shop_name', 'SmartPOS Kampala'),
            'store_logo' => \App\Models\Setting::getLogoUrl(),
            'shop_address' => \App\Models\Setting::get('shop_address', '123 Kampala Road, Kampala'),
            'shop_phone' => \App\Models\Setting::get('shop_phone', '+256 700 000 000'),
            'currency_symbol' => \App\Models\Setting::get('currency_symbol', 'UGX'),
            'receipt_footer' => \App\Models\Setting::get('receipt_footer', 'Thank you for shopping with us!'),
            'terms_conditions' => \App\Models\Setting::get('terms_conditions', [
                'Goods sold in good condition are not returnable.',
                'Retain this receipt for any warranty claims.',
                'Warranty does not cover physical or liquid damage.',
                'Software issues are not covered under warranty.'
            ]),
        ];

        return Inertia::render('Cashier/Dashboard', [
            'cashier' => [
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'metrics' => [
                'today_sales_count' => $todaySalesCount,
                'today_sales_total' => $todaySalesTotal,
                'cash_collected' => $cashCollected,
                'momo_collected' => $momoCollected,
                'other_collected' => $otherCollected,
                'active_repairs_count' => $activeRepairsCount,
            ],
            'recentSales' => $recentSales,
            'settings' => $settings,
        ]);
    }
}
