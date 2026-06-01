<?php

namespace App\Http\Controllers;

use App\Models\Designation;
use Illuminate\Http\Request;

class DesignationController extends Controller
{
    public function index()
    {
        $designations = Designation::withCount('employees')->orderBy('name', 'asc')->get();
        return response()->json($designations);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:designations,name',
        ]);

        $desg = Designation::create($validated);
        $desg->employees_count = 0;

        return response()->json($desg, 201);
    }

    public function update(Request $request, $id)
    {
        $desg = Designation::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:designations,name,' . $desg->id,
        ]);

        $desg->update($validated);
        $desg->loadCount('employees');

        return response()->json($desg);
    }

    public function destroy($id)
    {
        $desg = Designation::findOrFail($id);
        $desg->delete();
        return response()->noContent();
    }
}
