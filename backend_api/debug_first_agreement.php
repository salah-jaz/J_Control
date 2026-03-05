<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$a = App\Models\Agreement::all()->first();
echo json_encode($a, JSON_PRETTY_PRINT);
