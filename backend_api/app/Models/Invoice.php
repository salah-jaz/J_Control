<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = ['customer_id', 'customer_name', 'date', 'amount', 'status'];
    
    protected $casts = [
        'amount' => 'decimal:2',
        'date' => 'date'
    ];
}
