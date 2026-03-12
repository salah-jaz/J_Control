<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$quotations = App\Models\Quotation::all();
foreach ($quotations as $q) {
    echo "ID: {$q->id}, No: {$q->quotation_no}, ClientID: {$q->client_id}\n";
}
echo "Total: " . $quotations->count() . "\n";
