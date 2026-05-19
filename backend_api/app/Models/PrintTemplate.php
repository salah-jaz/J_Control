<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PrintTemplate extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'name',
        'module',
        'is_default',
        'description',
        'template_html',
        'template_css',
        'styles',
        'sections',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'styles' => 'array',
        'sections' => 'array',
    ];
}
