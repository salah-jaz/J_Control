<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inv extends Model
{
    use HasFactory;

    protected $table = 'invs';

    protected $fillable = [
        'name',
        'jazno',
        'date',
        'amount',
        'bank_account_id',
        'status',
        'notes',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
        'amount' => 'decimal:2',
    ];

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class, 'bank_account_id');
    }

    public function income()
    {
        return $this->hasOne(Income::class, 'inv_id');
    }
}
