<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expense extends Model
{
    use HasFactory;

    protected $fillable = [
        'vendor',
        'expense_type',
        'project',
        'category',
        'bill_no',
        'amount',
        'currency',
        'method',
        'transaction_id',
        'bank',
        'bank_account_id',
        'paid_date',
        'status',
        'gst_applied',
        'gst_percent',
        'gst_amount',
        'net_amount',
        'vendor_gstin',
        'itc_eligible',
        'staff',
        'department',
        'notes',
        'description',
        'location',
        'reference_number',
        'due_date',
        'recurring',
        'frequency',
        'tax_category',
        'approval_status',
        'approved_by',
        'approval_date',
        'tags',
        'priority',
        'reimbursement_status',
        'vendor_email',
        'vendor_phone',
    ];
}
