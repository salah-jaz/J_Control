<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlannerEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'event_date',
        'start_time',
        'end_time',
        'category',
        'priority',
        'client_id',
        'invoice_id',
        'reminder_time',
        'status',
        'completed_at',
        'rescheduled_from',
        'cancel_reason',
        'meeting_notes',
        'attachment',
        'created_by',
    ];

    protected $casts = [
        'event_date' => 'date',
        'start_time' => 'datetime:H:i',
        'end_time' => 'datetime:H:i',
        'completed_at' => 'datetime',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class);
    }

    public function notes()
    {
        return $this->hasMany(PlannerNote::class, 'event_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

