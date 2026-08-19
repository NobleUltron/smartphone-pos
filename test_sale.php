<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$sale = \App\Models\Sale::with(['saleItems.deviceImei.product.brand', 'saleItems.product.brand'])->whereHas('saleItems', function($q) { $q->whereNotNull('device_imei_id'); })->latest()->first();

echo json_encode($sale);
