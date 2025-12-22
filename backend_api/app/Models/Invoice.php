<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = ['client_id', 'client_name', 'date', 'amount', 'status', 'gst', 'discount', 'grand_total', 'bank_account_id', 'gpay_number', 'qr_code'];
    
    protected $casts = [
        'amount' => 'decimal:2',
        'gst' => 'decimal:2',
        'discount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'date' => 'date'
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
