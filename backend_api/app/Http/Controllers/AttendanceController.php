<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\Payroll;
use Illuminate\Http\Request;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
        ]);

        $date = $request->date;
        $month = substr($date, 0, 7);

        // Fetch all active employees and map their attendance if it exists
        $employees = Employee::where('status', 'active')->orderBy('name', 'asc')->get();
        $attendances = Attendance::where('attendance_date', $date)->get()->keyBy('employee_id');

        $result = $employees->map(function ($emp) use ($attendances) {
            $att = $attendances->get($emp->id);
            return [
                'employee_id' => $emp->id,
                'employee_name' => $emp->name,
                'employee_code' => $emp->employee_id,
                'department_name' => $emp->department ? $emp->department->name : 'Unassigned',
                'designation_name' => $emp->designation ? $emp->designation->name : 'Unassigned',
                'attendance_id' => $att ? $att->id : null,
                'status' => $att ? $att->status : 'present', // default
                'check_in' => $att && $att->check_in ? substr($att->check_in, 0, 5) : '09:00',
                'check_out' => $att && $att->check_out ? substr($att->check_out, 0, 5) : '18:00',
            ];
        });

        // Determine if attendance is locked for this month
        $isLocked = Payroll::where('month', $month)->exists();

        return response()->json([
            'records' => $result,
            'is_locked' => $isLocked,
        ]);
    }

    public function save(Request $request)
    {
        $request->validate([
            'date' => 'required|date',
            'records' => 'required|array',
            'records.*.employee_id' => 'required|exists:employees,id',
            'records.*.status' => 'required|in:present,absent,half_day,leave,work_from_home',
            'records.*.check_in' => 'nullable|string',
            'records.*.check_out' => 'nullable|string',
        ]);

        $date = $request->date;

        // 1. Future Date Check
        $today = Carbon::today()->toDateString();
        if ($date > $today) {
            return response()->json([
                'message' => 'Future attendance entries are not allowed.',
                'errors' => ['date' => ['Future attendance entries are not allowed.']]
            ], 422);
        }

        // 2. Lock check: If payroll for this month is already processed, lock it!
        $month = substr($date, 0, 7);
        $isLocked = Payroll::where('month', $month)->exists();
        if ($isLocked) {
            return response()->json([
                'message' => 'Attendance is locked because payroll has already been processed for this month.',
                'errors' => ['date' => ['Attendance is locked because payroll has already been processed.']]
            ], 422);
        }

        $saved = [];

        foreach ($request->records as $rec) {
            $att = Attendance::updateOrCreate(
                [
                    'employee_id' => $rec['employee_id'],
                    'attendance_date' => $date,
                ],
                [
                    'status' => $rec['status'],
                    'check_in' => $rec['status'] === 'absent' || $rec['status'] === 'leave' ? null : ($rec['check_in'] ?? '09:00'),
                    'check_out' => $rec['status'] === 'absent' || $rec['status'] === 'leave' ? null : ($rec['check_out'] ?? '18:00'),
                ]
            );
            $saved[] = $att;
        }

        return response()->json([
            'message' => 'Attendance saved successfully',
            'count' => count($saved),
        ]);
    }

    public function monthlyReport(Request $request)
    {
        $request->validate([
            'month' => 'required|string', // format: 'YYYY-MM'
        ]);

        $monthStr = $request->month;
        $carbon = Carbon::parse($monthStr . '-01');
        $daysInMonth = $carbon->daysInMonth;
        $startDate = $carbon->startOfMonth()->toDateString();
        $endDate = $carbon->endOfMonth()->toDateString();

        $employees = Employee::where('status', 'active')->orderBy('name', 'asc')->get();
        
        $attendances = Attendance::whereBetween('attendance_date', [$startDate, $endDate])
            ->get()
            ->groupBy('employee_id');

        $result = $employees->map(function ($emp) use ($attendances, $startDate, $endDate, $daysInMonth, $carbon) {
            $empAtts = $attendances->get($emp->id) ?? collect([]);
            $mappedAtts = [];

            for ($day = 1; $day <= $daysInMonth; $day++) {
                $currentDate = $carbon->copy()->day($day)->toDateString();
                $att = $empAtts->firstWhere('attendance_date', $currentDate);
                $mappedAtts[$currentDate] = $att ? $att->status : null; // null represents unentered
            }

            return [
                'employee_id' => $emp->id,
                'employee_name' => $emp->name,
                'employee_code' => $emp->employee_id,
                'attendance' => $mappedAtts,
                'summary' => [
                    'present' => $empAtts->whereIn('status', ['present', 'work_from_home'])->count() + ($empAtts->where('status', 'half_day')->count() * 0.5),
                    'absent' => $empAtts->where('status', 'absent')->count(),
                    'half_day' => $empAtts->where('status', 'half_day')->count(),
                    'leave' => $empAtts->where('status', 'leave')->count(),
                    'wfh' => $empAtts->where('status', 'work_from_home')->count(),
                ]
            ];
        });

        // Determine lock status for this month
        $isLocked = Payroll::where('month', $monthStr)->exists();

        return response()->json([
            'month' => $monthStr,
            'daysInMonth' => $daysInMonth,
            'records' => $result,
            'is_locked' => $isLocked,
        ]);
    }
}
