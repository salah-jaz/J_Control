<?php

namespace App\Http\Controllers;

use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index()
    {
        $departments = Department::withCount('employees')->orderBy('name', 'asc')->get();
        return response()->json($departments);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name',
        ]);

        $dept = Department::create($validated);
        $dept->employees_count = 0;

        return response()->json($dept, 201);
    }

    public function update(Request $request, $id)
    {
        $dept = Department::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:departments,name,' . $dept->id,
        ]);

        $dept->update($validated);
        $dept->loadCount('employees');

        return response()->json($dept);
    }

    public function destroy($id)
    {
        $dept = Department::findOrFail($id);
        $dept->delete();
        return response()->noContent();
    }
}
