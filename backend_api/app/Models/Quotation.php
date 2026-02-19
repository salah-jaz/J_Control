<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    protected $fillable = [
        'quotation_no',
        'client_id',
        'date',
        'expiry_date',
        'status',
        'reference_number',
        'sales_person',
        'subtotal',
        'discount',
        'tax',
        'total',
        'initial_deposit',
        'notes',
        'internal_notes',
    ];

    protected $casts = [
        'date' => 'date',
        'expiry_date' => 'date',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'initial_deposit' => 'decimal:2',
    ];

    public function items()
    {
        return $this->hasMany(QuotationItem::class)->orderBy('id');
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
