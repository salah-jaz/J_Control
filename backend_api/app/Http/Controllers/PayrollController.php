<?php

namespace App\Http\Controllers;

use App\Models\Payroll;
use App\Models\Employee;
use App\Models\Attendance;
use App\Models\Leave;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    public function calculate(Request $request)
    {
        $request->validate([
            'month' => 'required|string', // format: 'YYYY-MM'
        ]);

        $monthStr = $request->month;
        $carbon = Carbon::parse($monthStr . '-01');
        $daysInMonth = $carbon->daysInMonth;
        $startDate = $carbon->startOfMonth()->toDateString();
        $endDate = $carbon->endOfMonth()->toDateString();

        $employees = Employee::where('status', 'active')->get();
        $results = [];

        // Check if payroll already processed for this month
        $isProcessedForMonth = Payroll::where('month', $monthStr)->exists();

        foreach ($employees as $emp) {
            $atts = Attendance::where('employee_id', $emp->id)
                ->whereBetween('attendance_date', [$startDate, $endDate])
                ->get();

            // Count attendance types
            $present = $atts->where('status', 'present')->count();
            $wfh = $atts->where('status', 'work_from_home')->count();
            $halfDay = $atts->where('status', 'half_day')->count();
            $absent = $atts->where('status', 'absent')->count();
            $leaves = $atts->where('status', 'leave')->count();

            // Distinguish paid vs LOP leaves
            // Pull approved LOP leaves for this employee in this month
            $lopLeavesCount = Leave::where('employee_id', $emp->id)
                ->where('leave_type', 'lop')
                ->where('status', 'approved')
                ->where(function ($q) use ($startDate, $endDate) {
                    $q->whereBetween('start_date', [$startDate, $endDate])
                      ->orWhereBetween('end_date', [$startDate, $endDate]);
                })
                ->get()
                ->reduce(function ($carry, $leave) use ($startDate, $endDate) {
                    $lStart = Carbon::parse($leave->start_date);
                    $lEnd = Carbon::parse($leave->end_date);
                    $mStart = Carbon::parse($startDate);
                    $mEnd = Carbon::parse($endDate);
                    
                    // Overlap days
                    $overlapStart = $lStart->max($mStart);
                    $overlapEnd = $lEnd->min($mEnd);
                    
                    return $carry + ($overlapStart->diffInDays($overlapEnd) + 1);
                }, 0);

            // Paid leaves
            $paidLeaves = max(0, $leaves - $lopLeavesCount);

            // Daily Salary vs Monthly Salary logic
            $basic = (float) $emp->basic_salary;
            $salaryType = $emp->salary_type;

            if ($salaryType === 'monthly') {
                $dailyRate = $basic / $daysInMonth;
                
                // Present Days include WFH and Paid Leaves, and 0.5 of Half Days
                $presentDays = $present + $wfh + $paidLeaves + ($halfDay * 0.5);
                $absentDays = $absent;
                $lopDays = $lopLeavesCount + $absent + ($halfDay * 0.5);
                
                $lopDeduction = round($lopDays * $dailyRate, 2);
                $earnedSalary = round($basic - $lopDeduction, 2);
            } else { // daily
                $dailyRate = $basic;
                
                // Earned days for daily wage (WFH counts as present, half day counts as 0.5)
                $presentDays = $present + $wfh + ($halfDay * 0.5);
                $absentDays = $absent;
                $lopDays = $lopLeavesCount + $absent + ($halfDay * 0.5);
                
                $lopDeduction = 0; // daily salary only pays for days worked
                $earnedSalary = round($presentDays * $dailyRate, 2);
            }

            // Overtime defaults
            $overtimeHours = 0.0;
            // Standard hourly rate: 1.5 * (dailyRate / 8)
            $overtimeRate = round(1.5 * ($dailyRate / 8), 2);
            $overtimeAmount = 0.0;

            // Check if payroll already processed for this specific employee
            $existing = Payroll::with('processedBy')->where('employee_id', $emp->id)
                ->where('month', $monthStr)
                ->first();

            $results[] = [
                'employee_id' => $emp->id,
                'employee_name' => $emp->name,
                'employee_code' => $emp->employee_id,
                'department_name' => $emp->department ? $emp->department->name : 'Unassigned',
                'designation_name' => $emp->designation ? $emp->designation->name : 'Unassigned',
                'salary_type' => $salaryType,
                'basic_salary' => $basic,
                'total_days' => $daysInMonth,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'leave_days' => $leaves,
                'lop_days' => $lopDays,
                'wfh_days' => $wfh,
                'half_days' => $halfDay,
                'lop_deduction' => $lopDeduction,
                'overtime_hours' => $existing ? (float) $existing->overtime_hours : $overtimeHours,
                'overtime_rate' => $existing ? (float) $existing->overtime_rate : $overtimeRate,
                'overtime_amount' => $existing ? (float) $existing->overtime_amount : $overtimeAmount,
                'bonus' => $existing ? (float) $existing->bonus : 0.0,
                'allowances' => $existing ? (float) $existing->allowances : 0.0,
                'other_deductions' => $existing ? (float) $existing->other_deductions : 0.0,
                'net_salary' => $existing ? (float) $existing->net_salary : max(0.0, $earnedSalary),
                'status' => $existing ? $existing->status : 'pending',
                'is_processed' => !is_null($existing),
                'payroll_id' => $existing ? $existing->id : null,
                'processed_at' => $existing && $existing->processed_at ? Carbon::parse($existing->processed_at)->toDateTimeString() : null,
                'processed_by_name' => $existing && $existing->processedBy ? $existing->processedBy->name : null,
            ];
        }

        return response()->json([
            'records' => $results,
            'is_locked' => $isProcessedForMonth,
        ]);
    }

    public function process(Request $request)
    {
        $request->validate([
            'month' => 'required|string',
            'records' => 'required|array',
            'records.*.employee_id' => 'required|exists:employees,id',
            'records.*.basic_salary' => 'required|numeric',
            'records.*.salary_type' => 'required|string',
            'records.*.total_days' => 'required|integer',
            'records.*.present_days' => 'required|numeric',
            'records.*.absent_days' => 'required|numeric',
            'records.*.leave_days' => 'required|numeric',
            'records.*.lop_days' => 'required|numeric',
            'records.*.wfh_days' => 'required|numeric',
            'records.*.half_days' => 'required|numeric',
            'records.*.lop_deduction' => 'required|numeric',
            'records.*.overtime_hours' => 'required|numeric',
            'records.*.overtime_rate' => 'required|numeric',
            'records.*.overtime_amount' => 'required|numeric',
            'records.*.bonus' => 'required|numeric',
            'records.*.allowances' => 'required|numeric',
            'records.*.other_deductions' => 'required|numeric',
            'records.*.net_salary' => 'required|numeric',
            'records.*.status' => 'required|in:pending,paid',
            'records.*.payment_method' => 'nullable|string',
            'records.*.notes' => 'nullable|string',
        ]);

        $monthStr = $request->month;
        $processed = [];

        DB::beginTransaction();
        try {
            foreach ($request->records as $rec) {
                $payroll = Payroll::updateOrCreate(
                    [
                        'employee_id' => $rec['employee_id'],
                        'month' => $monthStr,
                    ],
                    [
                        'basic_salary' => $rec['basic_salary'],
                        'salary_type' => $rec['salary_type'],
                        'total_days' => $rec['total_days'],
                        'present_days' => $rec['present_days'],
                        'absent_days' => $rec['absent_days'],
                        'leave_days' => $rec['leave_days'],
                        'lop_days' => $rec['lop_days'],
                        'wfh_days' => $rec['wfh_days'],
                        'half_days' => $rec['half_days'],
                        'lop_deduction' => $rec['lop_deduction'],
                        'overtime_hours' => $rec['overtime_hours'],
                        'overtime_rate' => $rec['overtime_rate'],
                        'overtime_amount' => $rec['overtime_amount'],
                        'bonus' => $rec['bonus'],
                        'allowances' => $rec['allowances'],
                        'other_deductions' => $rec['other_deductions'],
                        'net_salary' => $rec['net_salary'],
                        'status' => $rec['status'],
                        'payment_date' => $rec['status'] === 'paid' ? now()->toDateString() : null,
                        'payment_method' => $rec['status'] === 'paid' ? ($rec['payment_method'] ?? 'Bank Transfer') : null,
                        'notes' => $rec['notes'] ?? null,
                        'processed_at' => now(),
                        'processed_by' => auth()->id() ?? null,
                    ]
                );
                $processed[] = $payroll;
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to process payroll: ' . $e->getMessage()], 500);
        }

        return response()->json([
            'message' => 'Payroll processed successfully',
            'count' => count($processed),
        ]);
    }

    public function reopen(Request $request)
    {
        $request->validate([
            'month' => 'required|string',
        ]);

        Payroll::where('month', $request->month)->delete();

        return response()->json([
            'message' => "Payroll for {$request->month} reopened successfully. Attendance and recalculation are now unlocked."
        ]);
    }

    public function history(Request $request)
    {
        $query = Payroll::with(['employee.department', 'employee.designation', 'processedBy']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('month')) {
            $query->where('month', $request->month);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderBy('month', 'desc')->orderBy('employee_id', 'asc')->get());
    }

    public function destroy($id)
    {
        $payroll = Payroll::findOrFail($id);
        $payroll->delete();
        return response()->noContent();
    }
}
