<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id', 'client_name', 'date', 'amount', 'status', 'gst', 'discount', 'discount_type', 'grand_total',
        'bank_account_id', 'bank_name', 'account_number', 'gpay_number', 'qr_code', 'invoice_number',
        'initial_deposit_enabled', 'initial_deposit_amount', 'initial_deposit_bank_id', 'extra_installments',
        'operational_expenses',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'gst' => 'decimal:2',
        'discount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'date' => 'date',
        'initial_deposit_enabled' => 'boolean',
        'initial_deposit_amount' => 'decimal:2',
        'extra_installments' => 'array',
        'operational_expenses' => 'array',
    ];

    public function items()
    {
        return $this->hasMany(InvoiceItem::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }
}
