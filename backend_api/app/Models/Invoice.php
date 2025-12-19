<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = ['client_id', 'client_name', 'date', 'amount', 'status', 'gst', 'discount', 'grand_total'];
    
    protected $casts = [
        'amount' => 'decimal:2',
        'gst' => 'decimal:2',
        'discount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'date' => 'date'
    ];
}
