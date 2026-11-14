<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function index()
    {
        return redirect()->route('receipts.index');
    }

    public function show(Sale $sale)
    {
        $sale->load(['user', 'customer', 'saleItems.deviceImei.product', 'layawayPayments']);
        return Inertia::render('Sales/Show', [
            'sale' => $sale
        ]);
    }
}
