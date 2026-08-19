<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$user = \App\Models\User::where('role', 'admin')->first();
$sale = \App\Models\Sale::latest()->first();

if (!$sale) {
    die("No sale found");
}

$request = Illuminate\Http\Request::create("/pos/receipt/{$sale->id}", 'GET');
$request->setUserResolver(function () use ($user) {
    return $user;
});

$response = $kernel->handle($request);
echo "Status: " . $response->getStatusCode() . "\n";
if ($response->getStatusCode() === 500) {
    echo $response->getContent();
} else {
    echo "Success! Content length: " . strlen($response->getContent());
}
