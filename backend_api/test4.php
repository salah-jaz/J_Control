<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$request = Illuminate\Http\Request::create('/api/agreements', 'GET');
$controller = new App\Http\Controllers\AgreementController();
$response = $controller->index($request);

echo $response->getContent();
