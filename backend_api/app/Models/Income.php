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
        'bank_account_id',
        'received_date',
        'status',
        'gst_applied',
        'gst_percent',
        'gst_amount',
        'net_amount',
        'staff',
        'department',
        'notes',
        'description',
        'reference_number',
        'invoice_date',
        'due_date',
        'recurring',
        'frequency',
        'client_email',
        'client_phone',
        'payment_terms',
        'discount_applied',
        'discount_amount',
        'late_fee',
        'collection_status',
        'follow_up_date',
        'commission',
        'tax_category',
    ];
}
