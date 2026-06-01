<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\LeaveBalance;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 20);
        $perPage = $perPage >= 1 && $perPage <= 100 ? $perPage : 20;

        $query = Employee::with(['department', 'designation']);

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        if ($request->filled('designation_id')) {
            $query->where('designation_id', $request->designation_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('salary_type')) {
            $query->where('salary_type', $request->salary_type);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('employee_id', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('employee_id', 'asc')->paginate($perPage));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'employee_id' => 'nullable|string|max:50|unique:employees,employee_id',
            'name' => 'required|string|max:255',
            'mobile' => 'required|string|max:20',
            'email' => 'required|string|email|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'designation_id' => 'nullable|exists:designations,id',
            'joining_date' => 'required|date',
            'salary_type' => 'required|in:monthly,daily',
            'basic_salary' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_no' => 'nullable|string|max:100',
            'bank_ifsc' => 'nullable|string|max:50',
            'bank_branch' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $employee = Employee::create($validated);

        // Auto create leave balance for current year
        LeaveBalance::create([
            'employee_id' => $employee->id,
            'year' => (int) date('Y'),
            'casual_leave' => 12.0,
            'sick_leave' => 12.0,
            'earned_leave' => 12.0,
        ]);

        return response()->json($employee->load(['department', 'designation']), 201);
    }

    public function show($id)
    {
        $employee = Employee::with(['department', 'designation', 'leaveBalances' => function ($q) {
            $q->where('year', (int) date('Y'));
        }])->findOrFail($id);
        return response()->json($employee);
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);

        $validated = $request->validate([
            'employee_id' => ['required', 'string', 'max:50', Rule::unique('employees')->ignore($employee->id)],
            'name' => 'required|string|max:255',
            'mobile' => 'required|string|max:20',
            'email' => 'required|string|email|max:255',
            'department_id' => 'nullable|exists:departments,id',
            'designation_id' => 'nullable|exists:designations,id',
            'joining_date' => 'required|date',
            'salary_type' => 'required|in:monthly,daily',
            'basic_salary' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_no' => 'nullable|string|max:100',
            'bank_ifsc' => 'nullable|string|max:50',
            'bank_branch' => 'nullable|string|max:255',
            'status' => 'required|in:active,inactive',
        ]);

        $employee->update($validated);

        // Ensure leave balance exists for the current year
        $year = (int) date('Y');
        $hasBalance = LeaveBalance::where('employee_id', $employee->id)->where('year', $year)->exists();
        if (!$hasBalance) {
            LeaveBalance::create([
                'employee_id' => $employee->id,
                'year' => $year,
                'casual_leave' => 12.0,
                'sick_leave' => 12.0,
                'earned_leave' => 12.0,
            ]);
        }

        return response()->json($employee->load(['department', 'designation']));
    }

    public function destroy($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->delete();
        return response()->noContent();
    }
}
