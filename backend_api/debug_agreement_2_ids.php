<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$a = App\Models\Agreement::find(2);
echo "Client ID: " . $a->client_id . "\n";
echo "Quotation ID: " . $a->quotation_id . "\n";
