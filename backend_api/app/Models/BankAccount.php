<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BankAccount extends Model
{
    use HasFactory;

    protected $fillable = [
        'bank_name',
        'account_name',
        'nick_name',
        'account_type',
        'account_number',
        'ifsc_code',
        'branch_name',
        'micr_code',
        'swift_code',
        'opening_balance',
        'current_balance',
        'currency',
        'status',
        'opening_date',
        'notes',
        'qr_code',
    ];}
