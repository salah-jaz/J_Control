<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlannerNote extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id',
        'title',
        'content',
        'category',
        'priority',
        'created_by',
    ];

    public function event()
    {
        return $this->belongsTo(PlannerEvent::class, 'event_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

