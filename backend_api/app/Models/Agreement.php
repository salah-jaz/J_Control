<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Agreement extends Model
{
    use HasFactory;

    protected $fillable = [
        'agreement_no',
        'title',
        'tagline',
        'override_company_name',
        'client_id',
        'quotation_id',
        'date',
        'status',
        'content',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'content' => 'array',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }
}
