<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'date',
        'amount',
        'currency',
        'category',
        'method',
        'bank',
        'bank_account_id',
        'reference_id',
        'description',
        'status',
        'related_id',
        'related_type',
    ];

    public function related()
    {
        return $this->morphTo();
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }
}
