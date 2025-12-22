<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'company',
        'finance',
        'preferences',
        'security',
        'notifications',
    ];

    protected $casts = [
        'company' => 'array',
        'finance' => 'array',
        'preferences' => 'array',
        'security' => 'array',
        'notifications' => 'array',
    ];
}
