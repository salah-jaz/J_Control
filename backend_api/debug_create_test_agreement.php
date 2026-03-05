<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$a = new App\Models\Agreement();
$a->agreement_no = "AG-TEST-001";
$a->title = "Test Agreement Manually Created";
$a->client_id = 1;
$a->date = date('Y-m-d');
$a->status = 'Draft';
$a->content = [['type' => 'paragraph', 'content' => 'This is a test.']];
$a->save();
echo "Created ID: " . $a->id . "\n";
