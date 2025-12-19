<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Income extends Model
{
    use HasFactory;

    protected $fillable = [
        'client',
        'source',
        'project',
        'category',
        'invoice_no',
        'amount',
        'currency',
        'method',
        'transaction_id',
        'bank',
        'received_date',
        'status',
        'gst_applied',
        'gst_percent',
        'gst_amount',
        'net_amount',
        'staff',
        'department',
        'notes',
    ];
}
