<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeadNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_id',
        'note',
        'note_type',
        'follow_up_date',
        'reminder',
        'created_by',
    ];

    protected $casts = [
        'follow_up_date' => 'date',
        'reminder' => 'boolean',
    ];

    public function lead()
    {
        return $this->belongsTo(Lead::class);
    }
}
