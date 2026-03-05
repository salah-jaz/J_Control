<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$validator = validator(['agreement_content' => [['type'=>'paragraph','content'=>'test']]], [
    'agreement_content' => 'nullable|array',
]);
if ($validator->fails()) {
    echo "Validation failed";
    exit;
}
$validated = $validator->validated();

$q = App\Models\Quotation::first();
if (!$q) {
  $q = App\Models\Quotation::create(['quotation_no'=>'QT-123', 'client_id'=>1, 'date'=>'2026-03-01', 'status'=>'Draft']);
}

if (!empty($validated['agreement_content'])) {
    $agreement = $q->agreement()->create([
        'agreement_no' => 'AG-999',
        'title' => 'Quotation Agreement - ' . $q->quotation_no,
        'client_id' => $q->client_id,
        'date' => now()->toDateString(),
        'status' => 'Draft',
        'content' => $validated['agreement_content'],
    ]);
    echo "Agreement created: " . $agreement->id . "\n";
} else {
    echo "Content is empty\n";
}

echo json_encode(App\Models\Agreement::all());
