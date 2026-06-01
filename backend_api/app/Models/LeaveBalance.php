<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LeaveBalance extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'year',
        'casual_leave',
        'sick_leave',
        'earned_leave',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
