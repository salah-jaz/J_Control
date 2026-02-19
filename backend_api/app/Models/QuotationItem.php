<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuotationItem extends Model
{
    use HasFactory;

    protected $fillable = ['quotation_id', 'item', 'description', 'qty', 'price', 'tax', 'amount'];

    protected $casts = [
        'qty' => 'decimal:2',
        'price' => 'decimal:2',
        'tax' => 'decimal:2',
        'amount' => 'decimal:2',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }
}
