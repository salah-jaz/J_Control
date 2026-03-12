<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$controller = new App\Http\Controllers\AgreementController();
$request = new Illuminate\Http\Request();
$response = $controller->index($request);
echo $response->getContent();
