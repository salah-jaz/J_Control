<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    $settings = \App\Models\Setting::first();
    echo "DATABASE SETTINGS:\n";
    print_r($settings ? $settings->toArray() : null);

    // Call a mock ensureAbsoluteUrls or instantiate SettingController to test
    $controller = new \App\Http\Controllers\SettingController();
    // Since ensureAbsoluteUrls is private, let's use Reflection or copy the logic to test
    $reflector = new \ReflectionClass(\App\Http\Controllers\SettingController::class);
    $method = $reflector->getMethod('ensureAbsoluteUrls');
    $method->setAccessible(true);
    $result = $method->invoke($controller, $settings);

    echo "\nJSON RESPONSE FROM INDEX:\n";
    echo json_encode($result);
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage();
}
