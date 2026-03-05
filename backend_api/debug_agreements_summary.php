<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$agreements = App\Models\Agreement::all();
foreach ($agreements as $a) {
    echo "ID: {$a->id}, No: {$a->agreement_no}, Title: {$a->title}, QuotationID: {$a->quotation_id}, ClientID: {$a->client_id}\n";
}
echo "Total: " . $agreements->count() . "\n";
