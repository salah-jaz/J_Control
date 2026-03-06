<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    /**
     * List leads with optional filters and pagination.
     * Query params: search, status, priority, assigned_to, page, per_page
     */
    public function index(Request $request)
    {
        $query = Lead::with(['followUps', 'callLogs', 'leadNotes' => fn ($q) => $q->latest()->limit(1)])
            ->withCount('leadNotes')
            ->orderBy('created_at', 'desc');

        if ($request->filled('search')) {
            $term = '%' . $request->input('search') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('first_name', 'like', $term)
                    ->orWhere('last_name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('company', 'like', $term)
                    ->orWhere('phone', 'like', $term);
            });
        }

        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('priority') && $request->input('priority') !== 'all') {
            $query->where('priority', $request->input('priority'));
        }

        if ($request->filled('assigned_to') && $request->input('assigned_to') !== 'all') {
            $query->where('assigned_to', $request->input('assigned_to'));
        }

        if ($request->filled('source') && $request->input('source') !== 'all') {
            $query->where('source', $request->input('source'));
        }

        $perPage = max(1, min(100, (int) $request->input('per_page', 20)));
        return $query->paginate($perPage);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required',
            'last_name' => 'required',
            'email' => 'required|email',
            'status' => 'nullable',
            'source' => 'nullable',
            'priority' => 'nullable',
            'score' => 'nullable|integer',
            'value' => 'nullable|numeric',
            'assigned_to' => 'nullable',
            'qualified' => 'nullable|boolean',
            'notes' => 'nullable',
            'phone' => 'nullable',
            'company' => 'nullable',
            'job_title' => 'nullable',
            'location' => 'nullable',
        ]);

        return Lead::create($validated);
    }

    public function show(Lead $lead)
    {
        return $lead;
    }

    public function update(Request $request, Lead $lead)
    {
        $validated = $request->validate([
             'first_name' => 'required',
            'last_name' => 'required',
            'email' => 'required|email',
            'status' => 'nullable',
            'source' => 'nullable',
            'priority' => 'nullable',
            'score' => 'nullable|integer',
            'value' => 'nullable|numeric',
            'assigned_to' => 'nullable',
            'qualified' => 'nullable|boolean',
            'notes' => 'nullable',
             'phone' => 'nullable',
            'company' => 'nullable',
            'job_title' => 'nullable',
            'location' => 'nullable',
        ]);

        $lead->update($validated);
        return $lead;
    }

    public function destroy(Lead $lead)
    {
        $lead->delete();
        return response()->noContent();
    }
}
