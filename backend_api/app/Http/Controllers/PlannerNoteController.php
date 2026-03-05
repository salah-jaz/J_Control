<?php

namespace App\Http\Controllers;

use App\Models\PlannerNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PlannerNoteController extends Controller
{
    public function index(Request $request)
    {
        $query = PlannerNote::query();

        if ($request->filled('event_id')) {
            $query->where('event_id', $request->input('event_id'));
        }

        if ($request->boolean('only_orphaned')) {
            $query->whereNull('event_id');
        }

        if ($request->filled('categories')) {
            $categories = explode(',', $request->input('categories'));
            $query->whereIn('category', $categories);
        }

        if ($request->filled('priorities')) {
            $priorities = explode(',', $request->input('priorities'));
            $query->whereIn('priority', $priorities);
        }

        $notes = $query->orderByDesc('created_at')->get();

        return response()->json($notes);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'event_id' => 'nullable|exists:planner_events,id',
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'category' => 'nullable|string|in:meeting,payment,deadline,reminder,personal',
            'priority' => 'nullable|string|in:low,medium,high',
        ]);

        $validated['created_by'] = Auth::id();

        $note = PlannerNote::create($validated);

        return response()->json($note, 201);
    }

    public function show(PlannerNote $plannerNote)
    {
        return response()->json($plannerNote);
    }

    public function update(Request $request, PlannerNote $plannerNote)
    {
        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'content' => 'nullable|string',
            'category' => 'nullable|string|in:meeting,payment,deadline,reminder,personal',
            'priority' => 'nullable|string|in:low,medium,high',
        ]);

        $plannerNote->update($validated);

        return response()->json($plannerNote);
    }

    public function destroy(PlannerNote $plannerNote)
    {
        $plannerNote->delete();

        return response()->json(['message' => 'Note deleted']);
    }
}

