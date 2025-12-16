<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasFactory;

    protected $fillable = [
        'first_name',
        'last_name',
        'email',
        'phone',
        'company',
        'job_title',
        'status',
        'source',
        'priority',
        'score',
        'value',
        'assigned_to',
        'qualified',
        'notes',
        'location'
    ];

    protected $casts = [
        'qualified' => 'boolean',
        'score' => 'integer',
        'value' => 'decimal:2',
    ];
}
