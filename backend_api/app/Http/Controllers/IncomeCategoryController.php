<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\IncomeCategory;

class IncomeCategoryController extends Controller
{
    /**
     * GET /income-categories - list all categories.
     */
    public function index()
    {
        return IncomeCategory::orderBy('name')->get(['id', 'name']);
    }

    /**
     * POST /income-categories - create a category.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);
        return IncomeCategory::create($validated);
    }

    /**
     * DELETE /income-categories/{id} - delete a category.
     */
    public function destroy($id)
    {
        $category = IncomeCategory::findOrFail($id);
        $category->delete();
        return response()->json(null, 204);
    }
}
