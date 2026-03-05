<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$a = App\Models\Agreement::find(3);
echo "Content: " . json_encode($a->content) . "\n";
