<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    \App\Models\Transaction::create([
        'type' => 'Test',
        'amount' => 100,
        'date' => null,
        'status' => 'Pending'
    ]);
    echo "SUCCESS";
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
