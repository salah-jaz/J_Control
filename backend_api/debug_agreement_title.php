<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$a = App\Models\Agreement::find(2);
if ($a) {
    echo "Title: " . $a->title . "\n";
    echo "No: " . $a->agreement_no . "\n";
}
