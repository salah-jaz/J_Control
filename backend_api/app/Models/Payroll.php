<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'month',
        'basic_salary',
        'salary_type',
        'total_days',
        'present_days',
        'absent_days',
        'leave_days',
        'lop_days',
        'wfh_days',
        'half_days',
        'overtime_hours',
        'overtime_rate',
        'overtime_amount',
        'bonus',
        'allowances',
        'lop_deduction',
        'other_deductions',
        'net_salary',
        'status',
        'payment_date',
        'payment_method',
        'notes',
        'processed_at',
        'processed_by',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
