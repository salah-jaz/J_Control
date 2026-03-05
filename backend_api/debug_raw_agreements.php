<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$counts = DB::select("SELECT count(*) as total FROM agreements");
echo "Raw count: " . $counts[0]->total . "\n";
$all = DB::select("SELECT id, title, agreement_no FROM agreements");
foreach ($all as $r) {
    echo "ID: {$r->id}, Title: {$r->title}, No: {$r->agreement_no}\n";
}
