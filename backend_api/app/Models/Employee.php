<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'name',
        'mobile',
        'email',
        'department_id',
        'designation_id',
        'joining_date',
        'salary_type',
        'basic_salary',
        'bank_name',
        'bank_account_no',
        'bank_ifsc',
        'bank_branch',
        'status',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($employee) {
            if (empty($employee->employee_id)) {
                $latest = static::orderBy('id', 'desc')->first();
                if ($latest && preg_match('/EMP-(\d+)/', $latest->employee_id, $matches)) {
                    $nextNumber = ((int)$matches[1]) + 1;
                } else {
                    $nextNumber = 1;
                }
                $employee->employee_id = 'EMP-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
            }
        });
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function designation()
    {
        return $this->belongsTo(Designation::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaves()
    {
        return $this->hasMany(Leave::class);
    }

    public function leaveBalances()
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function payrolls()
    {
        return $this->hasMany(Payroll::class);
    }
}
