<?php

namespace App\Http\Controllers;

use App\Models\Leave;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\Attendance;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class LeaveController extends Controller
{
    public function index(Request $request)
    {
        $query = Leave::with(['employee.department', 'employee.designation']);

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->employee_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('leave_type')) {
            $query->where('leave_type', $request->leave_type);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'required|exists:employees,id',
            'leave_type' => 'required|in:casual,sick,earned,lop',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'reason' => 'nullable|string',
        ]);

        $start = Carbon::parse($validated['start_date']);
        $end = Carbon::parse($validated['end_date']);
        $days = $start->diffInDays($end) + 1;

        // Verify balance for non-lop leaves
        if ($validated['leave_type'] !== 'lop') {
            $year = $start->year;
            $balance = LeaveBalance::where('employee_id', $validated['employee_id'])
                ->where('year', $year)
                ->first();

            if (!$balance) {
                // Auto create standard balance
                $balance = LeaveBalance::create([
                    'employee_id' => $validated['employee_id'],
                    'year' => $year,
                    'casual_leave' => 12.0,
                    'sick_leave' => 12.0,
                    'earned_leave' => 12.0,
                ]);
            }

            $typeField = $validated['leave_type'] . '_leave';
            $available = (float) $balance->$typeField;

            if ($available < $days) {
                return response()->json([
                    'message' => "Insufficient leave balance. Requested {$days} days of {$validated['leave_type']} leave, but only {$available} days are available. Apply for Loss of Pay (LOP) instead.",
                    'errors' => ['leave_type' => ["Insufficient balance ({$available} left)"]]
                ], 422);
            }
        }

        $leave = Leave::create($validated);

        return response()->json($leave->load('employee'), 201);
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:approved,rejected',
        ]);

        $leave = Leave::findOrFail($id);

        if ($leave->status !== 'pending') {
            return response()->json(['message' => 'Leave request has already been processed.'], 422);
        }

        $start = Carbon::parse($leave->start_date);
        $end = Carbon::parse($leave->end_date);
        $days = $start->diffInDays($end) + 1;

        DB::beginTransaction();
        try {
            if ($request->status === 'approved') {
                // 1. Deduct leave balance if not LOP
                if ($leave->leave_type !== 'lop') {
                    $year = $start->year;
                    $balance = LeaveBalance::where('employee_id', $leave->employee_id)
                        ->where('year', $year)
                        ->first();

                    if ($balance) {
                        $typeField = $leave->leave_type . '_leave';
                        $balance->$typeField = max(0, $balance->$typeField - $days);
                        $balance->save();
                    }
                }

                // 2. Auto register Leave in Attendance logs for each day of the leave
                $current = $start->copy();
                while ($current->lte($end)) {
                    Attendance::updateOrCreate(
                        [
                            'employee_id' => $leave->employee_id,
                            'attendance_date' => $current->toDateString(),
                        ],
                        [
                            'status' => 'leave',
                            'check_in' => null,
                            'check_out' => null,
                        ]
                    );
                    $current->addDay();
                }
            }

            $leave->status = $request->status;
            $leave->save();

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to process leave: ' . $e->getMessage()], 500);
        }

        return response()->json($leave->load('employee'));
    }

    public function balances(Request $request)
    {
        $year = $request->get('year', (int) date('Y'));
        
        $balances = LeaveBalance::with(['employee.department', 'employee.designation'])
            ->where('year', $year)
            ->get();

        return response()->json($balances);
    }

    public function destroy($id)
    {
        $leave = Leave::findOrFail($id);
        if ($leave->status === 'approved') {
            return response()->json(['message' => 'Approved leaves cannot be deleted directly.'], 422);
        }
        $leave->delete();
        return response()->noContent();
    }
}
