<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Leave;
use App\Models\LeaveBalance;
use App\Models\Payroll;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Departments
        $depts = [
            'Engineering' => Department::create(['name' => 'Engineering']),
            'Sales' => Department::create(['name' => 'Sales & Marketing']),
            'Human Resources' => Department::create(['name' => 'Human Resources']),
            'Support' => Department::create(['name' => 'Technical Support']),
        ];

        // 2. Create Designations
        $desgs = [
            'Team Lead' => Designation::create(['name' => 'Team Lead']),
            'Senior Engineer' => Designation::create(['name' => 'Senior Software Engineer']),
            'Sales Executive' => Designation::create(['name' => 'Sales Executive']),
            'HR Manager' => Designation::create(['name' => 'HR Manager']),
            'Support Specialist' => Designation::create(['name' => 'Support Specialist']),
        ];

        // 3. Create Employees
        $employeesData = [
            [
                'name' => 'Amit Sharma',
                'mobile' => '9876543210',
                'email' => 'amit.sharma@jcontrol.com',
                'department_id' => $depts['Engineering']->id,
                'designation_id' => $desgs['Team Lead']->id,
                'joining_date' => '2024-01-15',
                'salary_type' => 'monthly',
                'basic_salary' => 85000.00,
                'bank_name' => 'State Bank of India',
                'bank_account_no' => '54321098765',
                'bank_ifsc' => 'SBIN0001234',
                'bank_branch' => 'MG Road, Bangalore',
                'status' => 'active',
            ],
            [
                'name' => 'Priya Patel',
                'mobile' => '9812345678',
                'email' => 'priya.patel@jcontrol.com',
                'department_id' => $depts['Engineering']->id,
                'designation_id' => $desgs['Senior Engineer']->id,
                'joining_date' => '2024-06-10',
                'salary_type' => 'monthly',
                'basic_salary' => 65000.00,
                'bank_name' => 'HDFC Bank',
                'bank_account_no' => '98765432101',
                'bank_ifsc' => 'HDFC0000234',
                'bank_branch' => 'Indiranagar, Bangalore',
                'status' => 'active',
            ],
            [
                'name' => 'Rahul Verma',
                'mobile' => '9988776655',
                'email' => 'rahul.verma@jcontrol.com',
                'department_id' => $depts['Sales']->id,
                'designation_id' => $desgs['Sales Executive']->id,
                'joining_date' => '2025-02-01',
                'salary_type' => 'monthly',
                'basic_salary' => 35000.00,
                'bank_name' => 'ICICI Bank',
                'bank_account_no' => '12345678901',
                'bank_ifsc' => 'ICIC0000567',
                'bank_branch' => 'Koramangala, Bangalore',
                'status' => 'active',
            ],
            [
                'name' => 'Sneha Nair',
                'mobile' => '9123456789',
                'email' => 'sneha.nair@jcontrol.com',
                'department_id' => $depts['Human Resources']->id,
                'designation_id' => $desgs['HR Manager']->id,
                'joining_date' => '2023-11-01',
                'salary_type' => 'monthly',
                'basic_salary' => 75000.00,
                'bank_name' => 'Axis Bank',
                'bank_account_no' => '65432109876',
                'bank_ifsc' => 'UTIB0000890',
                'bank_branch' => 'Whitefield, Bangalore',
                'status' => 'active',
            ],
            [
                'name' => 'Vikram Singh',
                'mobile' => '9234567890',
                'email' => 'vikram.singh@jcontrol.com',
                'department_id' => $depts['Support']->id,
                'designation_id' => $desgs['Support Specialist']->id,
                'joining_date' => '2025-04-01',
                'salary_type' => 'daily',
                'basic_salary' => 1200.00, // Daily Wage
                'bank_name' => 'Canara Bank',
                'bank_account_no' => '76543210987',
                'bank_ifsc' => 'CNRB0000456',
                'bank_branch' => 'Jayanagar, Bangalore',
                'status' => 'active',
            ],
            [
                'name' => 'Deepak Kumar',
                'mobile' => '9345678901',
                'email' => 'deepak.kumar@jcontrol.com',
                'department_id' => $depts['Engineering']->id,
                'designation_id' => $desgs['Senior Engineer']->id,
                'joining_date' => '2025-05-01',
                'salary_type' => 'monthly',
                'basic_salary' => 60000.00,
                'bank_name' => 'State Bank of India',
                'bank_account_no' => '32109876543',
                'bank_ifsc' => 'SBIN0000789',
                'bank_branch' => 'Electronic City, Bangalore',
                'status' => 'inactive', // Inactive Employee
            ],
        ];

        $employees = [];
        $currentYear = (int) Carbon::now()->year;

        foreach ($employeesData as $idx => $data) {
            $emp = Employee::create([
                'employee_id' => 'EMP-' . str_pad($idx + 1, 4, '0', STR_PAD_LEFT),
                'name' => $data['name'],
                'mobile' => $data['mobile'],
                'email' => $data['email'],
                'department_id' => $data['department_id'],
                'designation_id' => $data['designation_id'],
                'joining_date' => $data['joining_date'],
                'salary_type' => $data['salary_type'],
                'basic_salary' => $data['basic_salary'],
                'bank_name' => $data['bank_name'],
                'bank_account_no' => $data['bank_account_no'],
                'bank_ifsc' => $data['bank_ifsc'],
                'bank_branch' => $data['bank_branch'],
                'status' => $data['status'],
            ]);

            $employees[] = $emp;

            // Initialize Leave Balances
            LeaveBalance::create([
                'employee_id' => $emp->id,
                'year' => $currentYear,
                'casual_leave' => $emp->status === 'active' ? 10.0 : 12.0, // Deduct 2 already for testing
                'sick_leave' => 11.0,
                'earned_leave' => 12.0,
            ]);
        }

        // 4. Create Leaves
        // Approved Leaves
        $l1 = Leave::create([
            'employee_id' => $employees[0]->id, // Amit Sharma
            'leave_type' => 'casual',
            'start_date' => Carbon::now()->subDays(5)->toDateString(),
            'end_date' => Carbon::now()->subDays(4)->toDateString(),
            'reason' => 'Family event in hometown.',
            'status' => 'approved',
        ]);

        $l2 = Leave::create([
            'employee_id' => $employees[1]->id, // Priya Patel
            'leave_type' => 'sick',
            'start_date' => Carbon::now()->subDays(10)->toDateString(),
            'end_date' => Carbon::now()->subDays(10)->toDateString(),
            'reason' => 'High fever.',
            'status' => 'approved',
        ]);

        // Pending Leaves
        Leave::create([
            'employee_id' => $employees[2]->id, // Rahul Verma
            'leave_type' => 'casual',
            'start_date' => Carbon::now()->addDays(5)->toDateString(),
            'end_date' => Carbon::now()->addDays(7)->toDateString(),
            'reason' => 'Personal work.',
            'status' => 'pending',
        ]);

        Leave::create([
            'employee_id' => $employees[3]->id, // Sneha Nair
            'leave_type' => 'earned',
            'start_date' => Carbon::now()->addDays(12)->toDateString(),
            'end_date' => Carbon::now()->addDays(16)->toDateString(),
            'reason' => 'Summer vacation.',
            'status' => 'pending',
        ]);

        // 5. Daily Attendance Logs for Current Month
        $currentMonthStart = Carbon::now()->startOfMonth();
        $today = Carbon::today();
        
        // Loop from start of month up to today
        $date = $currentMonthStart->copy();
        while ($date->lte($today)) {
            $dateStr = $date->toDateString();
            $isWeekend = $date->isWeekend();

            foreach ($employees as $emp) {
                if ($emp->status !== 'active') {
                    continue;
                }

                // If weekend, skip or mark as present / wfh sometimes
                if ($isWeekend) {
                    continue; // standard weekends are off
                }

                // Check if employee is on approved leave on this date
                $onLeave = Leave::where('employee_id', $emp->id)
                    ->where('status', 'approved')
                    ->whereDate('start_date', '<=', $dateStr)
                    ->whereDate('end_date', '>=', $dateStr)
                    ->exists();

                if ($onLeave) {
                    Attendance::create([
                        'employee_id' => $emp->id,
                        'attendance_date' => $dateStr,
                        'status' => 'leave',
                        'check_in' => null,
                        'check_out' => null,
                    ]);
                    continue;
                }

                // Today's special distributions (to make dashboard active)
                if ($date->isToday()) {
                    // Let's seed specific today's records for active testing:
                    // Amit -> Present, Priya -> WFH, Rahul -> Absent, Sneha -> leave, Vikram -> unentered (don't seed)
                    if ($emp->id == $employees[0]->id) {
                        Attendance::create(['employee_id' => $emp->id, 'attendance_date' => $dateStr, 'status' => 'present', 'check_in' => '08:55:00', 'check_out' => '18:05:00']);
                    } else if ($emp->id == $employees[1]->id) {
                        Attendance::create(['employee_id' => $emp->id, 'attendance_date' => $dateStr, 'status' => 'work_from_home', 'check_in' => '09:00:00', 'check_out' => '18:00:00']);
                    } else if ($emp->id == $employees[2]->id) {
                        Attendance::create(['employee_id' => $emp->id, 'attendance_date' => $dateStr, 'status' => 'absent', 'check_in' => null, 'check_out' => null]);
                    }
                    continue;
                }

                // Standard past days: 90% Present, 5% WFH, 3% Half Day, 2% Absent
                $rand = rand(1, 100);
                if ($rand <= 88) {
                    Attendance::create([
                        'employee_id' => $emp->id,
                        'attendance_date' => $dateStr,
                        'status' => 'present',
                        'check_in' => '09:00:00',
                        'check_out' => '18:00:00',
                    ]);
                } else if ($rand <= 94) {
                    Attendance::create([
                        'employee_id' => $emp->id,
                        'attendance_date' => $dateStr,
                        'status' => 'work_from_home',
                        'check_in' => '09:00:00',
                        'check_out' => '18:00:00',
                    ]);
                } else if ($rand <= 97) {
                    Attendance::create([
                        'employee_id' => $emp->id,
                        'attendance_date' => $dateStr,
                        'status' => 'half_day',
                        'check_in' => '09:00:00',
                        'check_out' => '13:30:00',
                    ]);
                } else {
                    Attendance::create([
                        'employee_id' => $emp->id,
                        'attendance_date' => $dateStr,
                        'status' => 'absent',
                        'check_in' => null,
                        'check_out' => null,
                    ]);
                }
            }
            $date->addDay();
        }

        // 6. Create Attendance Logs for PREVIOUS month to support processed payroll
        $prevMonth = Carbon::now()->subMonth();
        $prevMonthStart = $prevMonth->copy()->startOfMonth();
        $prevMonthEnd = $prevMonth->copy()->endOfMonth();
        $date = $prevMonthStart->copy();
        
        while ($date->lte($prevMonthEnd)) {
            $dateStr = $date->toDateString();
            if ($date->isWeekend()) {
                $date->addDay();
                continue;
            }

            foreach ($employees as $emp) {
                if ($emp->status !== 'active') {
                    continue;
                }
                Attendance::firstOrCreate(
                    [
                        'employee_id' => $emp->id,
                        'attendance_date' => $dateStr,
                    ],
                    [
                        'status' => 'present',
                        'check_in' => '09:00:00',
                        'check_out' => '18:00:00',
                    ]
                );
            }
            $date->addDay();
        }

        // 7. Seed Processed Payroll for Previous Month (e.g. May 2026 if current is June)
        $prevMonthStr = $prevMonth->format('Y-m');
        $prevDaysCount = $prevMonth->daysInMonth;

        foreach ($employees as $emp) {
            if ($emp->status !== 'active') {
                continue;
            }

            $basic = (float) $emp->basic_salary;
            $salaryType = $emp->salary_type;

            if ($salaryType === 'monthly') {
                $net = $basic;
                $totalDays = $prevDaysCount;
                $presentDays = 22.0; // standard working days in a month approx
                $absentDays = 0.0;
                $lopDeduction = 0.0;
            } else {
                $totalDays = $prevDaysCount;
                $presentDays = 22.0;
                $absentDays = 0.0;
                $lopDeduction = 0.0;
                $net = $presentDays * $basic;
            }

            // Add some allowances and OT for variety
            $allowance = $emp->id == $employees[0]->id ? 5000.00 : 2000.00;
            $bonus = $emp->id == $employees[1]->id ? 10000.00 : 0.00;
            $otHours = $emp->id == $employees[0]->id ? 10.0 : 0.0;
            $otRate = round(1.5 * (($basic / $prevDaysCount) / 8), 2);
            $otAmount = round($otHours * $otRate, 2);

            $netTotal = $net + $allowance + $bonus + $otAmount;

            Payroll::create([
                'employee_id' => $emp->id,
                'month' => $prevMonthStr,
                'basic_salary' => $basic,
                'salary_type' => $salaryType,
                'total_days' => $totalDays,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'leave_days' => 0.0,
                'lop_days' => 0.0,
                'wfh_days' => 0.0,
                'half_days' => 0.0,
                'overtime_hours' => $otHours,
                'overtime_rate' => $otRate,
                'overtime_amount' => $otAmount,
                'bonus' => $bonus,
                'allowances' => $allowance,
                'lop_deduction' => $lopDeduction,
                'other_deductions' => 0.0,
                'net_salary' => $netTotal,
                'status' => 'paid',
                'payment_date' => $prevMonth->copy()->endOfMonth()->toDateString(),
                'payment_method' => 'Bank Transfer',
                'notes' => 'Monthly wage payout processed cleanly.',
            ]);
        }
    }
}
