<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Leave;
use App\Models\Payroll;
use App\Models\Department;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class HrmsDashboardController extends Controller
{
    public function stats(Request $request)
    {
        $today = Carbon::today()->toDateString();
        // Read selected month from request query or default to current month
        $selectedMonth = $request->get('month', Carbon::today()->format('Y-m'));

        // 1. Total active Employees
        $totalEmployees = Employee::where('status', 'active')->count();

        // 2. Present Today (Active employees marked 'present' or 'work_from_home' today)
        $presentToday = Attendance::where('attendance_date', $today)
            ->whereIn('status', ['present', 'work_from_home'])
            ->whereHas('employee', function ($q) {
                $q->where('status', 'active');
            })
            ->count();

        // 3. On Leave Today (Active employees currently on approved leave today)
        $onLeaveToday = Leave::where('status', 'approved')
            ->where('start_date', '<=', $today)
            ->where('end_date', '>=', $today)
            ->whereHas('employee', function ($q) {
                $q->where('status', 'active');
            })
            ->count();

        // 4. Absent Today (Active Employees - Present Employees - Employees On Approved Leave)
        $absentToday = max(0, $totalEmployees - $presentToday - $onLeaveToday);

        // If no attendance entered yet, default unentered
        $enteredCount = Attendance::where('attendance_date', $today)
            ->whereHas('employee', function ($q) {
                $q->where('status', 'active');
            })
            ->count();
        $unentered = max(0, $totalEmployees - $enteredCount);

        // 5. Total Payroll (Selected Month) - Processed & Paid
        $monthlyPayrollPaid = Payroll::where('month', $selectedMonth)
            ->where('status', 'paid')
            ->sum('net_salary');

        $monthlyPayrollProcessed = Payroll::where('month', $selectedMonth)
            ->sum('net_salary');

        // Active staff who haven't had payroll processed for selected month
        $processedEmployeeIds = Payroll::where('month', $selectedMonth)->pluck('employee_id')->toArray();
        $pendingPayrollCount = Employee::where('status', 'active')
            ->whereNotIn('id', $processedEmployeeIds)
            ->count();

        // Today's Attendance Rates
        $attendanceRate = $totalEmployees > 0 
            ? round(($presentToday / $totalEmployees) * 100, 1) 
            : 0;

        // Logging for End-To-End Audit
        Log::info("HRMS Dashboard Stats Audit:", [
            'today' => $today,
            'selected_month' => $selectedMonth,
            'total_employees' => $totalEmployees,
            'present_today' => $presentToday,
            'on_leave_today' => $onLeaveToday,
            'absent_today' => $absentToday,
            'monthly_payroll_processed' => $monthlyPayrollProcessed,
            'monthly_payroll_paid' => $monthlyPayrollPaid,
            'attendance_rate' => $attendanceRate,
        ]);

        // Department Breakdown (for Pie Chart)
        $deptBreakdown = Department::withCount(['employees' => function($q) {
            $q->where('status', 'active');
        }])->get()->map(function($dept) {
            return [
                'name' => $dept->name,
                'value' => $dept->employees_count
            ];
        })->filter(function($item) {
            return $item['value'] > 0;
        })->values()->toArray();

        $unassignedCount = Employee::where('status', 'active')->whereNull('department_id')->count();
        if ($unassignedCount > 0) {
            $deptBreakdown[] = [
                'name' => 'Unassigned',
                'value' => $unassignedCount
            ];
        }

        // 6-Month Payroll Trend (for Bar/Area Chart, ending at Selected Month)
        $payrollTrend = [];
        $selectedDate = Carbon::parse($selectedMonth . '-01');
        for ($i = 5; $i >= 0; $i--) {
            $m = $selectedDate->copy()->subMonths($i);
            $mStr = $m->format('Y-m');
            $label = $m->format('M Y');
            
            $sum = Payroll::where('month', $mStr)->sum('net_salary');
            
            $payrollTrend[] = [
                'month' => $label,
                'amount' => (float) round($sum, 2)
            ];
        }



        return response()->json([
            'stats' => [
                'totalEmployees' => $totalEmployees,
                'presentToday' => $presentToday,
                'absentToday' => $absentToday,
                'onLeaveToday' => $onLeaveToday,
                'unentered' => $unentered,
                'monthlyPayrollPaid' => round($monthlyPayrollPaid, 2),
                'monthlyPayrollProcessed' => round($monthlyPayrollProcessed, 2),
                'pendingPayrollCount' => $pendingPayrollCount,
                'attendanceRate' => $attendanceRate,
            ],
            'deptBreakdown' => $deptBreakdown,
            'payrollTrend' => $payrollTrend,
        ]);
    }
}
