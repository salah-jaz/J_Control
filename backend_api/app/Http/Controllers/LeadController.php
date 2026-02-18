<?php

namespace App\Http\Controllers;

use App\Models\Lead;
use Illuminate\Http\Request;

class LeadController extends Controller
{
    public function index()
    {
        return Lead::with(['followUps', 'callLogs', 'leadNotes' => fn ($q) => $q->latest()->limit(1)])
            ->withCount('leadNotes')
            ->orderBy('created_at', 'desc')
            ->get();
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
