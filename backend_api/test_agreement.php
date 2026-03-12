<?php
$data = json_encode(['title'=>'Test','client_id'=>1,'date'=>'2023-01-01','status'=>'Draft','content'=>[]]); 
$options = [
    'http' => [
        'header' => "Content-type: application/json\r\nAccept: application/json\r\n", 
        'method' => 'POST', 
        'content' => $data, 
        'ignore_errors' => true
    ]
]; 
$context = stream_context_create($options); 
$result = file_get_contents('http://localhost:8000/api/agreements', false, $context); 
echo $result;
