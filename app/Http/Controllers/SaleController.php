<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use Inertia\Inertia;

class SaleController extends Controller
{
    public function index()
    {
        $sales = Sale::with(['user', 'customer', 'saleItems.deviceImei.product'])->latest()->get();
        return Inertia::render('Sales/Index', [
            'sales' => $sales
        ]);
    }

    public function show(Sale $sale)
    {
        $sale->load(['user', 'customer', 'saleItems.deviceImei.product', 'layawayPayments']);
        return Inertia::render('Sales/Show', [
            'sale' => $sale
        ]);
    }
}
