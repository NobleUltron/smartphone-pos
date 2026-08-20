<?php

require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$modelsPath = __DIR__.'/app/Models';
$files = scandir($modelsPath);

$errors = [];
$success = 0;

foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'php') {
        $className = 'App\\Models\\' . pathinfo($file, PATHINFO_FILENAME);
        if (class_exists($className)) {
            try {
                $className::first();
                $success++;
            } catch (\Exception $e) {
                $errors[$className] = $e->getMessage();
            }
        }
    }
}

echo "Successful Models: $success\n";
if (!empty($errors)) {
    echo "Errors found:\n";
    foreach ($errors as $model => $error) {
        echo "- $model: " . strtok($error, "\n") . "\n";
    }
} else {
    echo "All models successfully audited against the schema!\n";
}
