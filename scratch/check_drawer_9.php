<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$drawerId = 9;

$drawer = \App\Models\CashDrawer::find($drawerId);
echo "Drawer ID: " . $drawer->id . "\n";
echo "Starting Cash: " . $drawer->starting_cash . "\n";

$sales = \App\Models\Sale::where('cash_drawer_id', $drawerId)->where('payment_method', 'Cash')->get();
echo "\n--- Sales (Cash) ---\n";
foreach($sales as $sale) {
    echo "Sale #{$sale->id} | Status: {$sale->payment_status} | Amount: {$sale->final_amount}\n";
}

$layaways = \App\Models\LayawayPayment::where('cash_drawer_id', $drawerId)->where('payment_method', 'Cash')->get();
echo "\n--- Layaway Payments (Cash) ---\n";
foreach($layaways as $lay) {
    echo "Layaway for Sale #{$lay->sale_id} | Amount Paid: {$lay->amount_paid}\n";
}

$expenses = \App\Models\Expense::where('cash_drawer_id', $drawerId)->get();
echo "\n--- Expenses ---\n";
foreach($expenses as $exp) {
    echo "Expense #{$exp->id} | Category: {$exp->category} | Amount: {$exp->amount} | Desc: {$exp->description}\n";
}
