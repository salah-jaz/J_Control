<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$c = App\Models\Client::find(1);
if ($c) {
    echo "Client 1: " . $c->company_name . "\n";
} else {
    echo "Client 1 not found\n";
}
